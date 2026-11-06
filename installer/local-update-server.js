#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const blockedSegments = new Set(['.git', '.vscode', 'node_modules', 'bkp', 'temp_backup', 'backup_banco', 'build-backup']);

function parseArgs(argv) {
  const args = { port: 8081 };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const [key, rawValue] = token.split('=');
    if (key === '--help' || key === '-h') { args.help = true; continue; }
    if (key === '--port') { args.port = Number(rawValue || argv[index + 1]); continue; }
    if (key === '--root') { args.root = rawValue || argv[index + 1]; if (argv[index + 1] && !argv[index + 1].startsWith('--')) index += 1; continue; }
    if (key === '--app-root') { args.appRoot = rawValue || argv[index + 1]; if (argv[index + 1] && !argv[index + 1].startsWith('--')) index += 1; continue; }
    args[key.slice(2)] = rawValue || true;
  }
  return args;
}

function mimeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.html': 'text/html; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.txt': 'text/plain; charset=utf-8'
  };
  return map[ext] || 'application/octet-stream';
}

function isBlockedPath(normalizedPath) {
  return normalizedPath.split('/').some((segment) => {
    const name = segment.toLowerCase();
    return blockedSegments.has(name)
      || name === '.env'
      || name.startsWith('.env.')
      || name.endsWith('.7z')
      || name.endsWith('.log')
      || name.endsWith('.tmp')
      || name === 'dashboardmembrossetup.exe';
  });
}

function resolveFile(rootDir, normalizedPath) {
  if (isBlockedPath(normalizedPath)) return null;

  const resolvedRoot = path.resolve(rootDir);
  const finalPath = path.resolve(resolvedRoot, normalizedPath.split('/').join(path.sep));
  const pathFromRoot = path.relative(resolvedRoot, finalPath);
  if (pathFromRoot.startsWith('..') || path.isAbsolute(pathFromRoot)) return null;

  return fs.existsSync(finalPath) ? finalPath : null;
}

function sendFile(filePath, res) {
  const stats = fs.statSync(filePath);
  if (!stats.isFile()) {
    res.writeHead(404);
    res.end('Arquivo não encontrado');
    return;
  }

  res.writeHead(200, {
    'Content-Type': mimeFor(filePath),
    'Content-Length': stats.size,
    'Cache-Control': 'no-cache'
  });
  createReadStream(filePath).pipe(res);
}

function serveRequest(appRoot, releaseRoot, req, res) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400);
    res.end('URL inválida');
    return;
  }

  const normalized = pathname.replace(/^\/+/, '').replace(/\\/g, '/');
  if (isBlockedPath(normalized) || normalized.split('/').includes('..')) {
    res.writeHead(403);
    res.end('Acesso negado');
    return;
  }

  if (normalized === 'latest.json') {
    const latestManifest = resolveFile(releaseRoot, normalized);
    if (!latestManifest) {
      res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Manifesto de atualização ausente. Gere uma publicação antes de iniciar o servidor.' }));
      return;
    }
    sendFile(latestManifest, res);
    return;
  }

  const releaseFile = resolveFile(releaseRoot, normalized);
  if (releaseFile && normalized.split('/').length > 1) {
    sendFile(releaseFile, res);
    return;
  }

  const appPath = normalized || 'index.html';
  let appFile = resolveFile(appRoot, appPath);
  if (appFile && fs.statSync(appFile).isDirectory()) {
    appFile = resolveFile(appRoot, path.posix.join(appPath, 'index.html'));
  }
  if (appFile) {
    sendFile(appFile, res);
    return;
  }

  const indexFile = resolveFile(appRoot, 'index.html');
  if (indexFile) {
    sendFile(indexFile, res);
    return;
  }

  res.writeHead(404);
  res.end('Arquivo não encontrado');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Uso: node installer/local-update-server.js --root <pasta-releases> --app-root <pasta-dist> --port 8081');
    return;
  }

  const releaseRoot = path.resolve(args.root || path.join(repoRoot, 'installer', 'releases'));
  const appRoot = path.resolve(args.appRoot || path.join(repoRoot, 'dist'));
  if (!fs.existsSync(releaseRoot)) {
    fs.mkdirSync(releaseRoot, { recursive: true });
  }
  if (!fs.existsSync(path.join(appRoot, 'index.html'))) {
    throw new Error(`Build da aplicação não encontrada em ${appRoot}. Execute npm run build antes de iniciar o servidor.`);
  }

  const server = http.createServer((req, res) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400'
      });
      res.end();
      return;
    }

    if (req.method !== 'GET') {
      res.writeHead(405, { Allow: 'GET, OPTIONS' });
      res.end('Método não permitido');
      return;
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    serveRequest(appRoot, releaseRoot, req, res);
  });

  server.listen(args.port, () => {
    console.log(`Aplicação e servidor de atualização ativos em http://127.0.0.1:${args.port}`);
    console.log(`Manifesto: http://127.0.0.1:${args.port}/latest.json`);
    console.log(`Build da aplicação: ${appRoot}`);
    console.log(`Pacotes de atualização: ${releaseRoot}`);
  });
}

await main();
