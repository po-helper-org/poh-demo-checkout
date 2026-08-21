import assert from 'node:assert/strict';
import { test } from 'node:test';
import { counters } from '../src/metrics.mjs';

test('начальное состояние — нули', () => {
  const stats = counters.getStats();
  assert.equal(stats.visits, 0);
  assert.equal(stats.successes, 0);
});

test('incVisit инкрементирует visits', () => {
  const before = counters.getStats().visits;
  counters.incVisit();
  const after = counters.getStats().visits;
  assert.equal(after, before + 1);
});

test('incSuccess инкрементирует successes', () => {
  const before = counters.getStats().successes;
  counters.incSuccess();
  const after = counters.getStats().successes;
  assert.equal(after, before + 1);
});

test('getStats возвращает объект с числами', () => {
  counters.incVisit();
  counters.incSuccess();
  const stats = counters.getStats();
  assert.equal(typeof stats.visits, 'number');
  assert.equal(typeof stats.successes, 'number');
});

test('несколько вызовов incVisit накапливаются', () => {
  const before = counters.getStats().visits;
  counters.incVisit();
  counters.incVisit();
  counters.incVisit();
  const after = counters.getStats().visits;
  assert.equal(after, before + 3);
});

test('несколько вызовов incSuccess накапливаются', () => {
  const before = counters.getStats().successes;
  counters.incSuccess();
  counters.incSuccess();
  const after = counters.getStats().successes;
  assert.equal(after, before + 2);
});

test('visits и successes независимы', () => {
  const beforeVisits = counters.getStats().visits;
  const beforeSuccesses = counters.getStats().successes;
  
  counters.incVisit();
  counters.incVisit();
  
  const afterVisits = counters.getStats().visits;
  const afterSuccesses = counters.getStats().successes;
  
  assert.equal(afterVisits, beforeVisits + 2);
  assert.equal(afterSuccesses, beforeSuccesses);
});
