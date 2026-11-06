const db = require('./config/postgresql');
const DatabaseBackupService = require('./services/DatabaseBackupService');

(async () => {
  try {
    await db.connect();
    const backup = await DatabaseBackupService.createBackup();
    console.log(`Backup criado: ${backup.fileName}`);
    console.log(`Pasta: ${backup.directory}`);
    console.log(`Total de membros: ${backup.totalMembers}`);
  } catch (error) {
    console.error(`Falha ao criar backup: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await db.close();
  }
})();
