#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { buildManifest, computeRelativeChecksum, readJson } from './manifest.js';

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Falha ao consultar ${url}: ${response.status}`);
  }
  const manifest = await response.json();
  validateManifest(manifest, url);
  return manifest;
}

function resolveManifestTarget(targetDir, relativePath) {
  if (
    typeof relativePath !== 'string'
    || !relativePath
    || relativePath.startsWith('/')
    || relativePath.includes('\\')
    || relativePath.split('/').some((segment) => !segment || segment === '.' || segment === '..')
    || path.win32.isAbsolute(relativePath)
  ) {
    throw new Error(`Caminho inválido no manifesto: ${relativePath}`);
  }

  const targetPath = path.resolve(targetDir, ...relativePath.split('/'));
  const relativeTarget = path.relative(targetDir, targetPath);
  if (relativeTarget.startsWith('..') || path.isAbsolute(relativeTarget)) {
    throw new Error(`Caminho fora da pasta de instalação: ${relativePath}`);
  }
  return targetPath;
}

function validateManifest(manifest, manifestUrl) {
  if (!manifest || typeof manifest.version !== 'string' || !Array.isArray(manifest.files)) {
    throw new Error('O servidor não respondeu um manifesto de atualização válido.');
  }

  const manifestOrigin = new URL(manifestUrl).origin;
  for (const entry of manifest.files) {
    resolveManifestTarget(process.cwd(), entry?.path);
    if (typeof entry.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(entry.sha256)) {
      throw new Error(`Hash inválido no manifesto para ${entry.path}.`);
    }
    if (entry.url) {
      const fileUrl = new URL(entry.url, manifestUrl);
      if (fileUrl.origin !== manifestOrigin) {
        throw new Error(`Origem de download diferente da origem do manifesto: ${entry.path}.`);
      }
    }
  }
}

async function downloadFile(url, targetPath, expectedHash) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Falha ao baixar ${url}: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const actualHash = crypto.createHash('sha256').update(buffer).digest('hex');
  if (actualHash !== expectedHash.toLowerCase()) {
    throw new Error(`O arquivo baixado não corresponde ao hash publicado: ${url}`);
  }
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, buffer);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const protectedPaths = new Set([
  '.env',
  'backend/.env',
  'database',
  'uploads',
  'public/avatars',
  'public/logos',
  'backend/uploads'
]);

function normalizeArg(value) {
  if (typeof value !== 'string') {
    return value;
  }

  return value.replace(/^['"]|['"]$/g, '');
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = normalizeArg(argv[index]);
    if (!token || !token.startsWith('--')) {
      continue;
    }

    const [key, rawValue] = token.split('=');
    if (key === '--help' || key === '-h') {
      args.help = true;
      continue;
    }
    if (key === '--source') {
      args.source = normalizeArg(rawValue || argv[index + 1]);
      if (argv[index + 1] && !argv[index + 1].startsWith('--')) {
        index += 1;
      }
      continue;
    }
    if (key === '--source-url') {
      args.sourceUrl = normalizeArg(rawValue || argv[index + 1]);
      if (argv[index + 1] && !argv[index + 1].startsWith('--')) {
        index += 1;
      }
      continue;
    }
    if (key === '--target') {
      args.target = normalizeArg(rawValue || argv[index + 1]);
      if (argv[index + 1] && !argv[index + 1].startsWith('--')) {
        index += 1;
      }
      continue;
    }
    if (key === '--manifest') {
      args.manifest = normalizeArg(rawValue || argv[index + 1]);
      if (argv[index + 1] && !argv[index + 1].startsWith('--')) {
        index += 1;
      }
      continue;
    }
    if (key === '--dry-run') {
      args.dryRun = true;
      continue;
    }
    args[key.slice(2)] = normalizeArg(rawValue || true);
  }
  return args;
}

function printHelp() {
  console.log(`Dashboard Membros Updater\n\nUso:\n  node installer/updater.js --source <folder> --target <folder> [--manifest <arquivo>] [--dry-run]\n  node installer/updater.js --source-url http://host:8081/latest.json --target <folder> [--dry-run]\n\nDescrição:\n  Compara versão fonte x destino, cria backup antes da troca e preserva dados locais sensíveis.\n`);
}

function isProtected(relativePath) {
  const normalized = relativePath.split(path.sep).join('/');
  return protectedPaths.has(normalized) || normalized.startsWith('public/avatars/') || normalized.startsWith('public/logos/') || normalized.startsWith('backend/uploads/') || normalized.startsWith('backend/database/Build-Backup/') || normalized.startsWith('database/');
}

function collectRelativeFiles(rootDir) {
  const results = [];

  function walk(currentPath) {
    for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
      const fullPath = path.join(currentPath, entry.name);
      const relativePath = path.relative(rootDir, fullPath).split(path.sep).join('/');

      if (entry.isDirectory()) {
        if (['.git', '.vscode', 'node_modules', 'Build', 'Build-Backup', '.dashboard-updater-backup'].includes(entry.name)) {
          continue;
        }
        walk(fullPath);
        continue;
      }

      if (entry.isFile()) {
        if (relativePath === 'installer/version-manifest.json' || relativePath === '.dashboard-updater-report.json') {
          continue;
        }
        results.push(relativePath);
      }
    }
  }

  if (!fs.existsSync(rootDir)) {
    return results;
  }

  walk(rootDir);
  return results.sort();
}

function ensureManifest(manifestPath, sourceDir) {
  if (fs.existsSync(manifestPath)) {
    return readJson(manifestPath, buildManifest(sourceDir, '1.0.0'));
  }
  return buildManifest(sourceDir, '1.0.0');
}

function createBackup(targetDir, filePath, backupBaseDir) {
  const relativePath = path.relative(targetDir, filePath).split(path.sep).join('/');
  const destination = path.join(backupBaseDir, relativePath);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(filePath, destination);
}

function restoreFromBackup(backupDir, targetDir) {
  if (!fs.existsSync(backupDir)) {
    return;
  }

  for (const file of collectRelativeFiles(backupDir)) {
    const sourcePath = path.join(backupDir, file.split('/').join(path.sep));
    const targetPath = path.join(targetDir, file.split('/').join(path.sep));
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  const targetDir = path.resolve(args.target || path.join(process.cwd(), 'dashboard-membros-atualizado'));

  try {
    let sourceManifest;
    let sourceDir = null;
    let manifestPath = null;

    if (args.sourceUrl) {
      const remoteManifest = await fetchJson(args.sourceUrl);
      sourceManifest = remoteManifest;
      sourceDir = path.resolve(process.cwd());
      manifestPath = args.sourceUrl;
    } else {
      sourceDir = path.resolve(args.source || repoRoot);
      manifestPath = path.resolve(args.manifest || path.join(sourceDir, 'installer', 'version-manifest.json'));
      if (!fs.existsSync(sourceDir)) {
        throw new Error(`Diretório de origem não encontrado: ${sourceDir}`);
      }
      sourceManifest = ensureManifest(manifestPath, sourceDir);
    }

    const currentFiles = collectRelativeFiles(targetDir);
    const sourceIndex = new Map(sourceManifest.files.map((entry) => [entry.path, entry]));
    const targetIndex = new Map(currentFiles.map((relativePath) => [relativePath, computeRelativeChecksum(targetDir, relativePath)]));

    const updates = [];

    for (const [relativePath, sourceEntry] of sourceIndex.entries()) {
      if (isProtected(relativePath)) continue;
      const targetHash = targetIndex.get(relativePath);
      if (!targetHash || targetHash !== sourceEntry.sha256) {
        const targetPath = resolveManifestTarget(targetDir, relativePath);
        const sourceFile = args.sourceUrl
          ? new URL(sourceEntry.url || relativePath, args.sourceUrl.replace(/latest\.json$/, '')).href
          : path.join(sourceDir, relativePath.split('/').join(path.sep));
        updates.push({
          type: 'update',
          path: relativePath,
          source: sourceFile,
          target: targetPath,
          sha256: sourceEntry.sha256
        });
      }
    }

    for (const relativePath of currentFiles) {
      if (!sourceIndex.has(relativePath) && !isProtected(relativePath)) {
        updates.push({ type: 'remove', path: relativePath, target: path.join(targetDir, relativePath.split('/').join(path.sep)) });
      }
    }

    if (updates.length === 0) {
      console.log('Nenhuma atualização pendente. O sistema já está na versão mais recente.');
      return;
    }

    const backupDir = path.join(targetDir, '.dashboard-updater-backup', new Date().toISOString().replace(/[:.]/g, '-'));
    fs.mkdirSync(backupDir, { recursive: true });

    const backupSummary = { timestamp: new Date().toISOString(), updates: [] };

    try {
      for (const update of updates) {
        if (update.type === 'update') {
          const targetPath = update.target;
          if (fs.existsSync(targetPath)) createBackup(targetDir, targetPath, backupDir);
          fs.mkdirSync(path.dirname(targetPath), { recursive: true });

          if (args.sourceUrl) {
            await downloadFile(update.source, targetPath, update.sha256);
          } else {
            fs.copyFileSync(update.source, targetPath);
          }

          backupSummary.updates.push({ action: 'updated', path: update.path });
        } else if (update.type === 'remove') {
          if (fs.existsSync(update.target)) {
            createBackup(targetDir, update.target, backupDir);
            fs.rmSync(update.target, { force: true });
          }
          backupSummary.updates.push({ action: 'removed', path: update.path });
        }
      }

      const reportPath = path.join(targetDir, '.dashboard-updater-report.json');
      fs.writeFileSync(reportPath, JSON.stringify({
        generatedAt: new Date().toISOString(),
        version: sourceManifest.version,
        appliedUpdates: backupSummary.updates.length,
        updates: backupSummary.updates
      }, null, 2));

      console.log(`Atualização concluída. ${backupSummary.updates.length} itens processados.`);
      console.log(`Backup interno: ${backupDir}`);
    } catch (error) {
      console.error('Erro durante a atualização. Restaurando backup anterior...');
      restoreFromBackup(backupDir, targetDir);
      throw error;
    }
  } catch (error) {
    console.error('Falha no atualizador:', error.message);
    process.exitCode = 1;
  }
}

await main();
