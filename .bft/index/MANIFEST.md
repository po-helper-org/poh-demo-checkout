# MANIFEST индекса контекста БФТ

**Дата генерации:** 2026-08-20
**Воркспейс:** po-helper-org/poh-demo-checkout
**Статус:** COMPLETE

## Покрытие источников

| Источник | Статус | Детали |
|---|---|---|
| **Локальные доки** | ✅ AVAILABLE | Globs из `bft-config.md`: `.bft/documentation/**` |
| **Исходный код** | ✅ AVAILABLE | `src/pricing.mjs`, `src/server.mjs`, `tests/` |
| **Трекер (JIRA)** | ⚠️ UNAVAILABLE | В контуре не подключён — постановка через `po-statement.md` |
| **Confluence** | ⚠️ UNAVAILABLE | Публикация выключена — артефакты уезжают веткой в GitHub |

## Паки индекса

| Пак | Статус | Записей | якорей |
|---|---:|---:|---:|
| architecture.md | ✅ | 8 | 8 |
| domain-rules.md | ✅ | 6 | 6 |
| decisions.md | ✅ | 5 | 5 |
| regulatory.md | ⚠️ EMPTY | 0 | 0 |
| glossary.md | ✅ | 12 | 12 |
| stakeholders.md | ✅ | 5 | 5 |
| sources.md | ✅ | 14 | 14 |

## Качество покрытия

**Для запуска БФТ:** Достаточно
**Для глубокой аналитики:** Ограничено (нет трекера и Confluence)

### Ограничения

- Трекерские данные и wiki-страницы недоступны — весь контекст из локальных доков
- Регуляторика не задокументирована — пак пуст
- Для issue #43 есть полный po-statement с требованиями

## Связанные сущности

| Issue | Статус | Артефакты |
|---|---|---|
| #43 | В работе | `.bft/documentation/issue-43/artefacts/po-statement.md` |
| #41 | Эталон | Упомянут в po-statement как референс |
