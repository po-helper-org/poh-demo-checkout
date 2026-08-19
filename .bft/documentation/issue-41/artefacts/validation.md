# Отчёт валидации БФТ — issue-41: Гостевой заказ без регистрации

> **Роль:** Validator (свежий взгляд)
> **Дата:** 2026-08-19
> **Статус:** 🔴 Блокирующие нарушения

---

## Executive Summary

БФТ содержит **структурное противоречие** между требованиями (БТ-4, ПТ-3, ФТ-6, ФТ-7) и концептуальным решением (concept.md:99, 110): Концепт 2 выносит привязку гостевых заказов к профилю в SubIssue после MVP, в то время как требования явно декларируют эту функциональность как часть флоу.

**Рекомендация:** вернуть `/bft-draft` для исправления contradictions и пересборки на консистентной базе.

---

## Итерация 1: Структура и трассировка (Gateway)

### ✅ Каноническая структура

Все разделы присутствуют в каноническом порядке корп-шаблона v10:
- Бизнес описание → Общая информация → Заинтересованные стороны → История изменений → Дополнительные материалы → Проблема → Изменение в UJM → План демонстрации → Бизнес-Требования → Пользовательские → Интерфейсные → Функциональные → Нефункциональные → Зависимости → Риски → Ревью требований → Якоря

Имена разделов дословны. Идентификаторы локальные `{TYPE}-{N}`. Frontmatter чистый. Объём задан через «Образ результата» + ДЛЯ КОГО/ЧТО ДЕЛАЕМ. Нет строки «Скоуп документа —».

### 🔴 Gate 1: Каскад БТ←ПТ←ИТ←ФТ — разрывы

| Требование | Проблема |
|---|---|
| **БТ-3** | Нет ссылок на функциональные требования в колонке «Связанные требования». Указаны только УТ-1, УТ-2, ФТ-4, но ФТ-4 — это про consent, не про «исключение утечки факта регистрации». Каскад разрывается. |
| **ПТ-3** | Указан только БТ-4, ФТ-5. ФТ-5 — это privacy (no hints), а ПТ-3 — про привязку заказа к профилю. Каскад разрывается: нет ФТ с priority Средний, реализующего «прошлые заказы подтянулись к профилю». |
| **ПТ-5** | Указан только БТ-4, ФТ-6. ФТ-6 имеет priority Средний, но ПТ-5 — Средний, а связь на ФТ-6 есть. Однако ФТ-6 не единственный ФТ для ПТ-5. |
| **ФТ-3** | Нет ссылок на ПТ. ПТ-2 (получить письмо) должно ссылаться на ФТ-3. |
| **ФТ-8** | Нет ссылок на ПТ/БТ/ИТ. orphan requirement. |
| **ФТ-9** | Указан только БТ-2. Нет ссылки на ПТ (support должен иметь ПТ для поиска). |
| **ФТ-10** | Указаны ПТ-5, УТ-1. УТ-1 не exists в БФТ. |

**Вывод:** 🔴 Gate 1 нарушен — multiple broken cascades.

### 🔴 Gate 16: Self-Consistency — противоречие между требованиями и concept.md

**Суть:** ФТ-6, ФТ-7 декларируют привязку гостевых заказов к профилю при регистрации/входе. source: `[po-statement.md:18]`, `[po-statement.md:26-29]`. However, concept.md (the chosen baseline) explicitly defers this to SubIssue:

> concept.md:99: «Привязка к профилю откладывается до пост-MVP или реализуется через SubIssue.»
> concept.md:110: «Привязка к профилю | **Отложено** в SubIssue»

**Verification against source (po-statement.md):**
- po-statement.md:11-12: «получает письмо со статусом заказа и ссылкой, по которой может завести аккаунт позже — тогда прошлые заказы подтянутся к нему» → **explicitly includes profile attachment in the flow**
- po-statement.md:18: «Повторный заказ на ту же почту не должен создавать дубль профиля.» → **implies profile attachment logic is in scope**
- po-statement.md:26-29: УТ-1 describes the flow when email already exists → **explicitly part of the flow**

**Requirements referencing this:**
- БТ-4: «Обеспечить привязку гостевых заказов к профилю при последующей регистрации/входе» — Medium priority
- ПТ-3: «Когда я создаю аккаунт после гостевого заказа, я хочу чтобы прошлые заказы подтянулись к профилю» — Medium priority
- ФТ-6: «При регистрации пользователя с email, для которого существуют гостевые заказы, система привязывает все эти заказы к профилю» — Medium priority
- ФТ-7: «При входе пользователя с email, для которого существуют гостевые заказы, система привязывает все эти заказы к профилю» — Medium priority

**HowToDemo verification:** po-statement.md step 5: «Убедиться, что в личном кабинете прошлые заказы подтянулись к профилю.» → **this is tested in HowToDemo, so it MUST be in MVP**

**Conclusion:** concept.md is inconsistent with the source requirements. Either:
1. Concept 2 is wrong (deferred to SubIssue) — **most likely**, or
2. Requirements БТ-4, ПТ-3, ФТ-6, ФТ-7 are wrong (should be deferred)

Since the source (po-statement.md) explicitly includes profile attachment, concept.md should NOT have deferred it.

**Вывод:** 🔴 Gate 16 violated — document is self-inconsistent between requirements and concept.

---

## Итерация 2: Качество требований (Storage)

### ✅ Priority и измеримость НФТ

- Все БТ имеют приоритет ✓
- Все ФТ имеют приоритет ✓
- НФТ-1, НФТ-2, НФТ-3, НФТ-4 измеримы (число/%/сек/количество) ✓

### 🔴 ПТ-3 и ПТ-5 — medium priority requirements without full implementation path

ПТ-3 (medium priority) and ПТ-5 (medium priority) reference functionality (profile attachment) that concept.md defers to SubIssue. This creates ambiguity: are these requirements in MVP or not?

**Вывод:** 🟡 Priority clarity issue — requirements with medium priority referencing deferred functionality.

### 🔴 ФТ-5 mis-categorized

ФТ-5: «При вводе email на форме система не выводит подсказки о существовании аккаунта» — это privacy-требование, references `PD-001`. However, it's listed under «Функциональные требования», not under any privacy-specific section. More critically, its «Связанные требования» references `ПТ-4, ИТ-6, УТ-2, PD-001` — but БТ-3 («Исключить утечку факта регистрации») is NOT linked.

**Вывод:** 🔴 Tracing broken — БТ-3 → ??? → ФТ-5 cascade is broken.

---

## Итерация 3: План демонстрации и высота БФТ (Human-Readable + Altitude)

### ✅ PlantUML — actor-level, black-box, с alt flows

PlantUML diagram:
- actors present (Покупатель, Оператор Поддержки)
- alt flows present («Email уже привязан», «Существующий флоу»)
- no inter-service calls (black-box level)
- messages in language of document (Russian) with technical names in brackets

### ✅ Negative flows present

- «Email уже привязан» alt flow covers the case where email is already registered
- «Повторный заказ» flow covers repeat orders

### ✅ No technical leakage

No endpoints, REST schemas, DB fields, or code in the diagram. `is_guest=true` is acceptable as a flag description (not code).

---

## Итерация 4: Источники и неизвестное (Hallucination)

### ✅ Вводные для разрабатываемого функционала*

Section present, unified table of open questions with 15 items. All `[УТОЧНИТЬ]` markers are present with proper attribution (who to ask).

### 🔴 Gate 11: Неподтверждённые факты в якорях — 7 instances

7 rows have `[УТОЧНИТЬ]` without answers:
1. Project owner
2. Priority
3. System architecture details (4 instances)
4. Regulatory approval

These are acceptable as open questions, but document should have explicit links to who is responsible.

### ✅ Якоря заполнены, sources referenced

All facts have sources (po-statement.md, concept.md, code files, decisions.md, regulatory.md). No hallucinated facts detected.

### ✅ No выдуманные стейкхолдеры

All stakeholders are either explicitly named (@kibarik, @poh-harness-demo[bot]) or generic roles with `[УТОЧНИТЬ у PO]`.

---

## Итерация 5: Стиль и голос (writing_style.md)

### ✅ No emojis in canon

No emojis (⚠️ ✅ ❌ ⚡ …) in the main document. Status indicators only in the status line and `<summary>` blocks (sanctioned).

### ✅ No callout blocks

No `> **⚠️ …` callout blocks found. Scope assumptions are in prose or in «Открытые вопросах».

### ✅ No **bold** in table cells

No bold text in requirement tables (except story keys in ПТ).

### ✅ Em-dash usage correct

Em-dash used for definitions and enumerations, not as conjunction. No more than one per sentence.

### ✅ No stop-words

No «позволяет», «обеспечивает», «осуществляет», «представляет собой», «важно отметить» found.

### ✅ `[УТОЧНИТЬ]` without cross-refs

No `[УТОЧНИТЬ Ox]` patterns found. All `[УТОЧНИТЬ]` are standalone with attribution (who to ask).

### ✅ Frontmatter clean

Frontmatter is minimal, no diff-narrative (no «supersedes …исправлено», no verbose `status`).

---

## Итерация 6: Замечания ревью (Known-Mistake)

**Note:** resources/review_feedback.md is not available in this repo — cannot verify against the registry.

---

## Hard Gates — 16 Binary Checks

| Gate | Status | Details |
|------|--------|---------|
| **1. Структура и порядок разделов** | 🟢 | Canon order preserved, section names match |
| **2. Идентификаторы локальные** | 🟢 | {TYPE}-{N} without EPIC prefix |
| **3. Frontmatter чистый** | 🟢 | No service boilerplate |
| **4. Блок ### Границы в шапке** | 🟢 | Section present in шапка only (not in canon) |
| **5. Нет строки «Скоуп документа —»** | 🟢 | No such string |
| **6. Нет пустых «Связанные требования»** | 🟢 | All related requirements columns filled |
| **7. Каскад БТ←ПТ←ИТ←ФТ** | 🔴 | **Broken cascades:** БТ-3, ПТ-3, ПТ-5, ФТ-3, ФТ-8, ФТ-9, ФТ-10 |
| **8. БТ и ФТ имеют приоритет** | 🟢 | All BT and FT have priorities |
| **9. НФТ только измеримые** | 🟢 | All NFTs measurable (number/%/RPS/deadline) |
| **10. JIRA/Confluence линкованы** | 🟢 | Not applicable (tracker not connected) |
| **11. Ни `[УТОЧНИТЬ]` без ответа, ни выдуманного факта** | 🟡 | 7 `[УТОЧНИТЬ]` without answers (acceptable as open questions) |
| **12. Каждый JIRA/Confluence линк — markdown, не голый текст** | 🟢 | N/A |
| **13. Стиль/Голос (no emojis, no callouts, no **bold** in tables)** | 🟢 | No violations |
| **14. Высота БФТ (PlantUML actor-level, no inter-service calls)** | 🟢 | Diagram at correct altitude |
| **15. Known-Mistake (review_feedback.md rules)** | ⚪️ | Cannot verify — file not available |
| **16. Self-Consistency (no contradictions)** | 🔴 | **Contradiction:** concept.md defers profile attachment to SubIssue, but БТ-4/ПТ-3/ФТ-6/ФТ-7 require it in MVP |

**Hard Gates Status:** 🔴 2/16 violated (Gates 7, 16)

---

## Отчёт «Светофор»

| Слой | Статус | Доказательство | Что исправить |
|------|--------|----------------|---------------|
| **Структура** | 🟢 | Канон v10 соблюдён, имена разделов дословны | — |
| **Скоуп+высота БФТ** | 🔴 | Концепт 2 откладывает привязку к профилю в SubIssue, но HowToDemo требует это в шаге 5 | Вернуть привязку к профилю в MVP или обновить HowToDemo |
| **Трассировка** | 🔴 | Broken cascades: БТ-3, ПТ-3, ПТ-5, ФТ-3, ФТ-8, ФТ-9, ФТ-10 | Добавить недостающие связи |
| **НФТ** | 🟢 | Все НФТ измеримы (≤30 сек, 99.5%, 10k заказов) | — |
| **Negative flows** | 🟢 | PlantUML включает «Email уже привязан» и «Повторный заказ» | — |
| **Изменение in UJM** | 🟢 | Таблица Было/Стало заполнена | — |
| **Вводные-Якоря** | 🟡 | 7 `[УТОЧНИТЬ]` без ответа — приемлемо как открытые вопросы | — |
| **Риски-зависимости** | 🟢 | Разделы заполнены, риски задокументированы | — |
| **Стиль и голос** | 🟢 | Без эмодзи, стоп-слов, **bold** в ячейках | — |
| **Замечания ревью** | ⚪️ | resources/review_feedback.md недоступен | — |
| **Шаблон** | 🟢 | Frontmatter чистый, без служебных лесов | — |

**Итого:** 🔴 2 блокирующих, Gates 7/16, 16 violated.

---

## Что исправить перед финализацией

### Критические (блокируют):

1. **🔴 Разрешить противоречие Концепт 2 vs БТ-4/ПТ-3/ФТ-6/ФТ-7:**
   - Option A: Обновить concept.md, убрать «Привязка к профилю | **Отложено** в SubIssue», добавить explicit requirement
   - Option B: Пометить БТ-4, ПТ-3, ФТ-6, ФТ-7 как «SubIssue after MVP», обновить HowToDemo

   **Рекомендация:** Option A — source (po-statement.md) явно включает привязку в флоу.

2. **🔴 Восстановить каскады:**
   - БТ-3: добавить ссылку на ФТ-5 в «Связанные требования»
   - ПТ-3: заменить ФТ-5 на ФТ-6 или ФТ-7 (profile attachment)
   - ПТ-5: добавить ФТ-10
   - ФТ-3: добавить ПТ-2
   - ФТ-8: добавить ПТ-1
   - ФТ-9: создать ПТ для support или удалить
   - ФТ-10: исправить «УТ-1» на существующий ID

### Желательные (не блокируют):

- Добавить таблицу акторов в «План демонстрации» (currently only PlantUML)
- Уточнить 7 `[УТОЧНИТЬ]` в «Общая информация» и «Ревью требований»

---

## Заключение

**Файл БФТ:** `.bft/documentation/issue-41/issue-41.md`

**Артефакты —** `.bft/documentation/issue-41/artefacts/`:
| Файл | Стадия |
|---|---|
| bft-context-pack.md | контекст |
| problem.md | диагноз As-Is/Gap |
| concept.md | концепты + дебаты + вердикт |
| po-statement.md | постановка заказчика |
| validation.md | hard gates + Светофор |

**Валидация:** 🔴 (2 блокирующих 🔴, Gates 7/16/16 violated).

**Перед разработкой закрыть:**
- Разрешить противоречие concept.md vs БТ-4/ПТ-3/ФТ-6/ФТ-7 (profile attachment in MVP vs SubIssue)
- Восстановить broken cascades (БТ-3, ПТ-3, ПТ-5, ФТ-3, ФТ-8, ФТ-9, ФТ-10)

---

> Validator: /bft-validate issue-41
> Next action: `/bft-draft issue-41` (исправить и пересдать)
