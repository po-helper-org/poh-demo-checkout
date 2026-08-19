import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DELIVERY_FEE,
  FREE_DELIVERY_FROM,
  PACKAGING_FEE,
  PACKAGES_CAPACITY,
  countPackages,
  deliveryFee,
  packagingFee,
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
  const result = quote([{ sku: 'a', price: 1000, qty: 1 }]);
  assert.equal(result.goods, 1000);
  assert.equal(result.packages, 1);
  assert.equal(result.delivery, DELIVERY_FEE + PACKAGING_FEE);
  assert.equal(result.total, 1000 + DELIVERY_FEE + PACKAGING_FEE);
});

test('крупный заказ едет без платы за доставку, но платит упаковку', () => {
  const result = quote([{ sku: 'a', price: 3500, qty: 1 }]);
  assert.equal(result.goods, 3500);
  assert.equal(result.packages, 1);
  assert.equal(result.delivery, PACKAGING_FEE);
  assert.equal(result.total, 3500 + PACKAGING_FEE);
});

test('плата за упаковку по числу посылок', () => {
  const result = quote([{ sku: 'a', price: 100, qty: 6 }]);
  assert.equal(result.goods, 600);
  assert.equal(result.packages, 2);
  assert.equal(result.delivery, 400); // 300 (база) + 100 (упаковка)
  assert.equal(result.total, 1000);
});

test('бесплатная доставка, упаковка платится', () => {
  const result = quote([{ sku: 'a', price: 5000, qty: 1 }]);
  assert.equal(result.goods, 5000);
  assert.equal(result.packages, 1);
  assert.equal(result.delivery, 50); // 0 (база) + 50 (упаковка)
  assert.equal(result.total, 5050);
});

test('ровно 5 единиц — одна посылка', () => {
  const result = quote([{ sku: 'a', price: 100, qty: 5 }]);
  assert.equal(result.packages, 1);
  assert.equal(result.delivery, 350); // 300 + 50
});

test('6 единиц — две посылки', () => {
  const result = quote([{ sku: 'a', price: 100, qty: 6 }]);
  assert.equal(result.packages, 2);
  assert.equal(result.delivery, 400); // 300 + 100
});

test('несколько позиций — посылки считаются по сумме qty', () => {
  const result = quote([
    { sku: 'a', price: 100, qty: 3 },
    { sku: 'b', price: 200, qty: 4 },
  ]);
  assert.equal(result.goods, 1100); // 300 + 800
  assert.equal(result.packages, 2); // ceil(7 / 5) = 2
  assert.equal(result.delivery, 400); // 300 + 100
});

test('countPackages считает посылки по сумме qty', () => {
  assert.equal(countPackages([{ qty: 1 }]), 1);
  assert.equal(countPackages([{ qty: 5 }]), 1);
  assert.equal(countPackages([{ qty: 6 }]), 2);
  assert.equal(countPackages([{ qty: 3 }, { qty: 4 }]), 2); // 7 единиц
});

test('packagingFee считает стоимость по числу посылок', () => {
  assert.equal(packagingFee(1), PACKAGING_FEE);
  assert.equal(packagingFee(2), PACKAGING_FEE * 2);
  assert.equal(packagingFee(0), 0);
});
