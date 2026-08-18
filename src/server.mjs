// HTTP-обёртка вокруг расчёта. Тонкая намеренно: вся арифметика в pricing.mjs
// и проверяется без сети, здесь остаётся только разбор запроса и коды ответов.

import { createServer } from 'node:http';

import { quote } from './pricing.mjs';

const PORT = Number(process.env.PORT || 8080);

function send(res, code, body) {
  const payload = JSON.stringify(body);
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
  });
  res.end(payload);
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
      return send(res, 200, quote(body?.items, body?.promo));
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
