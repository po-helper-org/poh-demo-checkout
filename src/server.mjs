// HTTP-обёртка вокруг расчёта. Тонкая намеренно: вся арифметика в pricing.mjs
// и проверяется без сети, здесь остаётся только разбор запроса и коды ответов.

import { createServer } from 'node:http';

import { quote } from './pricing.mjs';
import { counters } from './metrics.mjs';

const PORT = Number(process.env.PORT || 8080);

function send(res, code, body, extraHeaders = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    ...extraHeaders
  });
  res.end(payload);
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

  if (pathname === '/healthz') {
    if (req.method !== 'GET') {
      return send(res, 405, { error: 'Method Not Allowed' }, { 'Allow': 'GET' });
    }
    return send(res, 200, {
      status: 'ok',
      uptime_sec: Math.floor(process.uptime())
    });
  }

  if (pathname === '/stats' && req.method === 'GET') {
    return send(res, 200, counters.getStats());
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

  return send(res, 404, { error: 'не найдено' });
};

// Запуск только при прямом вызове: тест импортирует `app` и поднимать порт
// ради этого не должен.
if (import.meta.url === `file://${process.argv[1]}`) {
  createServer(app).listen(PORT, () => {
    console.log(`checkout слушает :${PORT}`);
  });
}
