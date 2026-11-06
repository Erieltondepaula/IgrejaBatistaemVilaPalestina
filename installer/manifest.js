import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

export const defaultExclusions = new Set([
  '.git',
  '.vscode',
  'node_modules',
  'Build',
  'uploads',
  'public/avatars',
  'public/logos',
  'backend/log',
  'backend/database/Backup_banco',
  'backend/database/Build-Backup',
  'installer/releases',
  'installer/version-manifest.json',
  'installer/DashboardMembrosSetup.exe',
  'IgrejaBatistaemVilaPalestina',
  'bkp',
  'temp_backup',
  'tmp-update-target'
]);

export function hashFile(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function collectFiles(rootDir, exclusions = defaultExclusions) {
  const files = [];

  function walk(currentPath) {
    for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
      const fullPath = path.join(currentPath, entry.name);
      const relativePath = path.relative(rootDir, fullPath).split(path.sep).join('/');

      if (entry.isDirectory()) {
        if (
          exclusions.has(relativePath)
          || exclusions.has(entry.name)
          || entry.name.toLowerCase().startsWith('bkp')
        ) {
          continue;
        }
        walk(fullPath);
        continue;
      }

      if (entry.isFile()) {
        const fileName = entry.name.toLowerCase();
        if (
          relativePath.startsWith('node_modules/')
          || relativePath.startsWith('.git/')
          || exclusions.has(relativePath)
          || fileName === '.env'
          || fileName.startsWith('.env.')
          || fileName.endsWith('.7z')
          || fileName.endsWith('.tmp')
          || fileName.endsWith('.log')
        ) {
          continue;
        }
        files.push(fullPath);
      }
    }
  }

  walk(rootDir);
  return files.sort();
}

export function buildManifest(rootDir = repoRoot, version = '1.0.0') {
  const files = collectFiles(rootDir).map((filePath) => {
    const relativePath = path.relative(rootDir, filePath).split(path.sep).join('/');

    if (relativePath === 'installer/version-manifest.json') {
      return null;
    }

    const stats = fs.statSync(filePath);
    return {
      path: relativePath,
      sha256: hashFile(filePath),
      size: stats.size,
      modifiedAt: stats.mtime.toISOString()
    };
  }).filter(Boolean);

  return {
    version,
    generatedAt: new Date().toISOString(),
    project: 'Dashboard de Membros',
    files
  };
}

export function readJson(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function ensureManifest(rootDir = repoRoot, version = '1.0.0') {
  const manifestPath = path.join(rootDir, 'installer', 'version-manifest.json');
  const manifest = buildManifest(rootDir, version);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
}

export function computeRelativeChecksum(rootDir, relativePath) {
  const filePath = path.join(rootDir, relativePath.split('/').join(path.sep));
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return hashFile(filePath);
}

export default {
  buildManifest,
  collectFiles,
  computeRelativeChecksum,
  ensureManifest,
  hashFile,
  readJson
};

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }
    const [key, rawValue] = token.split('=');
    if (key === '--help' || key === '-h') {
      args.help = true;
      continue;
    }
    if (key === '--root') {
      args.root = rawValue || argv[index + 1];
      if (argv[index + 1] && !argv[index + 1].startsWith('--')) {
        index += 1;
      }
      continue;
    }
    if (key === '--version') {
      args.version = rawValue || argv[index + 1];
      if (argv[index + 1] && !argv[index + 1].startsWith('--')) {
        index += 1;
      }
      continue;
    }
    if (key === '--write') {
      args.write = true;
      continue;
    }
    args[key.slice(2)] = rawValue || true;
  }
  return args;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Uso: node installer/manifest.js [--root <pasta>] [--version 1.0.0] [--write]');
    process.exit(0);
  }
  const rootDir = path.resolve(args.root || repoRoot);
  const manifest = buildManifest(rootDir, args.version || '1.0.0');
  if (args.write) {
    const manifestPath = path.join(rootDir, 'installer', 'version-manifest.json');
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    console.log(`Manifesto escrito em ${manifestPath}`);
    process.exit(0);
  }
  console.log(JSON.stringify(manifest, null, 2));
}
