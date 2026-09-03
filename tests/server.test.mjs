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
    let bodyStr;
    if (typeof body === 'string') {
      bodyStr = body;
    } else {
      bodyStr = JSON.stringify(body);
    }
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

test('POST /healthz возвращает 405 с заголовком Allow: GET, HEAD', async () => {
  const res = await request('/healthz', 'POST');
  assert.equal(res.statusCode, 405);
  assert.equal(res.body.error, 'Method Not Allowed');
  assert.equal(res.headers['Allow'], 'GET, HEAD');
});

test('PUT /healthz возвращает 405 с заголовком Allow: GET, HEAD', async () => {
  const res = await request('/healthz', 'PUT');
  assert.equal(res.statusCode, 405);
  assert.equal(res.body.error, 'Method Not Allowed');
  assert.equal(res.headers['Allow'], 'GET, HEAD');
});

test('DELETE /healthz возвращает 405 с заголовком Allow: GET, HEAD', async () => {
  const res = await request('/healthz', 'DELETE');
  assert.equal(res.statusCode, 405);
  assert.equal(res.body.error, 'Method Not Allowed');
  assert.equal(res.headers['Allow'], 'GET, HEAD');
});

test('HEAD /healthz возвращает 200 с заголовками GET и пустым телом', async () => {
  // Патчим uptime, чтобы content-length был предсказуем: HEAD обязан нести
  // content-length ровно того тела, которое отдал бы GET, а без патча целая
  // секунда может переключиться между запросами и тест станет плавающим.
  const realUptime = process.uptime;
  process.uptime = () => 7;
  try {
    const get = await request('/healthz', 'GET');
    const head = await request('/healthz', 'HEAD');

    assert.deepEqual(get.body, { status: 'ok', uptime_sec: 7 });
    assert.equal(head.statusCode, 200);
    assert.equal(head.body, ''); // тело пустое — в этом смысл HEAD
    assert.equal(head.headers['content-type'], 'application/json; charset=utf-8');
    // content-length как у GET, хотя самого тела нет
    assert.equal(
      head.headers['content-length'],
      Buffer.byteLength(JSON.stringify(get.body))
    );
  } finally {
    process.uptime = realUptime;
  }
});

test('HEAD /stats остаётся 405: HEAD разрешён только на /healthz', async () => {
  const res = await request('/stats', 'HEAD');
  assert.equal(res.statusCode, 405);
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

test('POST /stats возвращает 405 с заголовком Allow: GET', async () => {
  const res = await request('/stats', 'POST');
  assert.equal(res.statusCode, 405);
  assert.equal(res.body.error, 'Method Not Allowed');
  assert.equal(res.headers['Allow'], 'GET');
});

test('PUT /stats возвращает 405 с заголовком Allow: GET', async () => {
  const res = await request('/stats', 'PUT');
  assert.equal(res.statusCode, 405);
  assert.equal(res.body.error, 'Method Not Allowed');
  assert.equal(res.headers['Allow'], 'GET');
});

test('DELETE /stats возвращает 405 с заголовком Allow: GET', async () => {
  const res = await request('/stats', 'DELETE');
  assert.equal(res.statusCode, 405);
  assert.equal(res.body.error, 'Method Not Allowed');
  assert.equal(res.headers['Allow'], 'GET');
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

test('POST /quote с телом больше 64 КБ возвращает 413', async () => {
  const beforeVisits = counters.getStats().visits;
  const beforeSuccesses = counters.getStats().successes;
  
  // Создаем тело больше 64 КБ (65 КБ)
  const largeData = { items: [{ sku: 'a', price: 1000, qty: 1 }] };
  largeData.largeString = 'x'.repeat(65 * 1024);
  
  const res = await request('/quote', 'POST', largeData);
  
  assert.equal(res.statusCode, 413);
  assert.ok(res.body.error);
  assert.ok(res.body.error.includes('exceeds limit'));
  
  const afterVisits = counters.getStats().visits;
  const afterSuccesses = counters.getStats().successes;
  assert.equal(afterVisits, beforeVisits + 1);
  assert.equal(afterSuccesses, beforeSuccesses);
});

test('POST /quote с телом меньше 64 КБ обрабатывается корректно', async () => {
  const beforeVisits = counters.getStats().visits;
  const beforeSuccesses = counters.getStats().successes;
  
  // Создаем тело меньше 64 КБ (63 КБ)
  const normalData = { items: [{ sku: 'a', price: 1000, qty: 1 }] };
  normalData.normalString = 'x'.repeat(63 * 1024);
  
  const res = await request('/quote', 'POST', normalData);
  
  assert.equal(res.statusCode, 200);
  assert.ok(res.body.goods);
  assert.ok(res.body.total);
  
  const afterVisits = counters.getStats().visits;
  const afterSuccesses = counters.getStats().successes;
  assert.equal(afterVisits, beforeVisits + 1);
  assert.equal(afterSuccesses, beforeSuccesses + 1);
});

// === Метод, отличный от POST, на /quote ===

test('GET /quote возвращает 405 с заголовком Allow: POST', async () => {
  const res = await request('/quote', 'GET');
  assert.equal(res.statusCode, 405);
  assert.equal(res.body.error, 'Method Not Allowed');
  assert.equal(res.headers['Allow'], 'POST');
});

test('PUT /quote возвращает 405 с заголовком Allow: POST', async () => {
  const res = await request('/quote', 'PUT');
  assert.equal(res.statusCode, 405);
  assert.equal(res.body.error, 'Method Not Allowed');
  assert.equal(res.headers['Allow'], 'POST');
});

test('DELETE /quote возвращает 405 с заголовком Allow: POST', async () => {
  const res = await request('/quote', 'DELETE');
  assert.equal(res.statusCode, 405);
  assert.equal(res.body.error, 'Method Not Allowed');
  assert.equal(res.headers['Allow'], 'POST');
});

test('GET /quote не инкрементирует visits', async () => {
  const before = counters.getStats().visits;
  await request('/quote', 'GET');
  const after = counters.getStats().visits;
  assert.equal(after, before);
});

test('POST /quote продолжает работать как раньше', async () => {
  const res = await request('/quote', 'POST', {
    items: [{ sku: 'a', price: 1000, qty: 1 }],
  });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.goods, 1000);
  assert.equal(res.body.delivery, 300);
  assert.equal(res.body.total, 1300);
});
