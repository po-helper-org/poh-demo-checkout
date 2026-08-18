import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DELIVERY_FEE,
  FREE_DELIVERY_FROM,
  deliveryFee,
  quote,
  subtotal,
  discountAmount,
  PROMO_CODES,
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
    discount: 0,
    delivery: DELIVERY_FEE,
    total: 1300,
  });
});

test('крупный заказ едет без платы за доставку', () => {
  assert.deepEqual(quote([{ sku: 'a', price: 3500, qty: 1 }]), {
    goods: 3500,
    discount: 0,
    delivery: 0,
    total: 3500,
  });
});

// Промо-коды
test('без промо-кода работает как раньше', () => {
  const result = quote([{ sku: 'a', price: 1000, qty: 1 }]);
  assert.equal(result.goods, 1000);
  assert.equal(result.discount, 0);
  assert.equal(result.delivery, 300);
  assert.equal(result.total, 1300);
});

test('промо-код даёт скидку от товаров', () => {
  const result = quote(
    [{ sku: 'a', price: 1000, qty: 2 }],
    'WELCOME10'
  );
  assert.equal(result.goods, 2000);
  assert.equal(result.discount, 200);
  assert.equal(result.delivery, 300); // Порог не достигнут (2000 < 3000)
  assert.equal(result.total, 2100);
});

test('неизвестный промо-код — ошибка', () => {
  assert.throws(
    () => quote([{ sku: 'a', price: 1000, qty: 1 }], 'UNKNOWN'),
    /неизвестный промо-код/
  );
});

test('порог доставки считается до скидки', () => {
  // 3000 товаров без скидки → доставка 0
  // 3000 товаров со скидкой 20% → доставка всё ещё 0
  const result = quote(
    [{ sku: 'a', price: 3000, qty: 1 }],
    'SUMMER20'
  );
  assert.equal(result.goods, 3000);
  assert.equal(result.discount, 600);
  assert.equal(result.delivery, 0); // Порог достигнут по goods (3000 >= 3000)
  assert.equal(result.total, 2400);
});

test('скидка со свободной доставкой', () => {
  const result = quote(
    [{ sku: 'a', price: 3500, qty: 1 }],
    'FALL15'
  );
  assert.equal(result.goods, 3500);
  assert.equal(result.discount, 525);
  assert.equal(result.delivery, 0);
  assert.equal(result.total, 2975);
});

test('discountAmount без кода возвращает 0', () => {
  assert.equal(discountAmount(1000, null), 0);
  assert.equal(discountAmount(1000, undefined), 0);
});

test('discountAmount с неизвестным кодом выбрасывает', () => {
  assert.throws(() => discountAmount(1000, 'UNKNOWN'), /неизвестный промо-код/);
});
