// Расчёт стоимости заказа. Чистые функции без ввода-вывода: цена — то, что
// проверяется тестом построчно, и подмешивать сюда сеть значило бы проверять
// вместе с ней.

export const DELIVERY_FEE = 300;

// Порог бесплатной доставки. Заказ ровно на пороге доставку уже не платит:
// «от 3000» в тексте оферты означает включительно, и расхождение здесь стоило
// бы дороже, чем читается.
export const FREE_DELIVERY_FROM = 3000;

// Реестр промокодов. При расширении типов скидок (фиксированная сумма, "2+1")
// следует вынести логику в отдельный модуль.
export const PROMO_CODES = {
  SALE10: { discount: 0.10, description: 'Скидка 10%' }
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
 * Итог заказа: позиции, доставка, скидка по промокоду, сумма к оплате.
 * @param {Item[]} items
 * @param {string|null} promoCode — опциональный промокод
 */
export function quote(items, promoCode = null) {
  const goods = subtotal(items);
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
  return { goods, delivery, discount, promoStatus, total: goods - discount + delivery };
}
