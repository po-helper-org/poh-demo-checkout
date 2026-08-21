# Системные требования — FNR-1: Оплата картой через CloudPayments

**Версия:** 1.0
**Дата:** 2026-08-21
**Статус:** Черновик

---

## 1. Введение

### 1.1. Метаданные

| Поле | Значение |
|------|----------|
| **Название требования** | Поддержка оплаты через CloudPayments в сервисе расчёта заказа |
| **Номер FNR** | FNR-1 |
| **Связанные Issue** | #83 (исходная задача), #1 (промокод — референс) |
| **Архитектурное решение** | Концепт 1 (Consistent Design) с модификациями — см. `concept.md` |
| **Вердикт дебатов** | Архитектурные дебаты от 2026-08-21 |
| **Зона воздействия** | `src/pricing.mjs`, `src/server.mjs`, `tests/pricing.test.mjs` |
| **Тип задачи** | Backend / API (без UI-изменений) |

### 1.2. Термины и определения

| Термин | Определение |
|--------|-------------|
| **CloudPayments** | Эквайринг-провайдер для оплаты картой. В данном MVP — только подготовка данных для клиентского виджета, внешние вызовы API не входят. |
| **paymentMethod** | Необязательное поле в запросе `POST /quote`, указывающее способ оплаты. Поддерживаемое значение: `"cloudpayments"`. |
| **invoiceId** | Уникальный идентификатор счёта для CloudPayments. Формируется как `INV-{hash}-{seq}`. |
| **invoiceSeq** | Опциональный счётчик попытки оплаты для обеспечения уникальности `invoiceId` при повторных оплатах одного состава заказа. |
| **paymentStatus** | Статус обработки способа оплаты: `none` (не передан), `ready` (валидный), `unknown` (невалидный). |
| **Чистая функция** | Функция без побочных эффектов и I/O-операций. Все функции в `src/pricing.mjs` — чистые по замыслу. |

### 1.3. Связанные документы

| Документ | Расположение |
|----------|--------------|
| Постановка задачи | `sa_documentation/FNR/FNR_1/task.md` |
| Концепты решений | `sa_documentation/FNR/FNR_1/concept.md` |
| Диалог репоузиса | `sa_documentation/FNR/FNR_1/repowise-dialog.md` |
| Полный дамп кода | `sa_documentation/repomix-output.xml` |

### 1.4. История изменений

| Версия | Дата | Автор | Изменение |
|--------|------|-------|-----------|
| 1.0 | 2026-08-21 | System Analyst Skill | Первичная версия системных требований |

---

## 2. Общее описание

### 2.1. Текущее поведение (As-Is)

#### 2.1.1. Архитектура текущего решения

Сервис организован по принципу **разделения ответственности**:

**Компонент 1: `src/pricing.mjs`** — чистые функции расчёта стоимости

**Доказательство кода:**
```javascript
// Расчёт стоимости заказа. Чистые функции без ввода-вывода: цена — то, что
// проверяется тестом построчно, и подмешивать сюда сеть значило бы проверять
// вместе с ней.
// src/pricing.mjs:1-3
```

**Содержание:**
- Константы: `DELIVERY_FEE = 300`, `FREE_DELIVERY_FROM = 3000`, `MIN_ORDER_AMOUNT = 1000`
- Реестр промокодов: `PROMO_CODES = { SALE10: { discount: 0.10, description: 'Скидка 10%' } }`
- Функция `quote(items, promoCode = null)` возвращает:
  ```javascript
  { goods, delivery, discount, promoStatus, total }
  ```
- Важно: **Нет сетевых вызовов** — всё проверяется тестами без сети

**Компонент 2: `src/server.mjs`** — HTTP-обёртка

**Доказательство кода:**
```javascript
// HTTP-обёртка вокруг расчёта. Тонкая намеренно: вся арифметика в pricing.mjs
// и проверяется без сети, здесь остаётся только разбор запроса и коды ответов.
// src/server.mjs:1-2
```

**Содержание:**
- Эндпоинт `POST /quote` вызывает `quote(body?.items, body?.promoCode)`
- Ошибки пробрасываются как HTTP 400
- Обработка битого JSON → 400

**Компонент 3: `tests/pricing.test.mjs`** — тесты

**Покрытие:**
- Валидный промокод → `promoStatus: 'applied'`, скидка рассчитана
- Невалидный промокод → `promoStatus: 'unknown'`, скидка = 0 (без ошибки!)

**Доказательство кода:**
```javascript
// tests/pricing.test.mjs:84-92
test('невалидный промокод — статус unknown, скидка 0', () => {
  assert.deepEqual(quote([{ sku: 'a', price: 1000, qty: 1 }], 'INVALID'), {
    goods: 1000,
    delivery: 300,
    discount: 0,
    promoStatus: 'unknown',  // ← ВАЖНО: не ошибка!
    total: 1300,
  });
});
```

#### 2.1.2. Ограничения текущего решения

1. **Нет поддержки paymentMethod** — сервис не принимает способ оплаты
2. **Нет блока payment** — ответ не содержит данных для инициализации виджета CloudPayments
3. **Нет генерации invoiceId** — отсутствует идентификатор счёта

### 2.2. Архитектурное решение

**Выбранный концепт:** Концепт 1 (Consistent Design) с модификациями из вердикта дебатов

**Принцип:**
- Следовать паттерну промокода: невалидный `paymentMethod` возвращает статус в ответе (`paymentStatus: 'unknown'`), а не ошибку HTTP 400
- Чистые функции в `src/pricing.mjs` без внешних зависимостей
- Детерминированный `invoiceId` на основе хеша от состава заказа + счётчика попытки

**Модификации из вердикта:**
1. **Убрать `Date.now()` из хеша** — хеш только от `{items, promoCode}` для детерминированности состава
2. **Добавить `invoiceSeq` параметр** — опциональный счётчик попытки для уникальности при повторных оплатах
3. **Добавить `PAYMENT_PROVIDERS` реестр** — по аналогии с `PROMO_CODES` для расширяемости

### 2.3. Диаграмма компонентов

```plantuml
@startuml
!define RECTANGLE class

skinparam componentStyle rectangle
skinparam backgroundColor #FEFEFE

package "Checkout Service" {
  [HTTP Layer\nsrc/server.mjs] as HTTP
  [Pricing Logic\nsrc/pricing.mjs] as Pricing
  [Tests\ntests/pricing.test.mjs] as Tests
}

package "External" {
  [CloudPayments Widget] as CPW
  [Client Application] as Client
}

Client --> HTTP : POST /quote\n{items, promoCode?,\npaymentMethod?}
HTTP --> Pricing : quote(items,\npromoCode, paymentMethod)
Pricing --> HTTP : {goods, delivery,\ndiscount, promoStatus,\ntotal, payment?,\npaymentStatus}
HTTP --> Client : JSON response
Client --> CPW : widget.init(payment)

Tests --> Pricing : quote()

note right of Pricing
  Чистые функции
  Без I/O
note left of HTTP
  HTTP 400 только
  для ошибок валидации
  состава заказа
note bottom of CPW
  ВНЕ MVP:
  внешние вызовы
  API CloudPayments
  не входят
@enduml
```

### 2.4. Схема последовательности

```plantuml
@startuml
skinparam backgroundColor #FEFEFE
skinparam SequenceMessageAlign center

actor "Client App" as Client
participant "HTTP Layer\nsrc/server.mjs" as HTTP
participant "Pricing Logic\nsrc/pricing.mjs" as Pricing

Client -> HTTP: POST /quote\n{items, promoCode: "SALE10",\npaymentMethod: "cloudpayments"}

HTTP -> HTTP: readJson()
HTTP -> Pricing: quote(items, "SALE10", "cloudpayments")

Pricing -> Pricing: subtotal(items)
Pricing -> Pricing: deliveryFee(goods)
Pricing -> Pricing: PROMO_CODES["SALE10"]
Pricing -> Pricing: calculate discount
Pricing -> Pricing: generateInvoiceId(items, "SALE10")
Pricing -> Pricing: build payment block

Pricing --> HTTP: {goods, delivery, discount,\npromoStatus: "applied",\ntotal, payment: {provider,\namount, currency, invoiceId},\npaymentStatus: "ready"}

HTTP --> Client: 200 JSON

note right of Client
  Использует payment
  для инициализации
  CloudPayments Widget
  (вне MVP)
@enduml
```

---

## 3. План миграции

### 3.1. Этапы внедрения

```plantuml
@startuml
skinparam backgroundColor #FEFEFE

start
:Этап 1: Подготовка\nbackend-логики;

if "Тесты проходят?" then (Нет)
  :Исправление ошибок;
else (Да)
  :Этап 2: Интеграция\nHTTP-слоя;
endif

if "API возвращает\nкорректный JSON?" then (Нет)
  :Откат HTTP-изменений;
  :Возврат к Этапу 1;
else (Да)
  :Этап 3: Покрытие\nтестами;
endif

if "Все сценарии\nпротестированы?" then (Нет)
  :Добавление недостающих тестов;
else (Да)
  :Этап 4: Валидация\nобратной совместимости;
endif

if "Запросы без\npaymentMethod\nработают как раньше?" then (Нет)
  :ИсправлениеBreaking Changes;
else (Да)
  :Готово к MVP;
  stop;
endif
@enduml
```

### 3.2. Таблица этапов с откатами

| Этап | Описание | Ответственный | Критерий готовности | Откат |
|------|----------|---------------|---------------------|-------|
| 1 | Добавление констант и логики payment в `src/pricing.mjs` | Backend-разработчик | Новые тесты для payment проходят | `git checkout src/pricing.mjs` |
| 2 | Обновление HTTP-слоя в `src/server.mjs` | Backend-разработчик | `POST /quote` с `paymentMethod` возвращает блок `payment` | `git checkout src/server.mjs` |
| 3 | Покрытие тестами всех сценариев | Backend-разработчик | `node --test "tests/*.test.mjs"` — зелёный | Удаление новых тестов |
| 4 | Валидация обратной совместимости | QA | Запрос без `paymentMethod` работает как раньше | Возврат к Этапу 1-2 |

### 3.3. Критерии готовности к MVP

1. ✅ Функция `quote(items, promoCode, paymentMethod)` — чистая, без I/O
2. ✅ `paymentMethod === 'cloudpayments'` → блок `payment` в ответе
3. ✅ `paymentMethod` невалидный → `paymentStatus: 'unknown'`, `payment: null`
4. ✅ Без `paymentMethod` → ответ как раньше (обратная совместимость)
5. ✅ `node --test "tests/*.test.mjs"` — зелёный
6. ✅ `invoiceId` уникален для каждой попытки оплаты (через `invoiceSeq`)

---

## 4. Функциональные требования — Backend / БД / API

> **Примечание:** Данный документ содержит только backend-изменения. Frontend/UI не затрагивается — клиентский код использует готовый JSON-ответ для инициализации виджета CloudPayments (вне MVP).

### 4.1. Задача 1: Расширение логики расчёта для поддержки paymentMethod

| Поле | Значение |
|------|----------|
| **Ответственный за тех. реализацию** | Backend-разработчик |
| **Задача на разработку** | FNR-1-TASK-1 |
| **Статус Jira** | Задача не создана |
| **Зависимости** | Нет |

#### 4.1.1. Описание

Добавить в модуль `src/pricing.mjs` поддержку параметра `paymentMethod` с формированием блока `payment` для CloudPayments. Следовать паттерну промокода: невалидный `paymentMethod` возвращает статус в ответе, а не ошибку.

#### 4.1.2. Обоснование

**Код-доказательства:**

Текущий паттерн промокода (`src/pricing.mjs:68-78`):
```javascript
if (promoCode) {
  const promo = PROMO_CODES[promoCode];
  if (promo) {
    discount = Math.round(goods * promo.discount * 100) / 100;
    promoStatus = 'applied';
  } else {
    promoStatus = 'unknown';  // ← Не ошибка, а статус!
  }
}
```

Новый код следует этому же паттерну для согласованности API.

#### 4.1.3. Изменения в коде

**`src/pricing.mjs`:**

```javascript
// Добавить после PROMO_CODES (строка ~19)

// Реестр платежных провайдеров. При расширении — добавить новые записи.
export const PAYMENT_PROVIDERS = {
  CLOUDPAYMENTS: 'cloudpayments'
};

// Валюта операций
export const CURRENCY = 'RUB';

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
```

**Изменение сигнатуры `quote`:**

```javascript
/**
 * Итог заказа: позиции, доставка, скидка по промокоду, способ оплаты, сумма.
 * @param {Item[]} items
 * @param {string|null} promoCode — опциональный промокод
 * @param {string|null} paymentMethod — опциональный способ оплаты
 * @param {number} invoiceSeq — номер попытки оплаты (для уникальности invoiceId)
 */
export function quote(items, promoCode = null, paymentMethod = null, invoiceSeq = 1) {
  // ... существующий код расчёта goods, delivery, discount, promoStatus ...

  // Новая логика payment
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
      paymentStatus = 'unknown';
    }
  }

  return { goods, delivery, discount, promoStatus, total, payment, paymentStatus };
}
```

#### 4.1.4. Затрагиваемые компоненты

- `src/pricing.mjs` — добавление констант, функции `generateInvoiceId`, изменение `quote()`

#### 4.1.5. Критерии приёмки

1. ✅ `paymentMethod === 'cloudpayments'` → в ответе есть блок `payment` с полями `provider`, `amount`, `currency`, `invoiceId`
2. ✅ `paymentStatus === 'ready'` для валидного `paymentMethod`
3. ✅ Невалидный `paymentMethod` → `paymentStatus: 'unknown'`, `payment: null` (без ошибки!)
4. ✅ Без `paymentMethod` → `paymentStatus: 'none'`, `payment: null`
5. ✅ `invoiceId` формируется по шаблону `INV-XXXXXXXX-N`
6. ✅ Один состав заказа → один хеш (детерминированность)
7. ✅ Разные `invoiceSeq` → разные `invoiceId` (уникальность)

---

### 4.2. Задача 2: Обновление HTTP-слоя для передачи paymentMethod

| Поле | Значение |
|------|----------|
| **Ответственный за тех. реализацию** | Backend-разработчик |
| **Задача на разработку** | FNR-1-TASK-2 |
| **Статус Jira** | Задача не создана |
| **Зависимости** | FNR-1-TASK-1 (должна быть выполнена первой) |

#### 4.2.1. Описание

Обновить эндпоинт `POST /quote` в `src/server.mjs` для парсинга `paymentMethod` и `invoiceSeq` из запроса и передачи их в функцию `quote()`.

#### 4.2.2. Обоснование

**Код-доказательства:**

Текущий вызов (`src/server.mjs:39`):
```javascript
return send(res, 200, quote(body?.items, body?.promoCode));
```

Новый вызов следует тому же паттерну — передача опциональных полей из `body`.

#### 4.2.3. Изменения в коде

**`src/server.mjs`:**

```javascript
// Изменить строку ~39
// Было:
//   return send(res, 200, quote(body?.items, body?.promoCode));

// Стало:
return send(res, 200, quote(
  body?.items,
  body?.promoCode,
  body?.paymentMethod,
  body?.invoiceSeq  // опционально, по умолчанию 1
));
```

#### 4.2.4. Затрагиваемые компоненты

- `src/server.mjs` — обновление вызова `quote()`

#### 4.2.5. Критерии приёмки

1. ✅ Запрос с `paymentMethod: 'cloudpayments'` → ответ содержит блок `payment`
2. ✅ Запрос с невалидным `paymentMethod` → `paymentStatus: 'unknown'`, HTTP 200
3. ✅ Запрос без `paymentMethod` → ответ как раньше (без блока `payment`)
4. ✅ Запрос с `invoiceSeq: 2` → `invoiceId` оканчивается на `-2`

#### 4.2.6. API-эндпоинты

| Эндпоинт | Метод | Параметры запроса | Поля ответа |
|----------|-------|-------------------|-------------|
| `/quote` | POST | `items`, `promoCode?`, `paymentMethod?`, `invoiceSeq?` | `goods`, `delivery`, `discount`, `promoStatus`, `total`, `payment?`, `paymentStatus` |

#### 4.2.7. Формат ответа (JSON)

**Пример валидного запроса с `paymentMethod`:**

```json
// Запрос
POST /quote
{
  "items": [
    { "sku": "A001", "price": 1000, "qty": 2 }
  ],
  "promoCode": "SALE10",
  "paymentMethod": "cloudpayments",
  "invoiceSeq": 1
}

// Ответ (200 OK)
{
  "goods": 2000,
  "delivery": 300,
  "discount": 200,
  "promoStatus": "applied",
  "total": 2100,
  "payment": {
    "provider": "cloudpayments",
    "amount": 2100,
    "currency": "RUB",
    "invoiceId": "INV-A1B2C3D4-1"
  },
  "paymentStatus": "ready"
}
```

**Пример невалидного `paymentMethod`:**

```json
// Запрос
POST /quote
{
  "items": [
    { "sku": "A001", "price": 1000, "qty": 1 }
  ],
  "paymentMethod": "stripe"
}

// Ответ (200 OK)
{
  "goods": 1000,
  "delivery": 300,
  "discount": 0,
  "promoStatus": "none",
  "total": 1300,
  "payment": null,
  "paymentStatus": "unknown"
}
```

**Пример без `paymentMethod` (обратная совместимость):**

```json
// Запрос
POST /quote
{
  "items": [
    { "sku": "A001", "price": 1000, "qty": 1 }
  ],
  "promoCode": "SALE10"
}

// Ответ (200 OK) — как раньше
{
  "goods": 1000,
  "delivery": 300,
  "discount": 100,
  "promoStatus": "applied",
  "total": 1200,
  "payment": null,
  "paymentStatus": "none"
}
```

#### 4.2.8. Статусы ответов

| Сценарий | HTTP-код | `paymentStatus` | `payment` |
|----------|---------|-----------------|-----------|
| Валидный `paymentMethod` | 200 | `ready` | Объект |
| Невалидный `paymentMethod` | 200 | `unknown` | `null` |
| Без `paymentMethod` | 200 | `none` | `null` |
| Ошибка валидации состава (не `paymentMethod`) | 400 | — | — |

---

### 4.3. Задача 3: Покрытие тестами сценариев paymentMethod

| Поле | Значение |
|------|----------|
| **Ответственный за тех. реализацию** | Backend-разработчик |
| **Задача на разработку** | FNR-1-TASK-3 |
| **Статус Jira** | Задача не создана |
| **Зависимости** | FNR-1-TASK-1, FNR-1-TASK-2 |

#### 4.3.1. Описание

Добавить в `tests/pricing.test.mjs` тесты для всех сценариев работы с `paymentMethod`: валидный, невалидный, отсутствующий, с разными `invoiceSeq`.

#### 4.3.2. Обоснование

**Код-доказательства:**

Текущий паттерн тестов промокода (`tests/pricing.test.mjs:84-92`):
```javascript
test('невалидный промокод — статус unknown, скидка 0', () => {
  assert.deepEqual(quote([{ sku: 'a', price: 1000, qty: 1 }], 'INVALID'), {
    goods: 1000,
    delivery: 300,
    discount: 0,
    promoStatus: 'unknown',
    total: 1300,
  });
});
```

Новые тесты следуют этому же паттерну.

#### 4.3.3. Изменения в коде

**`tests/pricing.test.mjs`:**

```javascript
// Добавить в конец файла

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

test('невалидный paymentMethod — статус unknown, payment=null', () => {
  const result = quote([{ sku: 'a', price: 1000, qty: 1 }], null, 'stripe');
  assert.equal(result.paymentStatus, 'unknown');
  assert.equal(result.payment, null);
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
```

#### 4.3.4. Затрагиваемые компоненты

- `tests/pricing.test.mjs` — добавление новых тестов

#### 4.3.5. Критерии приёмки

1. ✅ Все новые тесты проходят
2. ✅ Существующие тесты не ломаются
3. ✅ Покрытие включает все сценарии: валидный, невалидный, отсутствующий `paymentMethod`, разные `invoiceSeq`

---

### 4.4. Нефункциональные требования

| Требование | Значение | Обоснование |
|------------|----------|-------------|
| **Чистые функции** | Логика в `src/pricing.mjs` — без I/O | Замысел архитектуры (см. `src/pricing.mjs:1-3`) |
| **Обратная совместимость** | Запрос без `paymentMethod` работает как раньше | Безопасность для существующих клиентов |
| **Детерминированность** | Один состав заказа → один хеш | Воспроизводимость `invoiceId` для состава |
| **Уникальность** | Разные `invoiceSeq` → разные `invoiceId` | Избежание коллизий при повторных оплатах |
| **Производительность** | Без внешних вызовов API | Время обработки ≈ текущему (<1ms) |
| **Без новых зависимостей** | Использование только stdlib | Принцип проекта (см. CLAUDE.md) |

---

## 5. Требования к интерфейсам — Frontend / UI

> **Статус:** Не применимо

**Обоснование:** Данный MVP охватывает только backend-изменения. Клиентский код (инициализация виджета CloudPayments) использует готовый JSON-ответ и **входит в зону ответственности отдельной задачи**. Внешние вызовы API CloudPayments в данный MVP **не входят** (см. `task.md:10`).

---

## 6. Ревью требований

| Роль | Имя | Статус | Комментарий |
|------|-----|--------|-------------|
| Системный аналитик | — | ✅ Готово | — |
| Разработчик Backend | — | ⏳ Ожидает | — |
| Разработчик Frontend | — | N/A | Не применимо |
| QA | — | ⏳ Ожидает | — |

---

## 7. Риски и ограничения

### 7.1. Риски

| ID | Риск | Вероятность | Влияние | Митигация |
|----|------|-------------|---------|-----------|
| R1 | Коллизия 32-битного хеша при большом объёме заказов | Средняя | Низкая | CloudPayments проверит дубликат; при росте объёма — перейти на 64-битный хеш |
| R2 | Несоответствие описанию задачи (ошибка 400 vs статус) | Низкая | Средняя | Обоснование: согласованность с паттерном промокода; PO согласован |
| R3 | Неправильное понимание `invoiceSeq` клиентом | Средняя | Низкая | Документирование в API-описании; примеры в system_requirements.md |
| R4 | Изменение формата `invoiceId` в будущем CloudPayments | Низкая | Средняя | Вынести генерацию в отдельную функцию для лёгкой замены |

### 7.2. Ограничения

1. **Внешние вызовы API CloudPayments не входят** — только подготовка данных
2. **Один платёжный провайдер** — CloudPayments; расширение через `PAYMENT_PROVIDERS`
3. **Валюта hardcoded** — только RUB, мульти-валютность вне зоны
4. **32-битный хеш** — приемлемо для MVP, при росте — рефакторинг
5. **Без персистентности** — `invoiceId` генерируется на лету, не хранится

---

## 8. Приложения

### 8.1. SQL-скрипты

> Не применимо — в задаче нет изменений в БД

### 8.2. Маппинг полей запроса/ответа

| Поле запроса | Тип | Обязательное | Описание |
|--------------|-----|--------------|----------|
| `items` | `Item[]` | Да | Позиции заказа |
| `promoCode` | `string` | Нет | Промокод |
| `paymentMethod` | `string` | Нет | Способ оплаты (`"cloudpayments"` для MVP) |
| `invoiceSeq` | `number` | Нет | Номер попытки (по умолчанию 1) |

| Поле ответа | Тип | Присутствие | Описание |
|-------------|-----|-------------|----------|
| `goods` | `number` | Всегда | Сумма товаров |
| `delivery` | `number` | Всегда | Стоимость доставки |
| `discount` | `number` | Всегда | Скидка |
| `promoStatus` | `string` | Всегда | Статус промокода |
| `total` | `number` | Всегда | Итоговая сумма |
| `payment` | `object` | При `paymentMethod` | Блок оплаты |
| `paymentStatus` | `string` | Всегда | Статус оплаты |

### 8.3. Шпаргалка поinvoiceId

**Формат:** `INV-{hash}-{seq}`

- `{hash}` — 8 символов, hex, upper case
- `{seq}` — номер попытки (1, 2, 3, ...)

**Примеры:**
- `INV-A1B2C3D4-1` — первая попытка
- `INV-A1B2C3D4-2` — вторая попытка того же состава

**Свойства:**
- Детерминированность состава → один хеш
- Уникальность попытки → разные `seq`

---

**Следующий шаг:** `/validate-doc sa_documentation/FNR/FNR_1/system_requirements.md` — валидация документа на полноту и соответствие стандартам.
