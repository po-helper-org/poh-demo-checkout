import assert from 'node:assert/strict';
import { test } from 'node:test';
import { app } from '../src/server.mjs';
import { counters } from '../src/metrics.mjs';

/**
 * Вспомогательная функция для HTTP-запросов к app().
 * Симулирует HTTP-запрос без поднятия реального сервера.
 * 
 * @param {string} url - путь запроса (например, '/quote')
 * @param {string} method - HTTP метод (GET, POST, etc.)
 * @param {object|string|null} body - тело запроса
 * @param {object} customHeaders - дополнительные заголовки запроса (переопределяют дефолтные)
 */
async function request(url, method = 'GET', body = null, customHeaders = {}) {
  const defaultHeaders = body ? { 'content-type': 'application/json' } : {};
  const req = {
    url,
    method,
    headers: { ...defaultHeaders, ...customHeaders },
  };

  const chunks = [];
  const res = {
    statusCode: null,
    headers: {},
    writeHead: function(code, headers) {
      this.statusCode = code;
      this.headers = headers;
    },
    write: function(chunk) {
      if (typeof chunk === 'string') {
        chunks.push(Buffer.from(chunk));
      } else {
        chunks.push(chunk);
      }
    },
    end: function(chunk) {
      if (chunk) {
        if (typeof chunk === 'string') {
          chunks.push(Buffer.from(chunk));
        } else {
          chunks.push(chunk);
        }
      }
    },
  };

  // Если есть тело, имитируем readable stream
  if (body) {
    const bodyStr = JSON.stringify(body);
    req[Symbol.asyncIterator] = async function*() {
      yield Buffer.from(bodyStr);
    };
  } else {
    req[Symbol.asyncIterator] = async function*() {
      // Пустой body
    };
  }

  await app(req, res);

  const responseBody = Buffer.concat(chunks).toString('utf8');
  let parsedBody;
  try {
    parsedBody = JSON.parse(responseBody);
  } catch {
    parsedBody = responseBody;
  }

  return {
    statusCode: res.statusCode,
    headers: res.headers,
    body: parsedBody,
  };
}

test('GET /stats возвращает начальные нули', async () => {
  const res = await request('/stats', 'GET');
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { visits: 0, successes: 0 });
});

test('POST /quote инкрементирует visits', async () => {
  const before = counters.getStats().visits;
  await request('/quote', 'POST', {
    items: [{ sku: 'a', price: 1000, qty: 1 }],
  });
  const after = counters.getStats().visits;
  assert.equal(after, before + 1);
});

test('POST /quote инкрементирует successes при успешном запросе', async () => {
  const before = counters.getStats().successes;
  await request('/quote', 'POST', {
    items: [{ sku: 'a', price: 1000, qty: 1 }],
  });
  const after = counters.getStats().successes;
  assert.equal(after, before + 1);
});

test('GET /healthz не инкрементирует visits', async () => {
  const before = counters.getStats().visits;
  await request('/healthz', 'GET');
  const after = counters.getStats().visits;
  assert.equal(after, before);
});

test('POST /quote с невалидным JSON инкрементирует visits, но не successes', async () => {
  const beforeVisits = counters.getStats().visits;
  const beforeSuccesses = counters.getStats().successes;
  
  await request('/quote', 'POST', '{invalid json}');
  
  const afterVisits = counters.getStats().visits;
  const afterSuccesses = counters.getStats().successes;
  
  assert.equal(afterVisits, beforeVisits + 1);
  assert.equal(afterSuccesses, beforeSuccesses);
});

test('POST /quote с пустым заказом инкрементирует visits, но не successes', async () => {
  const beforeVisits = counters.getStats().visits;
  const beforeSuccesses = counters.getStats().successes;
  
  await request('/quote', 'POST', { items: [] });
  
  const afterVisits = counters.getStats().visits;
  const afterSuccesses = counters.getStats().successes;
  
  assert.equal(afterVisits, beforeVisits + 1);
  assert.equal(afterSuccesses, beforeSuccesses);
});

test('GET /stats после нескольких запросов возвращает корректные значения', async () => {
  const beforeVisits = counters.getStats().visits;
  const beforeSuccesses = counters.getStats().successes;
  
  await request('/quote', 'POST', { items: [{ sku: 'a', price: 1000, qty: 1 }] });
  await request('/quote', 'POST', { items: [{ sku: 'b', price: 2000, qty: 2 }] });
  await request('/healthz', 'GET');
  
  const res = await request('/stats', 'GET');
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.visits, beforeVisits + 2);
  assert.equal(res.body.successes, beforeSuccesses + 2);
});

test('GET /healthz возвращает 200 с данными о состоянии', async () => {
  const res = await request('/healthz', 'GET');
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, 'ok');
  assert.equal(typeof res.body.uptime_sec, 'number');
  assert.ok(Number.isInteger(res.body.uptime_sec));
  assert.ok(res.body.uptime_sec >= 0);
});

test('POST /healthz возвращает 405 с заголовком Allow: GET', async () => {
  const res = await request('/healthz', 'POST');
  assert.equal(res.statusCode, 405);
  assert.equal(res.body.error, 'Method Not Allowed');
  assert.equal(res.headers['Allow'], 'GET');
});

test('PUT /healthz возвращает 405 с заголовком Allow: GET', async () => {
  const res = await request('/healthz', 'PUT');
  assert.equal(res.statusCode, 405);
  assert.equal(res.body.error, 'Method Not Allowed');
  assert.equal(res.headers['Allow'], 'GET');
});

test('DELETE /healthz возвращает 405 с заголовком Allow: GET', async () => {
  const res = await request('/healthz', 'DELETE');
  assert.equal(res.statusCode, 405);
  assert.equal(res.body.error, 'Method Not Allowed');
  assert.equal(res.headers['Allow'], 'GET');
});

test('GET /healthz с query string возвращает 200', async () => {
  const res = await request('/healthz?probe=1', 'GET');
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, 'ok');
  assert.equal(typeof res.body.uptime_sec, 'number');
});

test('GET /stats с query string возвращает 200', async () => {
  const res = await request('/stats?filter=all', 'GET');
  assert.equal(res.statusCode, 200);
  assert.equal(typeof res.body.visits, 'number');
  assert.equal(typeof res.body.successes, 'number');
});

// === Тесты валидации Content-Type ===

test('POST /quote с Content-Type application/json возвращает 200', async () => {
  const res = await request('/quote', 'POST', {
    items: [{ sku: 'a', price: 1000, qty: 1 }],
  });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.goods, 1000);
});

test('POST /quote с Content-Type text/plain возвращает 415', async () => {
  const res = await request('/quote', 'POST', {
    items: [{ sku: 'a', price: 1000, qty: 1 }],
  }, {
    'content-type': 'text/plain'
  });
  assert.equal(res.statusCode, 415);
  assert.equal(res.body.error, 'ожидается Content-Type: application/json');
});

test('POST /quote без Content-Type возвращает 415', async () => {
  const res = await request('/quote', 'POST', {
    items: [{ sku: 'a', price: 1000, qty: 1 }],
  }, {
    'content-type': ''
  });
  assert.equal(res.statusCode, 415);
  assert.equal(res.body.error, 'ожидается Content-Type: application/json');
});

test('POST /quote с Content-Type application/json; charset=utf-8 возвращает 200', async () => {
  const res = await request('/quote', 'POST', {
    items: [{ sku: 'a', price: 1000, qty: 1 }],
  }, {
    'content-type': 'application/json; charset=utf-8'
  });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.goods, 1000);
});

test('POST /quote с Content-Type application/x-www-form-urlencoded возвращает 415', async () => {
  const res = await request('/quote', 'POST', {
    items: [{ sku: 'a', price: 1000, qty: 1 }],
  }, {
    'content-type': 'application/x-www-form-urlencoded'
  });
  assert.equal(res.statusCode, 415);
  assert.equal(res.body.error, 'ожидается Content-Type: application/json');
});

test('POST /quote с query string обрабатывается корректно', async () => {
  const beforeVisits = counters.getStats().visits;
  const beforeSuccesses = counters.getStats().successes;
  
  const res = await request('/quote?test=true', 'POST', {
    items: [{ sku: 'a', price: 1000, qty: 1 }],
  });
  
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.goods, 1000);
  assert.equal(res.body.delivery, 300);
  assert.equal(res.body.total, 1300);
  
  const afterVisits = counters.getStats().visits;
  const afterSuccesses = counters.getStats().successes;
  assert.equal(afterVisits, beforeVisits + 1);
  assert.equal(afterSuccesses, beforeSuccesses + 1);
});
