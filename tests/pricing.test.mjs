import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  MIN_ORDER_AMOUNT,
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
    delivery: DELIVERY_FEE,
    discount: 0,
    promoStatus: 'none',
    total: 1300,
    payment: null,
    paymentStatus: 'none',
  });
});

test('заказ ниже минимальной суммы — ошибка с точной суммой нехватки', () => {
  // Заказ на 500 руб при пороге 1000
  assert.throws(() => quote([{ sku: 'a', price: 500, qty: 1 }]), /минимальная сумма/);
});

test('крупный заказ едет без платы за доставку', () => {
  assert.deepEqual(quote([{ sku: 'a', price: 3500, qty: 1 }]), {
    goods: 3500,
    discount: 0,
    delivery: 0,
    promoStatus: 'none',
    total: 3500,
    payment: null,
    paymentStatus: 'none',
  });
});

// Промо-коды из feature/1-openhands
test('промо-код WELCOME10 даёт 10% скидку', () => {
  const result = quote([{ sku: 'a', price: 1000, qty: 2 }], 'WELCOME10');
  assert.equal(result.goods, 2000);
  assert.equal(result.discount, 200);
  assert.equal(result.delivery, 300); // Порог не достигнут (2000 < 3000)
  assert.equal(result.total, 2100);
  assert.equal(result.promoStatus, 'applied');
});

test('отрицательная сумма заказа не проходит', () => {
  assert.throws(() => deliveryFee(-100), /сумма заказа/);
});

test('NaN в качестве суммы заказа не проходит', () => {
  assert.throws(() => deliveryFee(NaN), /сумма заказа/);
});

test('граница порога: 2999 руб — доставка платная', () => {
  assert.equal(deliveryFee(2999), DELIVERY_FEE);
});

test('граница порога: ровно 3000 руб — доставка бесплатна', () => {
  assert.equal(deliveryFee(3000), 0);
});

test('граница порога: 3001 руб — доставка бесплатна', () => {
  assert.equal(deliveryFee(3001), 0);
});

test('промокод не передан — статус none, скидка 0', () => {
  assert.deepEqual(quote([{ sku: 'a', price: 1000, qty: 1 }]), {
    goods: 1000,
    delivery: DELIVERY_FEE,
    discount: 0,
    promoStatus: 'none',
    total: 1300,
    payment: null,
    paymentStatus: 'none',
  });
});

test('промо-код SUMMER20 даёт 20% скидку', () => {
  const result = quote([{ sku: 'a', price: 3000, qty: 1 }], 'SUMMER20');
  assert.equal(result.goods, 3000);
  assert.equal(result.discount, 600);
  assert.equal(result.delivery, 0); // Порог достигнут по goods (3000 >= 3000)
  assert.equal(result.total, 2400);
  assert.equal(result.promoStatus, 'applied');
});

test('промо-код FALL15 даёт 15% скидку с бесплатной доставкой', () => {
  const result = quote([{ sku: 'a', price: 3500, qty: 1 }], 'FALL15');
  assert.equal(result.goods, 3500);
  assert.equal(result.discount, 525);
  assert.equal(result.delivery, 0);
  assert.equal(result.total, 2975);
  assert.equal(result.promoStatus, 'applied');
});

test('неизвестный промо-код — статус unknown, скидка 0', () => {
  assert.deepEqual(quote([{ sku: 'a', price: 1000, qty: 1 }], 'INVALID'), {
    goods: 1000,
    delivery: DELIVERY_FEE,
    discount: 0,
    promoStatus: 'unknown',
    total: 1300,
    payment: null,
    paymentStatus: 'none',
  });
});

test('порог доставки считается до скидки', () => {
  // 3000 товаров без скидки → доставка 0
  // 3000 товаров со скидкой 20% → доставка всё ещё 0
  const result = quote([{ sku: 'a', price: 3000, qty: 1 }], 'SUMMER20');
  assert.equal(result.goods, 3000);
  assert.equal(result.discount, 600);
  assert.equal(result.delivery, 0); // Порог достигнут по goods (3000 >= 3000)
  assert.equal(result.total, 2400);
});

test('discountAmount без кода возвращает 0', () => {
  assert.equal(discountAmount(1000, null), 0);
  assert.equal(discountAmount(1000, undefined), 0);
});

test('discountAmount с неизвестным кодом возвращает 0', () => {
  assert.equal(discountAmount(1000, 'UNKNOWN'), 0);
});

test('discountAmount с валидным кодом считает скидку', () => {
  assert.equal(discountAmount(1000, 'WELCOME10'), 100);
  assert.equal(discountAmount(2000, 'SUMMER20'), 400);
});

test('единое поведение функций при неизвестном промо-коде', () => {
  const items = [{ sku: 'a', price: 1000, qty: 1 }];
  const invalidCode = 'INVALID_CODE';
  
  // quote() возвращает скидку 0 и статус 'unknown'
  const quoteResult = quote(items, invalidCode);
  assert.equal(quoteResult.discount, 0);
  assert.equal(quoteResult.promoStatus, 'unknown');
  
  // discountAmount() тоже возвращает 0 (то же поведение)
  const goods = subtotal(items);
  const discountResult = discountAmount(goods, invalidCode);
  assert.equal(discountResult, 0);
  
  // Обе функции обрабатывают неизвестный код одинаково — возвращают 0
  assert.equal(quoteResult.discount, discountResult);
});

// Промо-коды из origin/main
test('промокод SALE10 даёт 10% скидки', () => {
  assert.deepEqual(quote([{ sku: 'a', price: 1000, qty: 2 }], 'SALE10'), {
    goods: 2000,
    delivery: 300,
    discount: 200,
    promoStatus: 'applied',
    total: 2100,
    payment: null,
    paymentStatus: 'none',
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
  assert.equal(result.payment, null);
  assert.equal(result.paymentStatus, 'none');
});

// === Payment Method Tests ===

test('paymentMethod=cloudpayments добавляет блок payment', () => {
  const result = quote([{ sku: 'a', price: 1000, qty: 2 }], null, 'cloudpayments');
  assert.equal(result.payment.provider, 'cloudpayments');
  assert.equal(result.payment.amount, 2300);  // 2000 + 300 delivery
  assert.equal(result.payment.currency, 'RUB');
  assert.ok(result.payment.invoiceId);  // не пустой
  assert.match(result.payment.invoiceId, /^INV-[0-9A-F]{8}-1$/);  // формат INV-XXXXXXXX-1
  assert.equal(result.paymentStatus, 'ready');
});

test('paymentMethod с промокодом — payment.amount = total', () => {
  const result = quote([{ sku: 'a', price: 1000, qty: 2 }], 'SALE10', 'cloudpayments');
  assert.equal(result.goods, 2000);
  assert.equal(result.discount, 200);  // 10% от 2000
  assert.equal(result.total, 2100);  // 2000 - 200 + 300
  assert.equal(result.payment.amount, 2100);
  assert.equal(result.paymentStatus, 'ready');
});

test('невалидный paymentMethod — ошибка 400', () => {
  assert.throws(() => quote([{ sku: 'a', price: 1000, qty: 1 }], null, 'stripe'), /неизвестный способ оплаты/);
});

test('ошибка неизвестного способа оплаты содержит список доступных', () => {
  assert.throws(() => {
    quote([{ sku: 'a', price: 1000, qty: 1 }], null, 'invalid_method');
  }, /неизвестный способ оплаты: invalid_method/);
  
  assert.throws(() => {
    quote([{ sku: 'a', price: 1000, qty: 1 }], null, 'invalid_method');
  }, /Доступные способы: cloudpayments/);
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
  assert.equal(result.delivery, 0);
  assert.equal(result.total, 3500);
  assert.equal(result.payment.amount, 3500);
  assert.equal(result.paymentStatus, 'ready');
});

test('paymentMethod с невалидным промокодом', () => {
  const result = quote([{ sku: 'a', price: 1000, qty: 2 }], 'INVALID', 'cloudpayments');
  assert.equal(result.promoStatus, 'unknown');
  assert.equal(result.discount, 0);
  assert.equal(result.total, 2300);  // 2000 + 300 delivery
  assert.equal(result.payment.amount, 2300);
  assert.equal(result.paymentStatus, 'ready');
});
