import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DELIVERY_FEE,
  FREE_DELIVERY_FROM,
  deliveryFee,
  quote,
  subtotal,
} from '../src/pricing.mjs';

test('сумма позиций считается по количеству, а не по числу строк', () => {
  assert.equal(subtotal([{ sku: 'a', price: 500, qty: 3 }]), 1500);
});

test('заказ без позиций — ошибка, а не ноль', () => {
  // Ноль прошёл бы дальше как валидный заказ на 300 рублей доставки.
  assert.throws(() => subtotal([]), /без позиций/);
});

test('отрицательная цена не проходит', () => {
  assert.throws(() => subtotal([{ sku: 'a', price: -1, qty: 1 }]), /цена/);
});

test('дробное количество не проходит', () => {
  assert.throws(() => subtotal([{ sku: 'a', price: 100, qty: 1.5 }]), /количество/);
});

test('доставка платная ниже порога', () => {
  assert.equal(deliveryFee(FREE_DELIVERY_FROM - 1), DELIVERY_FEE);
});

test('на пороге доставка уже бесплатна', () => {
  // «от 3000» в оферте означает включительно.
  assert.equal(deliveryFee(FREE_DELIVERY_FROM), 0);
});

test('итог складывает товары и доставку', () => {
  assert.deepEqual(quote([{ sku: 'a', price: 1000, qty: 1 }]), {
    goods: 1000,
    delivery: DELIVERY_FEE,
    total: 1300,
  });
});

test('крупный заказ едет без платы за доставку', () => {
  assert.deepEqual(quote([{ sku: 'a', price: 3500, qty: 1 }]), {
    goods: 3500,
    delivery: 0,
    total: 3500,
  });
});
