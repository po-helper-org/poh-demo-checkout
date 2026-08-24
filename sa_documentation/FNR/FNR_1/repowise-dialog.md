# Итог

1. **Структура `src/server.mjs`** ([src/server.mjs:1-54](src/server.mjs:1-54)): простой HTTP-сервер с ручной маршрутизацией через `req.url` и `req.method`. Есть вспомогательная функция `send(res, code, body)` для отправки JSON с `Content-Type: application/json`.

2. **Существующие эндпоинты** ([src/server.mjs:38-50](src/server.mjs:38-50)):
   - `GET /healthz` — возвращает `{ok: true}`
   - `POST /quote` — принимает JSON, возвращает расчёт стоимости
   - fallback — 404 с `{error: "не найдено"}`

3. **Значения из `package.json`** ([package.json:2-3](package.json:2-3)):
   - `name: "poh-demo-checkout"`
   - `version: "0.1.0"`

4. **Паттерны тестирования** ([tests/pricing.test.mjs:1-52](tests/pricing.test.mjs:1-52)): используется `node:test` с `assert/strict`. Сейчас есть только unit-тесты для `pricing.mjs`. Интеграционных тестов для HTTP-слоя нет.

5. **Чтение JSON**: в коде нет паттернов чтения JSON-файлов — нужен стандартный Node.js `fs.readFile` + `JSON.parse`.

6. **Риск правки `server.mjs`**: hotspot score 67%, trend increasing, но health=10. Bus factor=1 (kibarik). Есть тестовый разрыв (`test_gap: true`) — слой HTTP не покрыт тестами.

7. **Место для нового теста**: нужен новый файл `tests/version.test.mjs` (или аналогичный) с интеграционным тестом, делающим реальный HTTP-запрос к `/version`.

8. **Изменения в коде**: добавить обработчик `if (req.url === '/version')` в `app()`, прочитать `package.json` при старте сервера или по запросу, вернуть `{name, version}`.

# Открытые вопросы

Нет открытых вопросов — для реализации задачи достаточно собранного контекста.

# Диалог

1. **get_overview** — получен обзор репозитория: 12 файлов, точка входа `src/server.mjs`, код здоровый, хотспотов нет.

2. **get_context(src/server.mjs)** — получена структура файла: HTTP-сервер с маршрутизацией через `req.url`, функции `send()` и `readJson()`, уже есть `/healthz` и `/quote`.

3. **get_context(package.json)** — получены значения полей: `name: "poh-demo-checkout"`, `version: "0.1.0"`.

4. **get_context(tests/pricing.test.mjs)** — изучен паттерн тестов: `node:test` с `assert/strict`, только unit-тесты для расчёта стоимости, без HTTP-интеграционных тестов.

5. **get_risk(src/server.mjs)** — оценка риска: hotspot score 67%, файл активный, но здоровый, есть тестовый разрыв.

6. **search_codebase("import JSON file read fs")** — поиск паттернов чтения JSON не дал результатов, паттернов в коде нет.


---
session: rw-analysis-po-helper-org__poh-demo-checkout-105
workspace: product
turns: 6
started: 2026-08-24T15:31:54Z
finished: 2026-08-24T15:32:09Z
---

# Свежесть индекса

| репозиторий | SHA | возраст индекса |
|---|---|---|
| `poh-bft-writer` | `c7fe9bd7d1b2` | 23 мин |
| `poh-cortex` | `3c3e1a3a9e83` | 23 мин |
| `poh-helper` | `18512c1e7ce9` | 23 мин |
| `poh-infra` | `28ea3bef3f08` | 23 мин |
| `poh-issue-agents` | `8a83d3821fe4` | 23 мин |
| `poh-memory-engine` | `194e39319b3f` | 23 мин |
| `poh-pr-agents` | `9f15ada9e4e9` | 23 мин |
| `poh-scheduller` | `04cc3f47aff9` | 22 мин |
| `poh-sprint-agents` | `c41cb5b2ce18` | 23 мин |
| `poh-demo-checkout` | `2e7c62aa955e` | 4 сут |

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
    "index_age_days": 4,
    "indexed_commit": "2e7c62aa955e",
    "index_behind": false,
    "embedder": "mock",
    "embedder_degraded": false,
    "semantic_search": false
  }
}

## Ход 2 · `get_context` · product

**Запрос:**

```json
{
  "targets": [
    "src/server.mjs"
  ],
  "include": [
    "skeleton",
    "metrics"
  ]
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
      "metrics": {
        "pagerank": 0.05988,
        "pagerank_percentile": 0,
        "betweenness": 0.0,
        "betweenness_percentile": 0,
        "in_degree": 0,
        "out_degree": 2,
        "community_id": 0,
        "community_label": "external:node:http"
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
    "timing_ms": 72.8,
    "index_age_days": 4,
    "indexed_commit": "2e7c62aa955e",
    "index_behind": false,
    "embedder": "mock",
    "embedder_degraded": false,
    "semantic_search": false
  }
}

## Ход 3 · `get_context` · product

**Запрос:**

```json
{
  "targets": [
    "package.json"
  ],
  "include": [
    "skeleton"
  ]
}
```

**Ответ:**

{
  "targets": {
    "package.json": {
      "target": "package.json",
      "type": "file",
      "docs": {
        "summary": "package.json: 14 lines, no indexed symbols.",
        "file_preview": {
          "lines": 14,
          "chars": 314,
          "head": [
            "{",
            "  \"name\": \"poh-demo-checkout\",",
            "  \"version\": \"0.1.0\",",
            "  \"private\": true,",
            "  \"type\": \"module\",",
            "  \"description\": \"Демо-стенд контура производства: расчёт стоимости заказа\",",
            "  \"scripts\": {",
            "    \"start\": \"node src/server.mjs\",",
            "    \"test\": \"node --test \\\"tests/*.test.mjs\\\"\"",
            "  },",
            "  \"engines\": {",
            "    \"node\": \">=22\"",
            "  }",
            "}"
          ],
          "note": "This file has no indexed symbols, so there is no structural card for it. The fields above are counts and verbatim excerpts. Read the file for its full content."
        }
      },
      "hotspot": false,
      "freshness": {
        "confidence_score": null,
        "freshness_status": null,
        "is_stale": null
      },
      "architectural_layer": {
        "name": "Application",
        "description": "",
        "role": "entry_point"
      },
      "skeleton": {
        "mode": "raw",
        "tokens": 78,
        "full_tokens": 78,
        "pct_of_full": 100.0,
        "bodies_kept": [],
        "text": "{\n  \"name\": \"poh-demo-checkout\",\n  \"version\": \"0.1.0\",\n  \"private\": true,\n  \"type\": \"module\",\n  \"description\": \"Демо-стенд контура производства: расчёт стоимости заказа\",\n  \"scripts\": {\n    \"start\": \"node src/server.mjs\",\n    \"test\": \"node --test \\\"tests/*.test.mjs\\\"\"\n  },\n  \"engines\": {\n    \"node\": \">=22\"\n  }\n}\n",
        "verified": true,
        "note": "No usable symbol bounds for this file — returned source as-is."
      }
    }
  },
  "_meta": {
    "timing_ms": 58.65,
    "index_age_days": 4,
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
    "tests/pricing.test.mjs"
  ],
  "include": [
    "skeleton"
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
    "timing_ms": 53.38,
    "index_age_days": 4,
    "indexed_commit": "2e7c62aa955e",
    "index_behind": false,
    "embedder": "mock",
    "embedder_degraded": false,
    "semantic_search": false
  }
}

## Ход 5 · `get_risk` · product

**Запрос:**

```json
{
  "targets": [
    "src/server.mjs"
  ]
}
```

**Ответ:**

{
  "targets": {
    "src/server.mjs": {
      "target": "src/server.mjs",
      "hotspot_score": 0.6667,
      "dependents_count": 0,
      "co_change_partners": [],
      "primary_owner": "kibarik",
      "owner_pct": 1.0,
      "recent_owner": "kibarik",
      "recent_owner_pct": 1.0,
      "bus_factor": 1,
      "contributor_count": 1,
      "trend": "increasing",
      "risk_type": "stable",
      "change_pattern": "feature-active",
      "change_magnitude": {
        "lines_added_90d": 54,
        "lines_deleted_90d": 0,
        "avg_commit_size": 54.0
      },
      "impact_surface": [],
      "test_gap": true,
      "security_signals": [],
      "commit_count_capped": false,
      "risk_summary": "src/server.mjs — hotspot score 67% (increasing), 0 dependents, stable, feature-active, 0 co-change partners, owned 100% by kibarik",
      "health_score": 10.0
    }
  },
  "global_hotspots": [],
  "_meta": {
    "index_age_days": 4,
    "indexed_commit": "2e7c62aa955e",
    "index_behind": false,
    "embedder": "mock",
    "embedder_degraded": false,
    "semantic_search": false
  }
}

## Ход 6 · `search_codebase` · product

**Запрос:**

```json
{
  "query": "import JSON file read fs",
  "mode": "concept",
  "limit": 5
}
```

**Ответ:**

{
  "results": [
    {
      "title": "File: src/server.mjs",
      "page_type": "file_page",
      "snippet": "# src/server.mjs\n\n## Overview\n\n`src/server.mjs` is a javascript entry-point source file in the Application layer.\n\nIt exposes 1 public symbol and depends on 1 other file.\n\n## Public API\n\n| Symbol | Ki",
      "relevance_score": 3.03,
      "sources": [
        "fts"
      ],
      "target_path": "src/server.mjs",
      "confidence_score": 1.0
    },
    {
      "title": "Repository Overview: poh-demo-checkout",
      "page_type": "repo_overview",
      "snippet": "# Repository Overview: poh-demo-checkout\n\n**Files:** 12 | **Lines:** 1446\n\n## Project Summary\n\n\n`poh-demo-checkout` is a markdown codebase of 12 files. Execution starts at `src/server.mjs`.\n\n\n\n\n## Ent",
      "relevance_score": 2.951,
      "sources": [
        "fts"
      ],
      "target_path": "poh-demo-checkout",
      "confidence_score": 0.97
    }
  ],
  "_meta": {
    "index_age_days": 4,
    "indexed_commit": "2e7c62aa955e",
    "index_behind": false,
    "embedder": "mock",
    "embedder_degraded": false,
    "semantic_search": false
  },
  "candidates": [
    {
      "path": "src/server.mjs"
    }
  ]
}
