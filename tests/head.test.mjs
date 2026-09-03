import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { app } from '../src/server.mjs';

// Сценарий приёмки Issue #171 снимается curl-ом с живого сервера. Здесь тот
// же прогон через реальный сокет: mock-обёртка server.test.mjs не видит,
// как HEAD выглядит на настоящем HTTP.
async function withServer(run) {
  const server = createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const base = `http://localhost:${server.address().port}`;
  try {
    await run(base);
  } finally {
    server.close();
  }
}

test('HEAD /healthz отвечает 200, заголовками GET и пустым телом', async () => {
  await withServer(async base => {
    const getRes = await fetch(`${base}/healthz`);
    await getRes.text();

    const headRes = await fetch(`${base}/healthz`, { method: 'HEAD' });
    const body = await headRes.text();

    assert.equal(headRes.status, 200);
    assert.equal(headRes.headers.get('content-type'), getRes.headers.get('content-type'));
    assert.ok(Number(headRes.headers.get('content-length')) > 0);
    assert.equal(body, '');
  });
});

test('HEAD /stats отвечает 200, тем же content-length, что GET, и пустым телом', async () => {
  await withServer(async base => {
    const getRes = await fetch(`${base}/stats`);
    await getRes.text();

    const headRes = await fetch(`${base}/stats`, { method: 'HEAD' });
    const body = await headRes.text();

    assert.equal(headRes.status, 200);
    assert.equal(headRes.headers.get('content-type'), getRes.headers.get('content-type'));
    assert.equal(headRes.headers.get('content-length'), getRes.headers.get('content-length'));
    assert.equal(body, '');
  });
});
