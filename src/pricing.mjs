// Расчёт стоимости заказа. Чистые функции без ввода-вывода: цена — то, что
// проверяется тестом построчно, и подмешивать сюда сеть значило бы проверять
// вместе с ней.

import { createHash } from 'node:crypto';

export const DELIVERY_FEE = 300;

// Порог бесплатной доставки. Заказ ровно на пороге доставку уже не платит:
// «от 3000» в тексте оферты означает включительно, и расхождение здесь стоило
// бы дороже, чем читается.
export const FREE_DELIVERY_FROM = 3000;

// Минимальная сумма заказа для оформления.
export const MIN_ORDER_AMOUNT = 1000;

// Реестр промокодов. При расширении типов скидок (фиксированная сумма, "2+1")
// следует вынести логику в отдельный модуль.
// Поддерживает обе структуры: {percent, activeUntil} и {discount, description}
export const PROMO_CODES = {
  // Из feature/1-openhands
  'WELCOME10': { percent: 10, activeUntil: null },
  'SUMMER20': { percent: 20, activeUntil: '2026-09-01' },
  'FALL15': { percent: 15, activeUntil: '2026-12-01' },
  // Из origin/main
  'SALE10': { discount: 0.10, description: 'Скидка 10%' }
};

// Реестр платежных провайдеров. При расширении — добавить новые записи.
export const PAYMENT_PROVIDERS = {
  CLOUDPAYMENTS: 'cloudpayments'
};

// Валюта операций
export const CURRENCY = 'RUB';
/**
 * Позиция заказа: цена за штуку в рублях и количество.
 * @typedef {{sku: string, price: number, qty: number}} Item
 */

/**
 * Сумма позиций без доставки.
 * @param {Item[]} items
 */
export function subtotal(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('заказ без позиций');
  }
  return items.reduce((sum, item) => {
    if (!Number.isFinite(item.price) || item.price < 0) {
      throw new Error(`некорректная цена в позиции ${item.sku}`);
    }
    if (!Number.isInteger(item.qty) || item.qty <= 0) {
      throw new Error(`некорректное количество в позиции ${item.sku}`);
    }
    return sum + item.price * item.qty;
  }, 0);
}

/**
 * Стоимость доставки для суммы заказа.
 * @param {number} amount
 */
export function deliveryFee(amount) {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('некорректная сумма заказа');
  }
  return amount >= FREE_DELIVERY_FROM ? 0 : DELIVERY_FEE;
}

/**
 * Валидация промо-кода. Возвращает скидку или null для невалидного кода.
 * Поддерживает обе структуры: {percent, activeUntil} и {discount, description}
 * @param {string} code
 * @param {Date} now
 */
function validatePromoCode(code, now = new Date()) {
  const config = PROMO_CODES[code];
  if (!config) return null;
  
  // Проверка срока действия для структуры с activeUntil
  if (config.activeUntil && new Date(config.activeUntil) < now) return null;
  
  // Поддержка обеих структур discount/percent
  const discount = config.discount !== undefined ? config.discount : (config.percent / 100);
  return discount;
}

/**
 * Расчёт суммы скидки в рублях.
 * Возвращает 0 для неизвестного промо-кода.
 * @param {number} goods
 * @param {string|null} promoCode
 */
export function discountAmount(goods, promoCode) {
  if (!promoCode) return 0;
  const discount = validatePromoCode(promoCode);
  if (discount === null) {
    return 0;
  }
  return goods * discount;
}

/**
 * Генерация invoiceId на основе хеша от состава заказа.
 * Детерминированный для одного состава, уникальный для разных попыток.
 * @param {Item[]} items — позиции заказа
 * @param {string|null} promoCode — промокод (если есть)
 * @param {number} seq — номер попытки (по умолчанию 1)
 * @returns {string} — invoiceId формата INV-XXXXXXXX-NN
 */
function generateInvoiceId(items, promoCode, seq = 1) {
  // Хеш только от состава заказа — детерминированность
  const params = JSON.stringify({ items, promoCode });
  const hash = createHash('sha256').update(params).digest('hex');
  const hashHex = hash.substring(0, 8).toUpperCase();
  return `INV-${hashHex}-${seq}`;
}

/**
 * Итог заказа: позиции, доставка, скидка по промокоду, способ оплаты, сумма.
 * Возвращает скидку 0 и promoStatus 'unknown' для неизвестного промо-кода.
 * @param {Item[]} items
 * @param {string|null} promoCode — опциональный промокод
 * @param {string|null} paymentMethod — опциональный способ оплаты
 * @param {number} invoiceSeq — номер попытки оплаты (для уникальности invoiceId)
 */
export function quote(items, promoCode = null, paymentMethod = null, invoiceSeq = 1) {
  const goods = subtotal(items);
  if (goods < MIN_ORDER_AMOUNT) {
    throw new Error(`минимальная сумма заказа ${MIN_ORDER_AMOUNT}, не хватает ${MIN_ORDER_AMOUNT - goods}`);
  }
  const delivery = deliveryFee(goods); // Порог считается ДО скидки

  let discount = 0;
  let promoStatus = 'none';

  if (promoCode) {
    const discountValue = validatePromoCode(promoCode);
    if (discountValue !== null) {
      // Скидка только на товары, доставка не скидывается
      // Округление до 2 знаков после запятой для избежания ошибок плавающей точки
      discount = Math.round(goods * discountValue * 100) / 100;
      promoStatus = 'applied';
    } else {
      promoStatus = 'unknown';
    }
  }

  // total = товары - скидка + доставка
  const total = goods - discount + delivery;

  // Логика платежного метода
  let payment = null;
  let paymentStatus = 'none';

  if (paymentMethod) {
    if (paymentMethod === PAYMENT_PROVIDERS.CLOUDPAYMENTS) {
      payment = {
        provider: paymentMethod,
        amount: total,
        currency: CURRENCY,
        invoiceId: generateInvoiceId(items, promoCode, invoiceSeq)
      };
      paymentStatus = 'ready';
    } else {
      const supportedMethods = Object.values(PAYMENT_PROVIDERS).join(', ');
      throw new Error(`неизвестный способ оплаты: ${paymentMethod}. Доступные способы: ${supportedMethods}`);
    }
  }

  return { goods, delivery, discount, promoStatus, total, payment, paymentStatus };
}
