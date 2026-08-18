// HTTP-обёртка вокруг расчёта. Тонкая намеренно: вся арифметика в pricing.mjs
// и проверяется без сети, здесь остаётся только разбор запроса и коды ответов.

import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { quote } from './pricing.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATIC_DIR = join(__dirname, '../static');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const PORT = Number(process.env.PORT || 8080);

function send(res, code, body) {
  const payload = JSON.stringify(body);
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function sendStatic(res, filePath) {
  try {
    const ext = filePath.split('.').pop().toLowerCase();
    const mimeType = MIME_TYPES[`.${ext}`] || 'application/octet-stream';
    
    const content = readFileSync(filePath);
    res.writeHead(200, {
      'content-type': mimeType,
      'content-length': Buffer.byteLength(content),
    });
    res.end(content);
  } catch (err) {
    send(res, 404, { error: 'файл не найден' });
  }
}

function serveStatic(url) {
  // Remove leading slash and decode URI
  const path = url === '/' ? '/index.html' : url;
  const decodedPath = decodeURIComponent(path);
  const filePath = join(STATIC_DIR, decodedPath);
  
  try {
    // Security check: ensure file is within STATIC_DIR
    const stats = statSync(filePath);
    const realPath = filePath; // Use the resolved path
    
    // Check if the path is within STATIC_DIR by comparing normalized paths
    const normalizedStatic = STATIC_DIR.replace(/\\/g, '/');
    const normalizedFile = realPath.replace(/\\/g, '/');
    
    if (!normalizedFile.startsWith(normalizedStatic)) {
      return null;
    }
    
    // Only serve regular files
    if (!stats.isFile()) {
      return null;
    }
    
    return filePath;
  } catch {
    return null;
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return null;
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export const app = async (req, res) => {
  if (req.url === '/healthz') return send(res, 200, { ok: true });

  if (req.url === '/quote' && req.method === 'POST') {
    let body;
    try {
      body = await readJson(req);
    } catch {
      // Битый JSON — ошибка запроса, а не сервера: 500 здесь увёл бы разбор в
      // логи сервиса вместо ответа клиенту.
      return send(res, 400, { error: 'тело запроса не разобралось как JSON' });
    }
    try {
      return send(res, 200, quote(body?.items));
    } catch (err) {
      return send(res, 400, { error: err.message });
    }
  }

  // Serve static files for GET requests
  if (req.method === 'GET') {
    const staticPath = serveStatic(req.url);
    if (staticPath) {
      return sendStatic(res, staticPath);
    }
  }

  return send(res, 404, { error: 'не найдено' });
};

// Запуск только при прямом вызове: тест импортирует `app` и поднимать порт
// ради этого не должен.
if (import.meta.url === `file://${process.argv[1]}`) {
  createServer(app).listen(PORT, () => {
    console.log(`checkout слушает :${PORT}`);
  });
}
