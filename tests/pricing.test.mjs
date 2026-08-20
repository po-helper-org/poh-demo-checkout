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
    discount: 0,
    promoStatus: 'none',
    total: 1300,
  });
});

test('крупный заказ едет без платы за доставку', () => {
  assert.deepEqual(quote([{ sku: 'a', price: 3500, qty: 1 }]), {
    goods: 3500,
    delivery: 0,
    discount: 0,
    promoStatus: 'none',
    total: 3500,
  });
});

test('промокод не передан — статус none, скидка 0', () => {
  assert.deepEqual(quote([{ sku: 'a', price: 1000, qty: 1 }]), {
    goods: 1000,
    delivery: DELIVERY_FEE,
    discount: 0,
    promoStatus: 'none',
    total: 1300,
  });
});

test('валидный промокод SALE10 даёт 10% скидки', () => {
  assert.deepEqual(quote([{ sku: 'a', price: 1000, qty: 2 }], 'SALE10'), {
    goods: 2000,
    delivery: 300,
    discount: 200,
    promoStatus: 'applied',
    total: 2100,
  });
});

test('невалидный промокод — статус unknown, скидка 0', () => {
  assert.deepEqual(quote([{ sku: 'a', price: 1000, qty: 1 }], 'INVALID'), {
    goods: 1000,
    delivery: DELIVERY_FEE,
    discount: 0,
    promoStatus: 'unknown',
    total: 1300,
  });
});

test('доставка не скидывается при применении промокода', () => {
  // Товары на 2500, доставка 300. Скидка 10% = 250.
  // Итог: 2500 - 250 + 300 = 2550 (доставка платная, т.к. goods ДО скидки = 2500 < 3000)
  const result = quote([{ sku: 'a', price: 2500, qty: 1 }], 'SALE10');
  assert.equal(result.goods, 2500);
  assert.equal(result.discount, 250);
  assert.equal(result.delivery, 300); // доставка считается по goods ДО скидки
  assert.equal(result.total, 2550);
});
