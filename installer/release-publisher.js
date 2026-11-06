#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildManifest } from './manifest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const [key, rawValue] = token.split('=');
    if (key === '--help' || key === '-h') {
      args.help = true;
      continue;
    }
    if (key === '--version') {
      args.version = rawValue || argv[index + 1];
      if (argv[index + 1] && !argv[index + 1].startsWith('--')) index += 1;
      continue;
    }
    if (key === '--root') {
      args.root = rawValue || argv[index + 1];
      if (argv[index + 1] && !argv[index + 1].startsWith('--')) index += 1;
      continue;
    }
    if (key === '--output') {
      args.output = rawValue || argv[index + 1];
      if (argv[index + 1] && !argv[index + 1].startsWith('--')) index += 1;
      continue;
    }
    args[key.slice(2)] = rawValue || true;
  }
  return args;
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function prepareReleaseBundle(rootDir, version, outputDir) {
  const manifest = buildManifest(rootDir, version);
  const releaseVersionDir = path.join(outputDir, version);
  const relativeBundle = path.relative(repoRoot, releaseVersionDir).split(path.sep).join('/');

  fs.mkdirSync(releaseVersionDir, { recursive: true });

  const files = manifest.files.map((entry) => ({
    ...entry,
    url: `/${version}/${entry.path}`
  }));

  const payload = {
    version,
    publishedAt: new Date().toISOString(),
    project: 'Dashboard de Membros',
    fileCount: files.length,
    files,
    manifestFile: `/${version}/manifest.json`
  };

  writeJson(path.join(releaseVersionDir, 'manifest.json'), payload);
  writeJson(path.join(outputDir, 'latest.json'), payload);

  const sourceRoot = rootDir;
  for (const entry of manifest.files) {
    const sourceFile = path.join(sourceRoot, entry.path.split('/').join(path.sep));
    const destinationFile = path.join(releaseVersionDir, entry.path.split('/').join(path.sep));
    fs.mkdirSync(path.dirname(destinationFile), { recursive: true });
    fs.copyFileSync(sourceFile, destinationFile);
  }

  return {
    version,
    releaseDir: releaseVersionDir,
    relativeBundle,
    manifest
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Uso: node installer/release-publisher.js --version <1.2.3> [--root <pasta>] [--output <pasta>]');
    return;
  }

  const rootDir = path.resolve(args.root || repoRoot);
  const outputDir = path.resolve(args.output || path.join(rootDir, 'installer', 'releases'));
  const version = args.version || '1.0.0';

  try {
    const result = prepareReleaseBundle(rootDir, version, outputDir);
    console.log(`Versão publicada: ${result.version}`);
    console.log(`Diretório: ${result.releaseDir}`);
    console.log(`Manifesto: ${path.join(outputDir, 'latest.json')}`);
  } catch (error) {
    console.error('Falha ao publicar versão:', error.message);
    process.exitCode = 1;
  }
}

await main();
