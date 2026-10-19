# Кейсы доработок — docs/solutions/

Здесь лежат кейсы доработок сервиса расчёта заказа: что ломалось или чего не хватало, почему и как
решили. Формат и правила — в соглашении
[SOLUTIONS.md](https://github.com/po-helper-org/.github/blob/main/SOLUTIONS.md).

| Дата | Кейс | Вид | Область | PR |
|---|---|---|---|---|
| 2026-09-03 | [main покраснел сам: тесты зависели от календаря](2026-09-03-tests-calendar-dependency.md) | bug | tests | #173 |
| 2026-09-03 | [Мониторинг гасил сервис: 405 на HEAD и 404 вместо 405](2026-09-03-head-monitoring-405.md) | incident | server | #164, #172 |
| 2026-08-26 | [Веб-интерфейс расчёта: статика и path traversal](2026-08-26-static-ui-traversal-guard.md) | feature | server | #9 |
| 2026-08-25 | [Счётчики /stats не переживают перезапуск](2026-08-25-metrics-counters-volatile.md) | feature | metrics | #98, #145 |
| 2026-08-25 | [Оплата картой и invoiceId на sha256](2026-08-25-card-payment-invoice-id.md) | feature | pricing | #89, #134 |
| 2026-08-25 | [HTTP-контракт /quote и /healthz](2026-08-25-http-contract-quote-healthz.md) | bug | server | #104, #130, #131, #141, #144 |
| 2026-08-25 | [Промо-коды в расчёте заказа](2026-08-25-promo-codes-in-quote.md) | feature | pricing | #6, #133 |
| 2026-08-25 | [Единый контракт ошибок промокода и оплаты](2026-08-25-promo-payment-error-contract.md) | bug | pricing | #132, #142 |
| 2026-08-24 | [Проверки релиза: контракт .delivery/checks.json](2026-08-24-delivery-checks-contract.md) | incident | delivery | #35, #99, #113, #117 |
| 2026-08-24 | [Отрицательная сумма и минимальный заказ](2026-08-24-order-sum-validation.md) | bug | pricing | #38, #81 |
| 2026-08-20 | [Скидка считалась во float](2026-08-20-money-rounding-float-discount.md) | bug | pricing | #73 |
