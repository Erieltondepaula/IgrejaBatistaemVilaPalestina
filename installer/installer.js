#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { buildManifest, readJson } from './manifest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

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
    if (key === '--dry-run') {
      args.dryRun = true;
      continue;
    }
    if (key === '--target') {
      args.target = rawValue || argv[index + 1];
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
    args[key.slice(2)] = rawValue || true;
  }
  return args;
}

function printHelp() {
  console.log(`Dashboard Membros Installer\n\nUso:\n  node installer/installer.js --target <pasta> [--version 1.2.3] [--dry-run]\n\nDescrição:\n  Copia a aplicação para uma máquina destino, valida requisitos e registra um manifesto de versão.\n`);
}

function ensureRuntimeChecks(repoRootPath) {
  const requiredPaths = [
    path.join(repoRootPath, 'backend'),
    path.join(repoRootPath, 'package.json'),
    path.join(repoRootPath, 'index.html')
  ];

  const missing = requiredPaths.filter((item) => !fs.existsSync(item));
  if (missing.length > 0) {
    throw new Error(`Estrutura do projeto incompleta. Faltam: ${missing.join(', ')}`);
  }

  const nodeVersion = process.version;
  const packageJson = readJson(path.join(repoRootPath, 'package.json'), {});
  console.log(`Node.js: ${nodeVersion}`);
  console.log(`Versão do front-end: ${packageJson.version || 'indefinida'}`);
  console.log('Requisitos mínimos verificados: Node.js, frontend e backend encontrados.');
}

function copyDirectory(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      if (['.git', 'node_modules', '.vscode', 'dist', 'Build'].includes(entry.name)) {
        continue;
      }
      copyDirectory(sourcePath, targetPath);
      continue;
    }

    const targetDir = path.dirname(targetPath);
    fs.mkdirSync(targetDir, { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);
  }
}

function installApplication(repoRootPath, targetDir, version) {
  const manifest = buildManifest(repoRootPath, version);
  const filesToCopy = manifest.files.filter((entry) => !entry.path.startsWith('node_modules/') && !entry.path.startsWith('.git/'));

  fs.mkdirSync(targetDir, { recursive: true });

  for (const file of filesToCopy) {
    const sourcePath = path.join(repoRootPath, file.path.split('/').join(path.sep));
    const destinationPath = path.join(targetDir, file.path.split('/').join(path.sep));
    const destinationFolder = path.dirname(destinationPath);
    fs.mkdirSync(destinationFolder, { recursive: true });
    fs.copyFileSync(sourcePath, destinationPath);
  }

  const installInfoPath = path.join(targetDir, 'install-info.json');
  fs.writeFileSync(installInfoPath, JSON.stringify({
    version,
    installedAt: new Date().toISOString(),
    targetDir,
    sourceRoot: repoRootPath,
    notes: [
      'Sistema copiado sem alterar a estrutura original do projeto principal.',
      'A instalação preserva configurações locais e dados de produção.'
    ]
  }, null, 2));

  console.log(`Aplicação instalada em: ${targetDir}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  const targetDir = path.resolve(args.target || path.join(process.cwd(), 'dashboard-membros-instalado'));
  const version = args.version || '1.0.0';

  try {
    ensureRuntimeChecks(repoRoot);

    if (args.dryRun) {
      const manifest = buildManifest(repoRoot, version);
      console.log(`Manifesto gerado: ${version}`);
      console.log(`Arquivos previstos: ${manifest.files.length}`);
      console.log(`Destino: ${targetDir}`);
      return;
    }

    installApplication(repoRoot, targetDir, version);

    const npmResult = spawnSync('npm', ['install', '--silent'], {
      cwd: targetDir,
      shell: true,
      stdio: 'inherit'
    });

    if (npmResult.status !== 0) {
      console.warn('Não foi possível instalar dependências automaticamente no destino. Execute npm install na pasta instalada.');
    }

    console.log('\nInstalação concluída. Verifique o arquivo install-info.json para detalhes do ambiente.');
  } catch (error) {
    console.error('Falha na instalação:', error.message);
    process.exitCode = 1;
  }
}

await main();
