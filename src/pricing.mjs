// Расчёт стоимости заказа. Чистые функции без ввода-вывода: цена — то, что
// проверяется тестом построчно, и подмешивать сюда сеть значило бы проверять
// вместе с ней.

export const DELIVERY_FEE = 300;

// Порог бесплатной доставки. Заказ ровно на пороге доставку уже не платит:
// «от 3000» в тексте оферты означает включительно, и расхождение здесь стоило
// бы дороже, чем читается.
export const FREE_DELIVERY_FROM = 3000;

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
 * Итог заказа: позиции, доставка, сумма к оплате.
 * @param {Item[]} items
 */
export function quote(items) {
  const goods = subtotal(items);
  const delivery = deliveryFee(goods);
  return { goods, delivery, total: goods + delivery };
}
