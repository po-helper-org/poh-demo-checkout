import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  MIN_ORDER_AMOUNT,
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

test('итог складывает товары, доставку и упаковку', () => {
  const result = quote([{ sku: 'a', price: 1000, qty: 1 }]);
  assert.equal(result.goods, 1000);
  assert.equal(result.packages, 1);
  assert.equal(result.delivery, DELIVERY_FEE + PACKAGING_FEE);
  assert.equal(result.total, 1000 + DELIVERY_FEE + PACKAGING_FEE);
  assert.equal(result.discount, 0);
  assert.equal(result.promoStatus, 'none');
  assert.equal(result.payment, null);
  assert.equal(result.paymentStatus, 'none');
});

test('крупный заказ едет без платы за доставку, но платит упаковку', () => {
  const result = quote([{ sku: 'a', price: 3500, qty: 1 }]);
  assert.equal(result.goods, 3500);
  assert.equal(result.packages, 1);
  assert.equal(result.delivery, PACKAGING_FEE);
  assert.equal(result.total, 3500 + PACKAGING_FEE);
  assert.equal(result.discount, 0);
  assert.equal(result.promoStatus, 'none');
});

test('плата за упаковку по числу посылок', () => {
  const result = quote([{ sku: 'a', price: 200, qty: 6 }]);
  assert.equal(result.goods, 1200);
  assert.equal(result.packages, 2);
  assert.equal(result.delivery, 400); // 300 (база) + 100 (упаковка)
  assert.equal(result.total, 1600);
});

test('бесплатная доставка, упаковка платится', () => {
  const result = quote([{ sku: 'a', price: 5000, qty: 1 }]);
  assert.equal(result.goods, 5000);
  assert.equal(result.packages, 1);
  assert.equal(result.delivery, 50); // 0 (база) + 50 (упаковка)
  assert.equal(result.total, 5050);
});

test('ровно 5 единиц — одна посылка', () => {
  const result = quote([{ sku: 'a', price: 250, qty: 5 }]);
  assert.equal(result.goods, 1250);
  assert.equal(result.packages, 1);
  assert.equal(result.delivery, 350); // 300 + 50
});

test('6 единиц — две посылки', () => {
  const result = quote([{ sku: 'a', price: 200, qty: 6 }]);
  assert.equal(result.goods, 1200);
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

test('заказ ниже минимальной суммы — ошибка с точной суммой нехватки', () => {
  // Заказ на 500 руб при пороге 1000
  assert.throws(() => quote([{ sku: 'a', price: 500, qty: 1 }]), /минимальная сумма/);
});

test('крупный заказ с бесплатной доставкой и упаковкой', () => {
  assert.deepEqual(quote([{ sku: 'a', price: 3500, qty: 1 }]), {
    goods: 3500,
    packages: 1,
    delivery: PACKAGING_FEE,
    discount: 0,
    promoStatus: 'none',
    total: 3500 + PACKAGING_FEE,
    payment: null,
    paymentStatus: 'none',
  });
});

test('отрицательная сумма заказа не проходит', () => {
  assert.throws(() => deliveryFee(-100), /сумма заказа/);
});

test('промокод не передан — статус none, скидка 0', () => {
  assert.deepEqual(quote([{ sku: 'a', price: 1000, qty: 1 }]), {
    goods: 1000,
    packages: 1,
    delivery: DELIVERY_FEE + PACKAGING_FEE,
    discount: 0,
    promoStatus: 'none',
    total: 1000 + DELIVERY_FEE + PACKAGING_FEE,
    payment: null,
    paymentStatus: 'none',
  });
});

test('валидный промокод SALE10 даёт 10% скидки', () => {
  assert.deepEqual(quote([{ sku: 'a', price: 1000, qty: 2 }], 'SALE10'), {
    goods: 2000,
    packages: 1,
    delivery: 300 + PACKAGING_FEE,
    discount: 200,
    promoStatus: 'applied',
    total: 2000 - 200 + 300 + PACKAGING_FEE,
    payment: null,
    paymentStatus: 'none',
  });
});

test('невалидный промокод — статус unknown, скидка 0', () => {
  assert.deepEqual(quote([{ sku: 'a', price: 1000, qty: 1 }], 'INVALID'), {
    goods: 1000,
    packages: 1,
    delivery: DELIVERY_FEE + PACKAGING_FEE,
    discount: 0,
    promoStatus: 'unknown',
    total: 1000 + DELIVERY_FEE + PACKAGING_FEE,
    payment: null,
    paymentStatus: 'none',
  });
});

test('доставка и упаковка не скидываются при применении промокода', () => {
  // Товары на 2500, доставка 300 + упаковка 50. Скидка 10% = 250.
  // Итог: 2500 - 250 + 300 + 50 = 2600 (доставка платная, т.к. goods ДО скидки = 2500 < 3000)
  const result = quote([{ sku: 'a', price: 2500, qty: 1 }], 'SALE10');
  assert.equal(result.goods, 2500);
  assert.equal(result.discount, 250);
  assert.equal(result.delivery, 300 + PACKAGING_FEE); // доставка считается по goods ДО скидки + упаковка
  assert.equal(result.total, 2600);
  assert.equal(result.payment, null);
  assert.equal(result.paymentStatus, 'none');
});

// === Payment Method Tests ===

test('paymentMethod=cloudpayments добавляет блок payment', () => {
  const result = quote([{ sku: 'a', price: 1000, qty: 2 }], null, 'cloudpayments');
  assert.equal(result.payment.provider, 'cloudpayments');
  assert.equal(result.payment.amount, 2000 + 300 + PACKAGING_FEE);  // 2000 + 300 delivery + 50 packaging
  assert.equal(result.payment.currency, 'RUB');
  assert.ok(result.payment.invoiceId);  // не пустой
  assert.match(result.payment.invoiceId, /^INV-[0-9A-F]{8}-1$/);  // формат INV-XXXXXXXX-1
  assert.equal(result.paymentStatus, 'ready');
});

test('paymentMethod с промокодом — payment.amount = total', () => {
  const result = quote([{ sku: 'a', price: 1000, qty: 2 }], 'SALE10', 'cloudpayments');
  assert.equal(result.goods, 2000);
  assert.equal(result.discount, 200);  // 10% от 2000
  assert.equal(result.total, 2000 - 200 + 300 + PACKAGING_FEE);  // 2000 - 200 + 300 + 50
  assert.equal(result.payment.amount, result.total);
  assert.equal(result.paymentStatus, 'ready');
});

test('невалидный paymentMethod — ошибка 400', () => {
  assert.throws(() => quote([{ sku: 'a', price: 1000, qty: 1 }], null, 'stripe'), /неизвестный способ оплаты/);
});

test('без paymentMethod — статус none, payment=null', () => {
  const result = quote([{ sku: 'a', price: 1000, qty: 1 }]);
  assert.equal(result.paymentStatus, 'none');
  assert.equal(result.payment, null);
});

test('invoiceSeq влияет на invoiceId', () => {
  const items = [{ sku: 'a', price: 1000, qty: 1 }];
  const result1 = quote(items, null, 'cloudpayments', 1);
  const result2 = quote(items, null, 'cloudpayments', 2);
  assert.notEqual(result1.payment.invoiceId, result2.payment.invoiceId);
  assert.match(result1.payment.invoiceId, /-1$/);
  assert.match(result2.payment.invoiceId, /-2$/);
});

test('invoiceId детерминирован для одного состава', () => {
  const items = [{ sku: 'a', price: 1000, qty: 1 }];
  const result1 = quote(items, 'SALE10', 'cloudpayments', 1);
  const result2 = quote(items, 'SALE10', 'cloudpayments', 1);
  assert.equal(result1.payment.invoiceId, result2.payment.invoiceId);
});

test('paymentMethod с бесплатной доставкой', () => {
  const result = quote([{ sku: 'a', price: 3500, qty: 1 }], null, 'cloudpayments');
  assert.equal(result.goods, 3500);
  assert.equal(result.delivery, PACKAGING_FEE); // 0 + 50
  assert.equal(result.total, 3500 + PACKAGING_FEE);
  assert.equal(result.payment.amount, 3500 + PACKAGING_FEE);
  assert.equal(result.paymentStatus, 'ready');
});

test('paymentMethod с невалидным промокодом', () => {
  const result = quote([{ sku: 'a', price: 1000, qty: 2 }], 'INVALID', 'cloudpayments');
  assert.equal(result.promoStatus, 'unknown');
  assert.equal(result.discount, 0);
  assert.equal(result.total, 2000 + 300 + PACKAGING_FEE);  // 2000 + 300 delivery + 50 packaging
  assert.equal(result.payment.amount, result.total);
  assert.equal(result.paymentStatus, 'ready');
});
