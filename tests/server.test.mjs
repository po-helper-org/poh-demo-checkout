import assert from 'node:assert/strict';
import { test } from 'node:test';
import { app } from '../src/server.mjs';
import { counters } from '../src/metrics.mjs';

/**
 * Вспомогательная функция для HTTP-запросов к app().
 * Симулирует HTTP-запрос без поднятия реального сервера.
 */
async function request(url, method = 'GET', body = null) {
  const req = {
    url,
    method,
    headers: body ? { 'content-type': 'application/json' } : {},
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
