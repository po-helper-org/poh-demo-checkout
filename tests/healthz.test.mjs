import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { app } from '../src/server.mjs';

test('GET /healthz возвращает статус и время работы', async () => {
  const server = createServer(app);
  const port = 0; // случайный свободный порт

  await new Promise(resolve => server.listen(port, resolve));

  const res = await fetch(`http://localhost:${server.address().port}/healthz`);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'application/json; charset=utf-8');
  assert.equal(body.status, 'ok');
  assert.equal(typeof body.uptime_sec, 'number');
  assert.ok(Number.isInteger(body.uptime_sec));
  assert.ok(body.uptime_sec >= 0);

  server.close();
});
