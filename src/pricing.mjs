// Расчёт стоимости заказа. Чистые функции без ввода-вывода: цена — то, что
// проверяется тестом построчно, и подмешивать сюда сеть значило бы проверять
// вместе с ней.

export const DELIVERY_FEE = 300;

// Порог бесплатной доставки. Заказ ровно на пороге доставку уже не платит:
// «от 3000» в тексте оферты означает включительно, и расхождение здесь стоило
// бы дороже, чем читается.
export const FREE_DELIVERY_FROM = 3000;

// Минимальная сумма заказа для оформления.
export const MIN_ORDER_AMOUNT = 1000;

// Реестр промокодов. При расширении типов скидок (фиксированная сумма, "2+1")
// следует вынести логику в отдельный модуль.
export const PROMO_CODES = {
  SALE10: { discount: 0.10, description: 'Скидка 10%' }
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
  return amount >= FREE_DELIVERY_FROM ? 0 : DELIVERY_FEE;
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
  let hash = 0;
  for (let i = 0; i < params.length; i++) {
    const char = params.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const hashHex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
  return `INV-${hashHex}-${seq}`;
}

/**
 * Итог заказа: позиции, доставка, скидка по промокоду, способ оплаты, сумма.
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
  const delivery = deliveryFee(goods);

  let discount = 0;
  let promoStatus = 'none';

  if (promoCode) {
    const promo = PROMO_CODES[promoCode];
    if (promo) {
      // Скидка только на товары, доставка не скидывается
      // Округление до 2 знаков после запятой для избежания ошибок плавающей точки
      discount = Math.round(goods * promo.discount * 100) / 100;
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
      throw new Error(`неизвестный способ оплаты: ${paymentMethod}`);
    }
  }

  return { goods, delivery, discount, promoStatus, total, payment, paymentStatus };
}
