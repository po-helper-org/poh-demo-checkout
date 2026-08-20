# Sources — Реестр источников

## Локальные документированные источники

| ID | Тип | Путь | Описание |
|---|---|---|---|
| S-01 | markdown | `README.md` | Основное описание репозитория и контура |
| S-02 | markdown | `CLAUDE.md` | Инструкции для Claude Code — git-workflow, MVP-first |
| S-03 | markdown | `AGENTS.md` | Постоянный контекст для агентов |
| S-04 | markdown | `DEMO.md` | Документация демо контура производства |
| S-05 | markdown | `bft-config.md` | Конфигурация БФТ для этого прогона |
| S-06 | markdown | `.bft/documentation/issue-43/artefacts/po-statement.md` | Постановка задачи #43 |

## Исходный код

| ID | Тип | Путь | Описание |
|---|---|---|---|
| S-07 | javascript | `src/pricing.mjs` | Арифметика расчёта заказа (чистые функции) |
| S-08 | javascript | `src/server.mjs` | HTTP-обёртка (разбор запроса, коды ответов) |
| S-09 | javascript | `tests/pricing.test.mjs` | Тесты расчёта (node:test) |
| S-10 | xml | `sa_documentation/repomix-output.xml` | XML-дамп кодовой базы (61KB) |

## Workflow автоматизации

| ID | Тип | Путь | Описание |
|---|---|---|---|
| S-11 | yaml | `.github/workflows/ci.yml` | CI: тесты при PR и push в main |
| S-12 | yaml | `.github/workflows/openhands-resolver.yml` | Диспатч разработки по Issue |
| S-13 | yaml | `.github/workflows/pr-review.yml` | Ревью PR-Agent |

## Недоступные источники

| ID | Тип | Статус | Почему недоступен |
|---|---|---|---|
| S-14 | tracker | UNAVAILABLE | В контуре Issue нет — постановка через po-statement.md |
| S-15 | wiki | UNAVAILABLE | Публикация в Confluence выключена |

## Внешние ссылки

| ID | Тип | URL | Описание |
|---|---|---|---|
| S-16 | repo | https://github.com/po-helper-org/poh-demo-checkout | Основной репозиторий |
| S-17 | repo | https://github.com/po-helper-org/poh-infra | Инфраструктура контура (harness) |
| S-18 | issue | https://github.com/po-helper-org/poh-demo-checkout/issues/1 | Эталонный прогон (#1) |
| S-19 | issue | https://github.com/po-helper-org/poh-demo-checkout/issues/43 | Текущая задача |
| S-20 | issue | https://github.com/po-helper-org/poh-demo-checkout/issues/41 | Эталон для #43 |
