# Итог

1. **Точка входа — `src/server.mjs`**. Функция `app(req, res)` обрабатывает HTTP-запросы. Endpoint `/quote` (POST) вызывает `quote(body?.items)` из `pricing.mjs` [src/server.mjs:26-46].

2. **Вся арифметика в `src/pricing.mjs`**. Чистые функции без ввода-вывода: `subtotal`, `deliveryFee`, `quote`. Константы в начале файла: `DELIVERY_FEE = 300`, `FREE_DELIVERY_FROM = 3000` [src/pricing.mjs:1-52].

3. **Поток в `quote`**. Сначала считается `subtotal(items)`, затем `deliveryFee(goods)`, возвращается `{ goods, delivery, total }` [src/pricing.mjs:48-52].

4. **Валидации уже есть в `subtotal`**. Проверяет: массив не пуст → ошибка `заказ без позиций`, цена корректна, количество целое и > 0. Все валидации бросают `Error` [src/pricing.mjs:21-34].

5. **Ошибки превращаются в HTTP 400**. В `server.mjs` `catch` вокруг `quote()` ловит ошибки и возвращает `{ error: err.message }` с кодом 400 [src/server.mjs:42-45].

6. **Тесты в `tests/pricing.test.mjs`**. Используют `assert.throws(() => fn(), /regex/)` для проверок ошибок и `assert.deepEqual()` для позитивных кейсов [tests/pricing.test.mjs:1-52].

7. **Владелец кода — kibarik**. Все файлы (`src/server.mjs`, `src/pricing.mjs`, `tests/pricing.test.mjs`) имеют bus factor = 1, свежие изменения (2 дня назад).

8. **Проверка порога должна быть в `quote`**. После вызова `subtotal`, но до `deliveryFee` — стоимость доставки в проверку не входит по условию задачи.

9. **Сообщение об ошибке должно называть сумму нехватки**. Формат: `минимальная сумма заказа N, не хватает X` (пример из паттерна существующих ошибок).

# Открытые вопросы

1. **Какой порог минимальной суммы выбрать?** В задаче не указано, нужно согласовать значение.
2. **Нужно ли сделать порог конфигурируемым через переменную окружения?** Текущие константы захардкожены.

# Диалог

1. **Обзор репозитория** — `get_overoverview`. Получил структуру: 12 файлов, точка входа `src/server.mjs`, арифметика в `src/pricing.mjs`, тесты в `tests/pricing.test.mjs`. Константы `DELIVERY_FEE`, `FREE_DELIVERY_FROM` уже есть.

2. **Логика оформления заказа** — `get_context(src/server.mjs)`. Увидел `/quote` POST endpoint, который вызывает `quote(body?.items)` и ловит ошибки с возвратом HTTP 400.

3. **Детали арифметики** — `get_context(src/pricing.mjs)` + `get_symbol` для `deliveryFee` и `quote`. Выяснил: `subtotal` уже валидирует, `quote` считает сумму товаров и доставку, возвращает объект `{ goods, delivery, total }`.

4. **Паттерн тестов** — `get_context(tests/pricing.test.mjs)`. Увидел, как проверяются ошибки: `assert.throws(() => subtotal([]), /без позиций/)`.


---
session: rw-analysis-po-helper-org__poh-demo-checkout-74
workspace: product
turns: 7
started: 2026-08-20T07:06:10Z
finished: 2026-08-20T07:07:10Z
---

# Свежесть индекса

| репозиторий | SHA | возраст индекса |
|---|---|---|
| `poh-bft-writer` | `564c0ffc7131` | 33 мин |
| `poh-cortex` | `632d9de9eb90` | 33 мин |
| `poh-helper` | `18512c1e7ce9` | 33 мин |
| `poh-infra` | `4af96343b523` | 15 ч |
| `poh-issue-agents` | `559f77348a82` | 33 мин |
| `poh-memory-engine` | `194e39319b3f` | 33 мин |
| `poh-pr-agents` | `9f15ada9e4e9` | 33 мин |
| `poh-scheduller` | `04cc3f47aff9` | 33 мин |
| `poh-sprint-agents` | `c41cb5b2ce18` | 33 мин |
| `poh-demo-checkout` | `2e7c62aa955e` | 2 ч |

# Диалог

## Ход 1 · `get_overview` · product

**Запрос:**

```json
{
  "repo": "null",
  "include": [
    "content"
  ]
}
```

**Ответ:**

{
  "title": "Repository Overview: poh-demo-checkout",
  "content_md": "# Repository Overview: poh-demo-checkout\n\n**Files:** 12 | **Lines:** 1446\n\n## Project Summary\n\n\n`poh-demo-checkout` is a markdown codebase of 12 files. Execution starts at `src/server.mjs`.\n\n\n\n\n## Entry Points\nStart here when reading the codebase.\n\n\n- `src/server.mjs`\n\n\n\n\n## Primary Execution Flows\n\n- `src/server.mjs::app` (3 steps)\n\n\n\n\n\n\n## Most Central Files\nRanked by PageRank over the import graph: the files most of the codebase ultimately depends on.\n\n- `src/pricing.mjs` (0.1023)\n\n- `.github/workflows/ci.yml` (0.0599)\n\n- `.github/workflows/openhands-resolver.yml` (0.0599)\n\n- `.github/workflows/pr-review.yml` (0.0599)\n\n- `.openhands/task-rules.md` (0.0599)\n\n- `AGENTS.md` (0.0599)\n\n- `CLAUDE.md` (0.0599)\n\n- `DEMO.md` (0.0599)\n\n- `README.md` (0.0599)\n\n- `package.json` (0.0599)\n\n- `src/server.mjs` (0.0599)\n\n- `tests/pricing.test.mjs` (0.0599)\n\n\n\n\n\n\n\n\n\n## Codebase health signals\n- **Hotspots:** 0 files are both high-churn and high-complexity\n- **Stable core:** 0 files unchanged in 90+ days\n- **Most changed (90d):** `src/pricing.mjs`, `src/server.mjs`, `tests/pricing.test.mjs`\n- **Oldest file:** `src/pricing.mjs` (2 days)\n\n\n---\n\n*Built from the code's structure. It states what is there, not why it is that\nway. Add an API key and run `repowise generate` to have that written.*\n\n## Architecture map\n\n```mermaid\nflowchart LR\n  subgraph layer_application[\"Application\"]\n    direction TB\n    module_application[\"Application\"]\n  end\n  subgraph layer_config[\"Config\"]\n    direction TB\n    module_config[\"Config\"]\n  end\n\n```\n",
  "code_health": {
    "average_health": 10.0,
    "band": "healthy",
    "hotspot_health": null,
    "worst_performer_path": ".github/workflows/ci.yml",
    "worst_performer_score": 10.0,
    "open_findings": 0,
    "file_count": 12,
    "distribution": {
      "total_files": 12,
      "total_nloc": 853,
      "bands": {
        "healthy": {
          "files": 12,
          "nloc": 853,
          "pct": 100.0
        },
        "warning": {
          "files": 0,
          "nloc": 0,
          "pct": 0.0
        },
        "alert": {
          "files": 0,
          "nloc": 0,
          "pct": 0.0
        }
      }
    }
  },
  "key_modules": [
    {
      "name": "Application Src",
      "path": "src",
      "description": "`src`\n\n**Language:** javascript | **Files:** 2 | **Public symbols:** 6 / 9\n\n\nCovers the 2 source files in src. Does not cover code outside those directories, which is documented on its own…",
      "page_id": "module_page:src",
      "section": "2",
      "parent_page_id": "repo_overview:poh-demo-checkout"
    }
  ],
  "entry_points": [
    "src/server.mjs"
  ],
  "git_health": {
    "files_git_attributed": 3,
    "hotspot_count": 0,
    "avg_bus_factor": 1.0,
    "files_with_bus_factor_1": 3,
    "churn_trend": "increasing",
    "top_churn_modules": [
      "src/pricing.mjs",
      "src/server.mjs",
      "tests/pricing.test.mjs"
    ]
  },
  "knowledge_map": {
    "top_owners": [
      {
        "name": "kibarik",
        "files_owned": 3,
        "percentage": 100.0
      }
    ]
  },
  "community_summary": [
    {
      "id": 0,
      "label": "external:node:http",
      "size": 3
    },
    {
      "id": 1,
      "label": "workflows",
      "size": 1
    },
    {
      "id": 2,
      "label": "workflows (1)",
      "size": 1
    },
    {
      "id": 3,
      "label": "workflows (1)",
      "size": 1
    },
    {
      "id": 4,
      "label": "task-rules",
      "size": 1
    },
    {
      "id": 5,
      "label": "agents",
      "size": 1
    },
    {
      "id": 6,
      "label": "claude",
      "size": 1
    },
    {
      "id": 7,
      "label": "demo",
      "size": 1
    },
    {
      "id": 8,
      "label": "readme",
      "size": 1
    },
    {
      "id": 9,
      "label": "external:node:assert",
      "size": 1
    }
  ],
  "outline": {
    "root": {
      "page_id": "repo_overview:poh-demo-checkout",
      "title": "Repository Overview: poh-demo-checkout"
    },
    "total_pages": 6,
    "sections": [
      {
        "section": "1",
        "page_id": "onboarding:onboarding/how_it_works",
        "title": "How It Works",
        "page_type": "onboarding",
        "target_path": "onboarding/how_it_works"
      },
      {
        "section": "2",
        "page_id": "module_page:src",
        "title": "Application Src",
        "page_type": "module_page",
        "target_path": "src",
        "descendants": 3
      }
    ]
  },
  "outline_hint": "The stored page tree — the same outline the web app and the editor extension render. Every 'section' in this response indexes into it, and 'descendants' is how much sits below an entry. Top rung only by default; call get_overview(include=[\"outline\"]) for one level deeper, then get_context on an entry's target_path to read it.",
  "architecture": {
    "layers": [
      {
        "name": "Application",
        "description": "",
        "file_count": 7
      },
      {
        "name": "Config",
        "description": "",
        "file_count": 4
      },
      {
        "name": "Test",
        "description": "",
        "file_count": 1
      }
    ],
    "tour_available": true,
    "tour_step_count": 4,
    "layer_order": [
      "Application"
    ]
  },
  "reading_order": [
    {
      "order": 1,
      "slot": "project_overview",
      "title": "Repository Overview: poh-demo-checkout",
      "page_id": "repo_overview:poh-demo-checkout",
      "target_path": "poh-demo-checkout",
      "section": null
    },
    {
      "order": 2,
      "slot": "how_it_works",
      "title": "How It Works",
      "page_id": "onboarding:onboarding/how_it_works",
      "target_path": "onboarding/how_it_works",
      "section": "1"
    }
  ],
  "reading_order_hint": "Canonical onboarding sequence — read these page_ids in order via get_context/get_symbol to understand the repo the way a new contributor would.",
  "guided_tour": [
    {
      "order": 1,
      "title": "README.md",
      "kind": "overview",
      "reason": "Start here for the end-to-end picture before diving into the code.",
      "target_path": "README.md",
      "page_id": "repo_overview:README.md",
      "section": null
    },
    {
      "order": 2,
      "title": "server.mjs",
      "kind": "code",
      "reason": "An entry point — execution and imports fan out from here.",
      "target_path": "src/server.mjs",
      "page_id": "file_page:src/server.mjs",
      "section": "2.2"
    },
    {
      "order": 3,
      "title": "pricing.mjs",
      "kind": "code",
      "reason": "Directly used by the entry points above; a core collaborator.",
      "target_path": "src/pricing.mjs",
      "page_id": "file_page:src/pricing.mjs",
      "section": "2.1"
    },
    {
      "order": 4,
      "title": "pricing.test.mjs",
      "kind": "code",
      "reason": "The test suite — how the system's behavior is verified.",
      "target_path": "tests/pricing.test.mjs",
      "page_id": "file_page:tests/pricing.test.mjs",
      "section": null
    }
  ],
  "guided_tour_hint": "Topology-ordered walk of the codebase: read these page_ids in order — entry points first, then the files they import, with infrastructure last. Each step builds on the previous.",
  "tool_guide": {
    "first_call": "get_answer for any how/where/why question; trust confidence=high directly (it is content-grounded).",
    "reading_code": "get_context(include=[\"skeleton\"]) for a whole file verified, or just Read it. get_symbol only for an id a response already gave you — never file-by-signature.",
    "recipes": [
      "get_answer low confidence → Read best_guesses[0].file",
      "get_context hotspot: true → get_risk before editing",
      "get_context decision_records → get_why(targets=[...]) for rationale",
      "PR review → get_risk(targets, changed_files) and read directive first",
      "search_codebase(query) auto-routes: identifier → symbol hits (pipe symbol_id into get_symbol), path → files (get_context), prose → wiki search. Force with mode=symbol|path|concept|hybrid."
    ],
    "reread_triggers": "Only re-read source on bounds: approximate, stale_warning in _meta, or a search hit whose sources are [fts] only (keyword match, no semantic agreement)."
  },
  "_meta": {
    "index_age_days": 0,
    "indexed_commit": "2e7c62aa955e",
    "index_behind": false,
    "embedder": "mock",
    "embedder_degraded": false,
    "semantic_search": false
  }
}

## Ход 2 · `get_answer` · product

**Запрос:**

```json
{
  "question": "Where is the order checkout/checkout logic handled? Which file processes order requests?",
  "repo": "null"
}
```

**Ответ:**

{
  "answer": "No synthesized prose (no-llm-provider), but retrieval succeeded and this payload is usable: 5 ranked hits in `retrieval`, the files to open in `fallback_targets`, and the wider ranked shortlist in `candidates`. Read those rather than starting a fresh search.",
  "citations": [],
  "confidence": "low",
  "retrieval_quality": "weak",
  "degraded": "no-llm-provider",
  "fallback_targets": [
    "src/pricing.mjs",
    "onboarding/how_it_works",
    "src/server.mjs"
  ],
  "retrieval": [
    {
      "path": "src/pricing.mjs",
      "title": "File: src/pricing.mjs",
      "summary": "`src/pricing.mjs` is a javascript source file in the Application layer.",
      "snippet": "# src/pricing.mjs\n\n## Overview\n\n`src/pricing.mjs` is a javascript source file in the Application layer.\n\nIt exposes 5 public symbols.\n\n## Public API\n\n| Symbol | Kind | Signature |\n| --- | --- | --- |",
      "excerpt": "# src/pricing.mjs\n\n## Overview\n\n`src/pricing.mjs` is a javascript source file in the Application layer.\n\nIt exposes 5 public symbols.\n\n## Public API\n\n| Symbol | Kind | Signature |\n| --- | --- | --- |\n| `DELIVERY_FEE` | constant | DELIVERY_FEE = 300 |\n| `FREE_DELIVERY_FROM` | constant | FREE_DELIVERY_FROM = 3000 |\n| `subtotal` | function | function subtotal(items) |\n| `deliveryFee` | function | function deliveryFee(amount) |\n| `quote` | function | function quote(items) |\n\n## Used by\n\nImported by 2 files in this repository.\n\n- `src/server.mjs`\n- `tests/pricing.test.mjs`\n\n## Usage Notes\n\n**Layer:** Application | **Role:** internal\n\n## Questions this page answers\n\n- What does `src/pricing.mjs` export?\n- Where is `DELIVERY_FEE` defined?\n- What imports `src/pricing.mjs`?\n\n## In the code\n\nзаказ без позиций Расчёт стоимости заказа. Чистые функции без ввода-вывода: цена — то, что проверяется тестом построчно, и подмешивать сюда сеть значило бы проверять вместе с ней. Порог бесплатной доставки. Заказ ровно на пороге доставку уже не платит: «от 3000» в тексте оферты означает включительно, и расхождение здесь стоило бы дороже, чем читается. export const delivery fee free from typedef sku string price number qty item param items function subtotal array length throw new error return reduce sum finite integer amount quote goods total\n\n---\n\n*Built from the code itself: parsed symbols, the import graph, git history and\nthe knowledge graph. Every statement here is checked against the source ra",
      "score": 2.089,
      "key_symbols": [
        {
          "name": "DELIVERY_FEE",
          "kind": "constant",
          "signature": "DELIVERY_FEE = 300",
          "docstring": "",
          "start_line": 5,
          "end_line": 5
        },
        {
          "name": "FREE_DELIVERY_FROM",
          "kind": "constant",
          "signature": "FREE_DELIVERY_FROM = 3000",
          "docstring": "",
          "start_line": 10,
          "end_line": 10
        },
        {
          "name": "subtotal",
          "kind": "function",
          "signature": "export function subtotal(items) {",
          "docstring": "",
          "start_line": 21,
          "end_line": 34
        },
        {
          "name": "deliveryFee",
          "kind": "function",
          "signature": "export function deliveryFee(amount) {",
          "docstring": "",
          "start_line": 40,
          "end_line": 42
        },
        {
          "name": "quote",
          "kind": "function",
          "signature": "export function quote(items) {",
          "docstring": "",
          "start_line": 48,
          "end_line": 52
        }
      ]
    },
    {
      "path": "onboarding/how_it_works",
      "title": "How It Works",
      "summary": "Traced from the entry points outward: which files each run touches, in order. What happens at each hop is not derivable from the call graph, so this page shows the shape of execution rather than the behaviour.",
      "snippet": "# How It Works\n\nTraced from the entry points outward: which files each run touches, in order. What happens at each hop is not derivable from the call graph, so this page shows the shape of execution r",
      "excerpt": "# How It Works\n\nTraced from the entry points outward: which files each run touches, in order. What happens at each hop is not derivable from the call graph, so this page shows the shape of execution rather than the behaviour.\n\n## Shape`poh-demo-checkout` looks like a **module**, based on:\n\n- no service / CLI / library signal — treating as module collection\n\n\n\n\n## Entry points\n\n- `src/server.mjs`\n\n\n\n\n## Traced flows\n\n\n\n\n### From `src/server.mjs::app`\n\n\n\n1. `src/server.mjs::app`\n\n2. `src/pricing.mjs::quote`\n\n3. `src/pricing.mjs::subtotal`\n\n\n\n\n\n\n## Reading order\n\nThe guided tour walks these in sequence.\n\n1. README.md. Start here for the end-to-end picture before diving into the code.\n   - `README.md`\n\n\n2. server.mjs. An entry point — execution and imports fan out from here.\n   - `src/server.mjs`\n\n\n3. pricing.mjs. Directly used by the entry points above; a core collaborator.\n   - `src/pricing.mjs`\n\n\n4. pricing.test.mjs. The test suite — how the system's behavior is verified.\n   - `tests/pricing.test.mjs`\n\n\n\n---\n\n*Built from the code's structure. It states what is there, not why it is that\nway. Add an API key and run `repowise generate` to have that written.*",
      "score": 1.929
    },
    {
      "path": "src/server.mjs",
      "title": "File: src/server.mjs",
      "summary": "`src/server.mjs` is a javascript entry-point source file in the Application layer.",
      "snippet": "# src/server.mjs\n\n## Overview\n\n`src/server.mjs` is a javascript entry-point source file in the Application layer.\n\nIt exposes 1 public symbol and depends on 1 other file.\n\n## Public API\n\n| Symbol | Ki",
      "excerpt": "# src/server.mjs\n\n## Overview\n\n`src/server.mjs` is a javascript entry-point source file in the Application layer.\n\nIt exposes 1 public symbol and depends on 1 other file.\n\n## Public API\n\n| Symbol | Kind | Signature |\n| --- | --- | --- |\n| `app` | function | app(req, res) |\n\n## Depends on\n\n- `src/pricing.mjs`\n\n## Usage Notes\n\n**Layer:** Application | **Role:** entry_point\n\n## Questions this page answers\n\n- What does `src/server.mjs` export?\n- Where is `app` defined?\n- What does `src/server.mjs` depend on?\n\n## In the code\n\nbody node:http ./pricing.mjs content-type application/json; charset=utf-8 content-length utf8 /healthz /quote POST тело запроса не разобралось как JSON не найдено HTTP-обёртка вокруг расчёта. Тонкая намеренно: вся арифметика в pricing.mjs и проверяется без сети, здесь остаётся только разбор запроса и коды ответов. Битый JSON — ошибка запроса, а не сервера: 500 здесь увёл бы разбор в логи сервиса вместо ответа клиенту. Запуск только при прямом вызове: тест импортирует `app` и поднимать порт ради этого не должен. http pricing mjs import create server from node quote const port number process env function send res code payload json stringify write head content type application charset utf length buffer byte end async read req chunks for await chunk push return null parse concat string export app url healthz true method let try catch error items err message meta file argv listen console log checkout\n\n---\n\n*Built from the code itself: parsed symbols, the import gr",
      "score": 1.919,
      "key_symbols": [
        {
          "name": "PORT",
          "kind": "constant",
          "signature": "PORT = Number(process.env.PORT || 8080)",
          "docstring": "",
          "start_line": 8,
          "end_line": 8,
          "source_excerpt": "const PORT = Number(process.env.PORT || 8080);"
        },
        {
          "name": "send",
          "kind": "function",
          "signature": "function send(res, code, body) {",
          "docstring": "",
          "start_line": 10,
          "end_line": 17
        },
        {
          "name": "readJson",
          "kind": "function",
          "signature": "async function readJson(req) {",
          "docstring": "",
          "start_line": 19,
          "end_line": 24
        },
        {
          "name": "app",
          "kind": "function",
          "signature": "export const app = async (req, res) => {",
          "docstring": "",
          "start_line": 26,
          "end_line": 46
        }
      ]
    },
    {
      "path": "poh-demo-checkout",
      "title": "Repository Overview: poh-demo-checkout",
      "summary": "`poh-demo-checkout` is a markdown codebase of 12 files. Execution starts at `src/server.mjs`.",
      "snippet": "# Repository Overview: poh-demo-checkout\n\n**Files:** 12 | **Lines:** 1446\n\n## Project Summary\n\n\n`poh-demo-checkout` is a markdown codebase of 12 files. Execution starts at `src/server.mjs`.\n\n\n\n\n## Ent",
      "excerpt": "# Repository Overview: poh-demo-checkout\n\n**Files:** 12 | **Lines:** 1446\n\n## Project Summary\n\n\n`poh-demo-checkout` is a markdown codebase of 12 files. Execution starts at `src/server.mjs`.\n\n\n\n\n## Entry Points\nStart here when reading the codebase.\n\n\n- `src/server.mjs`\n\n\n\n\n## Primary Execution Flows\n\n- `src/server.mjs::app` (3 steps)\n\n\n\n\n\n\n## Most Central Files\nRanked by PageRank over the import graph: the files most of the codebase ultimately depends on.\n\n- `src/pricing.mjs` (0.1023)\n\n- `.github/workflows/ci.yml` (0.0599)\n\n- `.github/workflows/openhands-resolver.yml` (0.0599)\n\n- `.github/workflows/pr-review.yml` (0.0599)\n\n- `.openhands/task-rules.md` (0.0599)\n\n- `AGENTS.md` (0.0599)\n\n- `CLAUDE.md` (0.0599)\n\n- `DEMO.md` (0.0599)\n\n- `README.md` (0.0599)\n\n- `package.json` (0.0599)\n\n- `src/server.mjs` (0.0599)\n\n- `tests/pricing.test.mjs` (0.0599)\n\n\n\n\n\n\n\n\n\n## Codebase health signals\n- **Hotspots:** 0 files are both high-churn and high-complexity\n- **Stable core:** 0 files unchanged in 90+ days\n- **Most changed (90d):** `src/pricing.mjs`, `src/server.mjs`, `tests/pricing.test.mjs`\n- **Oldest file:** `src/pricing.mjs` (2 days)\n\n\n---\n\n*Built from the code's structure. It states what is there, not why it is that\nway. Add an API key and run `repowise generate` to have that written.*\n\n## Architecture map\n\n```mermaid\nflowchart LR\n  subgraph layer_application[\"Application\"]\n    direction TB\n    module_application[\"Application\"]\n  end\n  subgraph layer_config[\"Config\"]\n    direction TB\n    ",
      "score": 1.866
    },
    {
      "path": "src",
      "title": "Application Src",
      "summary": "`src`",
      "snippet": "# Application Src\n\n`src`\n\n**Language:** javascript | **Files:** 2 | **Public symbols:** 6 / 9\n\n\nCovers the 2 source files in src. Does not cover code outside those directories, which is documented on",
      "excerpt": "# Application Src\n\n`src`\n\n**Language:** javascript | **Files:** 2 | **Public symbols:** 6 / 9\n\n\nCovers the 2 source files in src. Does not cover code outside those directories, which is documented on its own pages.\n\n\n\n\n## Overview\n\nApplication Src covers 2 javascript files across 1 directory, exposing 6 public symbols. It hosts 1 entry point into this subsystem; sits centrally in the import graph (mean PageRank 0.0811); is imported by 1 other module.\n\n\n## Entry Points\n\n- `src/server.mjs`\n\n\n\n## Files\n\nHighest-PageRank first: the order to read them in.\n\n- `src/pricing.mjs`: `src/pricing.mjs` is a javascript source file in the Application layer. It exposes 5 public symbols.\n\n- `src/server.mjs` *(entry point)*: `src/server.mjs` is a javascript entry-point source file in the Application layer. It exposes 1 public symbol and depends on 1 other file.\n\n\n\n\n\n\n\n\n\n\n## Dependents (modules that import this)\n\n- `tests/pricing.test.mjs`\n\n\n\n\n\n\n## Ownership\n\n- **kibarik**: primary maintainer of 2 files\n\n\n\n\n## Subsystem health\n\n- 2 files with a bus factor of one (single-maintainer risk)\n\n\n\n\n\n\n## Recent activity\nMost active file: `src/pricing.mjs` (1 commits in the last 90 days).\n\n\n## Questions this page answers\n- What does Application Src do, and where does it sit in the system?\n- Which files make up Application Src (under `src`)?\n- What are the entry points into Application Src?\n- What relies on Application Src?\n---\n\n*Built from the code's structure. It states what is there, not why it is that",
      "score": 1.686
    }
  ],
  "note": "DEGRADED: no LLM provider configured (set REPOWISE_PROVIDER + API key). Synthesis is what is missing here, not retrieval.",
  "best_guesses": [
    {
      "file": "src/pricing.mjs",
      "why_relevant": "`src/pricing.mjs` is a javascript source file in the Application layer..",
      "score": 2.089
    },
    {
      "file": "src/server.mjs",
      "why_relevant": "`src/server.mjs` is a javascript entry-point source file in the Application layer..",
      "score": 1.919
    }
  ],
  "_meta": {
    "timing_ms": 204.8,
    "hint": "No synthesis, and retrieval was weak. Refine the query with search_codebase rather than reading these files in order.",
    "index_age_days": 0,
    "indexed_commit": "2e7c62aa955e",
    "index_behind": false,
    "embedder": "mock",
    "embedder_degraded": false,
    "semantic_search": false,
    "degraded": "no-llm-provider"
  },
  "candidates": [
    {
      "path": "src/pricing.mjs",
      "lines": "5-52",
      "defines": "subtotal:21, deliveryFee:40, quote:48, DELIVERY_FEE:5, FREE_DELIVERY_FROM:10"
    },
    {
      "path": "src/server.mjs",
      "lines": "8-46",
      "defines": "send:10, readJson:19, app:26, PORT:8"
    }
  ]
}

## Ход 3 · `get_context` · product

**Запрос:**

```json
{
  "targets": [
    "src/server.mjs"
  ],
  "include": [
    "skeleton",
    "ownership",
    "last_change"
  ],
  "repo": "null"
}
```

**Ответ:**

{
  "targets": {
    "src/server.mjs": {
      "target": "src/server.mjs",
      "type": "file",
      "parent_page": {
        "title": "Application Src",
        "target_path": "src",
        "section": "2"
      },
      "docs": {
        "title": "File: src/server.mjs",
        "summary": "`src/server.mjs` is a javascript entry-point source file in the Application layer."
      },
      "hotspot": false,
      "ownership": {
        "primary_owner": "kibarik",
        "owner_pct": 1.0,
        "contributor_count": 1,
        "bus_factor": 1
      },
      "last_change": {
        "date": "2026-08-17T18:58:41",
        "author": "kibarik",
        "days_ago": 2
      },
      "freshness": {
        "confidence_score": 1.0,
        "freshness_status": "fresh",
        "is_stale": false
      },
      "architectural_layer": {
        "name": "Application",
        "description": "",
        "role": "entry_point"
      },
      "skeleton": {
        "mode": "smart",
        "tokens": 348,
        "full_tokens": 406,
        "pct_of_full": 85.7,
        "bodies_kept": [
          "send",
          "readJson",
          "app"
        ],
        "text": "// HTTP-обёртка вокруг расчёта. Тонкая намеренно: вся арифметика в pricing.mjs\n// и проверяется без сети, здесь остаётся только разбор запроса и коды ответов.\n\nimport { createServer } from 'node:http';\n\nimport { quote } from './pricing.mjs';\n\nconst PORT = Number(process.env.PORT || 8080);\n\nfunction send(res, code, body) {\n  const payload = JSON.stringify(body);\n  res.writeHead(code, {\n    'content-type': 'application/json; charset=utf-8',\n    'content-length': Buffer.byteLength(payload),\n  });\n  res.end(payload);\n}\n\nasync function readJson(req) {\n  const chunks = [];\n  for await (const chunk of req) chunks.push(chunk);\n  if (chunks.length === 0) return null;\n  return JSON.parse(Buffer.concat(chunks).toString('utf8'));\n}\n\nexport const app = async (req, res) => {\n  if (req.url === '/healthz') return send(res, 200, { ok: true });\n\n  if (req.url === '/quote' && req.method === 'POST') {\n    let body;\n    try {\n      body = await readJson(req);\n    } catch {\n      // Битый JSON — ошибка запроса, а не сервера: 500 здесь увёл бы разбор в\n      // логи сервиса вместо ответа клиенту.\n      return send(res, 400, { error: 'тело запроса не разобралось как JSON' });\n    }\n    try {\n      return send(res, 200, quote(body?.items));\n    } catch (err) {\n      return send(res, 400, { error: err.message });\n    }\n  }\n\n  return send(res, 404, { error: 'не найдено' });\n};\n... 8 lines (47-54)\n",
        "verified": true,
        "mostly_full": true,
        "note": "Skeleton is 85.7% of the full file — a direct Read costs little more."
      }
    }
  },
  "_meta": {
    "timing_ms": 51.89,
    "index_age_days": 0,
    "indexed_commit": "2e7c62aa955e",
    "index_behind": false,
    "embedder": "mock",
    "embedder_degraded": false,
    "semantic_search": false
  }
}

## Ход 4 · `get_context` · product

**Запрос:**

```json
{
  "targets": [
    "src/pricing.mjs"
  ],
  "include": [
    "skeleton",
    "ownership",
    "last_change"
  ],
  "repo": "null"
}
```

**Ответ:**

{
  "targets": {
    "src/pricing.mjs": {
      "target": "src/pricing.mjs",
      "type": "file",
      "parent_page": {
        "title": "Application Src",
        "target_path": "src",
        "section": "2"
      },
      "docs": {
        "title": "File: src/pricing.mjs",
        "summary": "`src/pricing.mjs` is a javascript source file in the Application layer."
      },
      "hotspot": false,
      "ownership": {
        "primary_owner": "kibarik",
        "owner_pct": 1.0,
        "contributor_count": 1,
        "bus_factor": 1
      },
      "last_change": {
        "date": "2026-08-17T18:58:41",
        "author": "kibarik",
        "days_ago": 2
      },
      "freshness": {
        "confidence_score": 1.0,
        "freshness_status": "fresh",
        "is_stale": false
      },
      "architectural_layer": {
        "name": "Application",
        "description": "",
        "role": "edge_connector"
      },
      "skeleton": {
        "mode": "smart",
        "tokens": 267,
        "full_tokens": 381,
        "pct_of_full": 70.1,
        "bodies_kept": [
          "subtotal"
        ],
        "text": "// Расчёт стоимости заказа. Чистые функции без ввода-вывода: цена — то, что\n// проверяется тестом построчно, и подмешивать сюда сеть значило бы проверять\n// вместе с ней.\n\nexport const DELIVERY_FEE = 300;\n\n// Порог бесплатной доставки. Заказ ровно на пороге доставку уже не платит:\n// «от 3000» в тексте оферты означает включительно, и расхождение здесь стоило\n// бы дороже, чем читается.\nexport const FREE_DELIVERY_FROM = 3000;\n... 10 lines (11-20)\nexport function subtotal(items) {\n  if (!Array.isArray(items) || items.length === 0) {\n    throw new Error('заказ без позиций');\n  }\n  return items.reduce((sum, item) => {\n    if (!Number.isFinite(item.price) || item.price < 0) {\n      throw new Error(`некорректная цена в позиции ${item.sku}`);\n    }\n    if (!Number.isInteger(item.qty) || item.qty <= 0) {\n      throw new Error(`некорректное количество в позиции ${item.sku}`);\n    }\n    return sum + item.price * item.qty;\n  }, 0);\n}\n... 5 lines (35-39)\nexport function deliveryFee(amount) {\n  ... 7 lines (41-47)\nexport function quote(items) {\n  ... 4 lines (49-52)\n",
        "verified": true,
        "mostly_full": true,
        "note": "Skeleton is 70.1% of the full file — a direct Read costs little more."
      }
    }
  },
  "_meta": {
    "timing_ms": 41.29,
    "index_age_days": 0,
    "indexed_commit": "2e7c62aa955e",
    "index_behind": false,
    "embedder": "mock",
    "embedder_degraded": false,
    "semantic_search": false
  }
}

## Ход 5 · `get_symbol` · product

**Запрос:**

```json
{
  "symbol_id": "src/pricing.mjs::deliveryFee",
  "repo": "null"
}
```

**Ответ:**

{
  "symbol_id": "src/pricing.mjs::deliveryFee",
  "file": "src/pricing.mjs",
  "name": "deliveryFee",
  "kind": "function",
  "qualified_name": "src.pricing.deliveryFee",
  "signature": "function deliveryFee(amount)",
  "language": "javascript",
  "start_line": 40,
  "end_line": 42,
  "symbol_start_line": 40,
  "symbol_end_line": 42,
  "source": "    40\texport function deliveryFee(amount) {\n    41\t  return amount >= FREE_DELIVERY_FROM ? 0 : DELIVERY_FEE;\n    42\t}",
  "truncated": false,
  "verified": true,
  "_meta": {
    "timing_ms": 10.2,
    "index_age_days": 0,
    "indexed_commit": "2e7c62aa955e",
    "index_behind": false,
    "embedder": "mock",
    "embedder_degraded": false,
    "semantic_search": false,
    "replaced_tokens": 381
  }
}

## Ход 6 · `get_symbol` · product

**Запрос:**

```json
{
  "repo": "null",
  "symbol_id": "src/pricing.mjs::quote"
}
```

**Ответ:**

{
  "symbol_id": "src/pricing.mjs::quote",
  "file": "src/pricing.mjs",
  "name": "quote",
  "kind": "function",
  "qualified_name": "src.pricing.quote",
  "signature": "function quote(items)",
  "language": "javascript",
  "start_line": 48,
  "end_line": 52,
  "symbol_start_line": 48,
  "symbol_end_line": 52,
  "source": "    48\texport function quote(items) {\n    49\t  const goods = subtotal(items);\n    50\t  const delivery = deliveryFee(goods);\n    51\t  return { goods, delivery, total: goods + delivery };\n    52\t}",
  "truncated": false,
  "verified": true,
  "_meta": {
    "timing_ms": 20.04,
    "index_age_days": 0,
    "indexed_commit": "2e7c62aa955e",
    "index_behind": false,
    "embedder": "mock",
    "embedder_degraded": false,
    "semantic_search": false,
    "replaced_tokens": 381
  }
}

## Ход 7 · `get_context` · product

**Запрос:**

```json
{
  "include": [
    "skeleton",
    "ownership"
  ],
  "repo": "null",
  "targets": [
    "tests/pricing.test.mjs"
  ]
}
```

**Ответ:**

{
  "targets": {
    "tests/pricing.test.mjs": {
      "target": "tests/pricing.test.mjs",
      "type": "file",
      "docs": {
        "summary": "pricing.test.mjs: 52 lines, no indexed symbols.",
        "file_preview": {
          "lines": 52,
          "chars": 1424,
          "head": [
            "import assert from 'node:assert/strict';",
            "import { test } from 'node:test';",
            "import {",
            "  DELIVERY_FEE,",
            "  FREE_DELIVERY_FROM,",
            "  deliveryFee,",
            "  quote,",
            "  subtotal,",
            "} from '../src/pricing.mjs';",
            "test('сумма позиций считается по количеству, а не по числу строк', () => {",
            "  assert.equal(subtotal([{ sku: 'a', price: 500, qty: 3 }]), 1500);",
            "});",
            "test('заказ без позиций — ошибка, а не ноль', () => {",
            "  // Ноль прошёл бы дальше как валидный заказ на 300 рублей доставки.",
            "  assert.throws(() => subtotal([]), /без позиций/);"
          ],
          "note": "This file has no indexed symbols, so there is no structural card for it. The fields above are counts and verbatim excerpts. Read the file for its full content."
        }
      },
      "hotspot": false,
      "ownership": {
        "primary_owner": "kibarik",
        "owner_pct": 1.0,
        "contributor_count": 1,
        "bus_factor": 1
      },
      "freshness": {
        "confidence_score": null,
        "freshness_status": null,
        "is_stale": null
      },
      "architectural_layer": {
        "name": "Test",
        "description": "",
        "role": "entry_point"
      },
      "skeleton": {
        "mode": "raw",
        "tokens": 356,
        "full_tokens": 356,
        "pct_of_full": 100.0,
        "bodies_kept": [],
        "text": "import assert from 'node:assert/strict';\nimport { test } from 'node:test';\n\nimport {\n  DELIVERY_FEE,\n  FREE_DELIVERY_FROM,\n  deliveryFee,\n  quote,\n  subtotal,\n} from '../src/pricing.mjs';\n\ntest('сумма позиций считается по количеству, а не по числу строк', () => {\n  assert.equal(subtotal([{ sku: 'a', price: 500, qty: 3 }]), 1500);\n});\n\ntest('заказ без позиций — ошибка, а не ноль', () => {\n  // Ноль прошёл бы дальше как валидный заказ на 300 рублей доставки.\n  assert.throws(() => subtotal([]), /без позиций/);\n});\n\ntest('отрицательная цена не проходит', () => {\n  assert.throws(() => subtotal([{ sku: 'a', price: -1, qty: 1 }]), /цена/);\n});\n\ntest('дробное количество не проходит', () => {\n  assert.throws(() => subtotal([{ sku: 'a', price: 100, qty: 1.5 }]), /количество/);\n});\n\ntest('доставка платная ниже порога', () => {\n  assert.equal(deliveryFee(FREE_DELIVERY_FROM - 1), DELIVERY_FEE);\n});\n\ntest('на пороге доставка уже бесплатна', () => {\n  // «от 3000» в оферте означает включительно.\n  assert.equal(deliveryFee(FREE_DELIVERY_FROM), 0);\n});\n\ntest('итог складывает товары и доставку', () => {\n  assert.deepEqual(quote([{ sku: 'a', price: 1000, qty: 1 }]), {\n    goods: 1000,\n    delivery: DELIVERY_FEE,\n    total: 1300,\n  });\n});\n\ntest('крупный заказ едет без платы за доставку', () => {\n  assert.deepEqual(quote([{ sku: 'a', price: 3500, qty: 1 }]), {\n    goods: 3500,\n    delivery: 0,\n    total: 3500,\n  });\n});\n",
        "verified": true,
        "note": "No usable symbol bounds for this file — returned source as-is."
      }
    }
  },
  "_meta": {
    "timing_ms": 62.2,
    "index_age_days": 0,
    "indexed_commit": "2e7c62aa955e",
    "index_behind": false,
    "embedder": "mock",
    "embedder_degraded": false,
    "semantic_search": false
  }
}
