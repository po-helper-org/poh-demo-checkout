// Расчёт стоимости заказа. Чистые функции без ввода-вывода: цена — то, что
// проверяется тестом построчно, и подмешивать сюда сеть значило бы проверять
// вместе с ней.

export const DELIVERY_FEE = 300;

// Порог бесплатной доставки. Заказ ровно на пороге доставку уже не платит:
// «от 3000» в тексте оферты означает включительно, и расхождение здесь стоило
// бы дороже, чем читается.
export const FREE_DELIVERY_FROM = 3000;

// Промо-коды для демо-стенда. В боевой системе это должен быть внешний
// конфиг или сервис — Концепт 2b из system_requirements.md.
export const PROMO_CODES = {
  'WELCOME10': { percent: 10, activeUntil: null },
  'SUMMER20': { percent: 20, activeUntil: '2026-09-01' },
  'FALL15': { percent: 15, activeUntil: '2026-12-01' },
};

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
 * Валидация промо-кода. Возвращает процент скидки или null для невалидного кода.
 * @param {string} code
 * @param {Date} now
 */
function validatePromoCode(code, now = new Date()) {
  const config = PROMO_CODES[code];
  if (!config) return null;
  if (config.activeUntil && new Date(config.activeUntil) < now) return null;
  return config.percent;
}

/**
 * Расчёт суммы скидки в рублях.
 * @param {number} goods
 * @param {string|null} promoCode
 */
export function discountAmount(goods, promoCode) {
  if (!promoCode) return 0;
  const percent = validatePromoCode(promoCode);
  if (percent === null) {
    throw new Error('неизвестный промо-код');
  }
  return goods * percent / 100;
}

/**
 * Итог заказа: позиции, скидка, доставка, сумма к оплате.
 * @param {Item[]} items
 * @param {string|null} promoCode
 */
export function quote(items, promoCode = null) {
  const goods = subtotal(items);
  const discount = discountAmount(goods, promoCode);
  const delivery = deliveryFee(goods); // Порог считается ДО скидки
  return { goods, discount, delivery, total: goods - discount + delivery };
}
