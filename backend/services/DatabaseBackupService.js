const fs = require('fs');
const os = require('os');
const path = require('path');
const db = require('../config/postgresql');

const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
const MAX_BACKUPS = 10;

class DatabaseBackupService {
  constructor() {
    this.interval = null;
    this.isRunning = false;
    this.status = {
      lastAttemptAt: null,
      lastAttemptSucceeded: null,
      lastSuccessfulAt: null,
      fileName: null,
      directory: null,
      totalMembers: null,
      lastError: null
    };
  }

  getBackupDirectory() {
    const configuredDirectory = process.env.DASHBOARD_BACKUP_DIR?.trim();
    if (configuredDirectory) {
      if (!path.isAbsolute(configuredDirectory)) {
        throw new Error('DASHBOARD_BACKUP_DIR deve ser um caminho absoluto.');
      }
      return configuredDirectory;
    }

    const applicationDirectory = path.join(__dirname, '..', 'database', 'Backup_banco');
    try {
      fs.mkdirSync(applicationDirectory, { recursive: true });
      fs.accessSync(applicationDirectory, fs.constants.W_OK);
      return applicationDirectory;
    } catch (error) {
      if (!['EACCES', 'EPERM', 'EROFS'].includes(error.code)) throw error;

      const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
      const userBackupDirectory = path.join(localAppData, 'DashboardMembros', 'backups');
      fs.mkdirSync(userBackupDirectory, { recursive: true });
      fs.accessSync(userBackupDirectory, fs.constants.W_OK);
      return userBackupDirectory;
    }
  }

  async createBackup() {
    if (this.isRunning) {
      throw new Error('Já existe um backup do banco em andamento.');
    }

    this.isRunning = true;
    const attemptedAt = new Date();
    this.status = {
      ...this.status,
      lastAttemptAt: attemptedAt.toISOString(),
      lastAttemptSucceeded: null,
      lastError: null
    };

    let temporaryPath;
    try {
      const backupDirectory = this.getBackupDirectory();
      this.status.directory = backupDirectory;
      const members = await db.query('SELECT * FROM membros ORDER BY created_at');

      const timestamp = attemptedAt.toISOString().replace(/[:.]/g, '-').replace('T', '-').replace('Z', '');
      const fileName = `backup-${timestamp}.json`;
      const backupPath = path.join(backupDirectory, fileName);
      temporaryPath = `${backupPath}.${process.pid}.tmp`;
      const backup = {
        timestamp: attemptedAt.toISOString(),
        total_membros: members.length,
        membros: members,
        metadata: {
          version: '2.0',
          database: 'PostgreSQL',
          server: 'Dashboard Membros IBVP'
        }
      };

      fs.writeFileSync(temporaryPath, JSON.stringify(backup), { encoding: 'utf8', flag: 'wx' });
      const savedBackup = JSON.parse(fs.readFileSync(temporaryPath, 'utf8'));
      if (!Array.isArray(savedBackup.membros) || savedBackup.membros.length !== savedBackup.total_membros) {
        throw new Error('A validação do arquivo de backup falhou.');
      }

      fs.renameSync(temporaryPath, backupPath);
      temporaryPath = null;
      this.pruneOldBackups(backupDirectory);

      this.status = {
        lastAttemptAt: attemptedAt.toISOString(),
        lastAttemptSucceeded: true,
        lastSuccessfulAt: attemptedAt.toISOString(),
        fileName,
        directory: backupDirectory,
        totalMembers: members.length,
        lastError: null
      };

      return { fileName, directory: backupDirectory, timestamp: attemptedAt.toISOString(), totalMembers: members.length };
    } catch (error) {
      if (temporaryPath && fs.existsSync(temporaryPath)) {
        fs.unlinkSync(temporaryPath);
      }
      this.status = {
        ...this.status,
        lastAttemptSucceeded: false,
        lastError: error.message
      };
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  pruneOldBackups(backupDirectory) {
    const backups = fs.readdirSync(backupDirectory)
      .filter((name) => /^backup-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}(?:-\d{3})?\.json$/.test(name))
      .map((name) => {
        const filePath = path.join(backupDirectory, name);
        return { filePath, modifiedAt: fs.statSync(filePath).mtimeMs };
      })
      .sort((left, right) => right.modifiedAt - left.modifiedAt);

    for (const backup of backups.slice(MAX_BACKUPS)) {
      fs.unlinkSync(backup.filePath);
    }
  }

  start() {
    if (this.interval) return;

    this.interval = setInterval(() => {
      this.createBackup().catch((error) => {
        console.error(`Falha no backup automático diário: ${error.message}`);
      });
    }, BACKUP_INTERVAL_MS);
    this.interval.unref();
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  getStatus() {
    return { ...this.status, isRunning: this.isRunning };
  }
}

module.exports = new DatabaseBackupService();
