// HTTP-обёртка вокруг расчёта. Тонкая намеренно: вся арифметика в pricing.mjs
// и проверяется без сети, здесь остаётся только разбор запроса и коды ответов.

import { createServer } from 'node:http';
import { readFileSync, statSync, realpathSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { quote } from './pricing.mjs';
import { counters } from './metrics.mjs';

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

function send(res, code, body, extraHeaders = {}, omitBody = false) {
  const payload = JSON.stringify(body);
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    ...extraHeaders
  });
  // HEAD отвечает теми же заголовками, что и GET, но без тела
  // (RFC 9110 §9.3.2): content-length остаётся длиной полного ответа —
  // по нему мониторинг и сравнивает живой сервис.
  res.end(omitBody ? undefined : payload);
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
    // Security: resolve the canonical path first before any file system operations
    const realPath = realpathSync(filePath);
    
    // Security check: ensure the resolved path is within STATIC_DIR
    const normalizedStatic = STATIC_DIR.replace(/\\/g, '/');
    const normalizedFile = realPath.replace(/\\/g, '/');
    
    if (!normalizedFile.startsWith(normalizedStatic)) {
      return null;
    }
    
    // Check if the path points to a regular file (after security validation)
    const stats = statSync(realPath);
    if (!stats.isFile()) {
      return null;
    }
    
    return realPath;
  } catch {
    return null;
  }
}

async function readJson(req, maxSize = 64 * 1024) {
  const chunks = [];
  let totalSize = 0;
  
  for await (const chunk of req) {
    totalSize += chunk.length;
    if (totalSize > maxSize) {
      const error = new Error(`Payload too large: ${totalSize} bytes exceeds limit of ${maxSize} bytes`);
      error.code = 'ERR_HTTP_PAYLOAD_TOO_LARGE';
      throw error;
    }
    chunks.push(chunk);
  }
  
  if (chunks.length === 0) return null;
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export const app = async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;

  // HEAD — это GET без тела: так живость проверяют балансировщики и мониторинг.
  const omitBody = req.method === 'HEAD';

  if (pathname === '/healthz') {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return send(res, 405, { error: 'Method Not Allowed' }, { 'Allow': 'GET, HEAD' });
    }
    return send(res, 200, {
      status: 'ok',
      uptime_sec: Math.floor(process.uptime())
    }, {}, omitBody);
  }

  if (pathname === '/stats') {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return send(res, 405, { error: 'Method Not Allowed' }, { 'Allow': 'GET, HEAD' });
    }
    return send(res, 200, counters.getStats(), {}, omitBody);
  }

  // Не POST на /quote — 405 с Allow, как у /healthz и /stats: без guard-а
  // запрос проваливается в раздачу статики и отвечает 404 про файл.
  if (pathname === '/quote' && req.method !== 'POST') {
    return send(res, 405, { error: 'Method Not Allowed' }, { 'Allow': 'POST' });
  }

  if (pathname === '/quote' && req.method === 'POST') {
    counters.incVisit();
    
    // Проверка Content-Type до попытки парсинга JSON
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.startsWith('application/json')) {
      return send(res, 415, { error: 'ожидается Content-Type: application/json' });
    }
    
    let body;
    try {
      body = await readJson(req);
    } catch (err) {
      if (err.code === 'ERR_HTTP_PAYLOAD_TOO_LARGE') {
        return send(res, 413, { error: err.message });
      }
      // Битый JSON — ошибка запроса, а не сервера: 500 здесь увёл бы разбор в
      // логи сервиса вместо ответа клиенту.
      return send(res, 400, { error: 'тело запроса не разобралось как JSON' });
    }
    try {
      // Поддержка обоих параметров для обратной совместимости
      const promoCode = body?.promoCode ?? body?.promo;
      const result = quote(
        body?.items,
        promoCode,
        body?.paymentMethod,
        body?.invoiceSeq
      );
      counters.incSuccess();
      return send(res, 200, result);
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
