// Расчёт стоимости заказа. Чистые функции без ввода-вывода: цена — то, что
// проверяется тестом построчно, и подмешивать сюда сеть значило бы проверять
// вместе с ней.

export const DELIVERY_FEE = 300;

// Порог бесплатной доставки. Заказ ровно на пороге доставку уже не платит:
// «от 3000» в тексте оферты означает включительно, и расхождение здесь стоило
// бы дороже, чем читается.
export const FREE_DELIVERY_FROM = 3000;

// Параметры упаковки: 50 ₽ за посылку, до 5 единиц товара в посылке.
export const PACKAGING_FEE = 50;
export const PACKAGES_CAPACITY = 5;

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
 * Количество посылок для набора позиций.
 * @param {Item[]} items
 */
export function countPackages(items) {
  const units = items.reduce((sum, item) => sum + item.qty, 0);
  return Math.ceil(units / PACKAGES_CAPACITY);
}

/**
 * Стоимость упаковки для числа посылок.
 * @param {number} packages
 */
export function packagingFee(packages) {
  return packages * PACKAGING_FEE;
}

/**
 * Итог заказа: позиции, посылки, доставка, сумма к оплате.
 * @param {Item[]} items
 */
export function quote(items) {
  const goods = subtotal(items);
  const packages = countPackages(items);
  const delivery = deliveryFee(goods) + packagingFee(packages);
  return { goods, packages, delivery, total: goods + delivery };
}
