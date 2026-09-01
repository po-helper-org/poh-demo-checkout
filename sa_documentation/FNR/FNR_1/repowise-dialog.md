# Итог

- `/healthz` реализован не отдельным обработчиком, а веткой внутри единственного
  экспорта сервера — `export const app = async (req, res) => {...}`
  (`src/server.mjs:103`, ветка `/healthz` сразу после разбора URL). Ответ —
  `send(res, 200, { status: 'ok', uptime_sec: Math.floor(process.uptime()) })`;
  не-GET получает `405` с заголовком `Allow: GET` (символ `src/server.mjs::app`).
- `uptime_sec` — это `process.uptime()` в момент запроса, то есть состояние
  процесса, а не сборки. Поля версии в ответе нет, и брать его сейчас неоткуда:
  единственный источник версии в репо — `package.json`, поле `"version": "0.1.0"`.
- Тест `tests/healthz.test.mjs` (23 строки, один тест) проверяет ответ
  **по полям**, а не глубоким равенством тела: `body.status === 'ok'`,
  `typeof body.uptime_sec === 'number'`, целое, `>= 0`. Добавление поля
  `version` существующий тест не сломает; ассерт на версию — это новая логика,
  то есть по конвенции репо «новая логика — новый тест» идёт расширением этого
  теста или соседним кейсом.
- Границы кода по CLAUDE.md: арифметика — в `src/pricing.mjs`, `src/server.mjs`
  — только разбор запроса и коды ответов. Чтение версии из `package.json` — это
  файловый ввод-вывод в обёртке; `node:fs` в `src/server.mjs` уже импортирован
  (для статики), так что inline-чтение возможно без новых зависимостей. Вопрос
  «читать в сервере или вынести в чистую функцию для тестируемости» индекс не
  решает — это выбор следующей стадии.
- Сборки как артефакта в репо нет: `Dockerfile` отсутствует (цель не найдена в
  индексе), деплой-скрипт — `"start": "node src/server.mjs"` из `package.json`.
  Значит «какая сборка развёрнута» = какой процесс запущен, и без build-стадии
  источником версии может быть только `package.json`; git SHA брать неоткуда,
  если не заводить отдельный шаг сборки.
- CI-обвязка — три workflow: `.github/workflows/ci.yml`,
  `.github/workflows/openhands-resolver.yml`, `.github/workflows/pr-review.yml`.
- `src/server.mjs` — самый нездоровый файл репо (health 5.45) и хотспот
  (hotspot_score 0.67, тренд increasing); у `app` высокие биомаркеры
  `complex_method` и `change_entropy`, `test_gap: true`. Правка идёт в паре с
  `tests/server.test.mjs` (вес со-изменений 6.88) и `src/pricing.mjs` (3.85).
- Записанных архитектурных решений о составе ответа `/healthz` нет (decision
  store пуст по этому вопросу); git-археология: файл создан 2026-08-17
  (kibarik, «feat: демо-стенд контура производства»), последняя правка
  2026-08-28 (openhands-agent, PR #163 «реализация по системным требованиям»).
  Тест `tests/healthz.test.mjs` целиком авторства openhands-agent.
- Соседних репозиториев в индексе нет: сервер отдаёт ровно один репозиторий
  (`workspace: false`), поэтому проверить потребителей `/healthz` в соседнем
  репо (деплой/мониторинг) через индекс нечего и нельзя.
- Литеральных упоминаний `healthz` вне `src/server.mjs` и
  `tests/healthz.test.mjs` поиск по индексу не нашёл: в графе импортов
  `src/server.mjs` импортируют только два тестовых файла
  (`tests/healthz.test.mjs`, `tests/server.test.mjs`). Потребителей эндпоинта в
  README/workflow индекс не показал.

# Открытые вопросы

- Кто реально опрашивает `/healthz` на стенде (оркестратор, мониторинг, скрипт
  демо) — индекс этого не знает, а от этого зависит, безопасно ли менять
  контракт ответа. Добавление поля в JSON обычно обратно совместимо, но если
  потребитель сравнивает тело целиком, проверка нужна; точечный `grep` по
  литералу `healthz` индекс не заменяет.
- Нужна ли в ответе версия сборки помимо `package.json` (git SHA, дата
  сборки): в репо нет ни Dockerfile, ни build-стадии, где это можно
  прошить — заведение такой стадии было бы расширением scope за пределы MVP.
- Куда по границе кода положить чтение версии: инлайн в `src/server.mjs`
  (`node:fs` уже там) или вынести в отдельный чистый модуль, который тестируется
  без сети. Конвенция «арифметика — в pricing, обёртка тонкая» к чтению версии
  напрямую не применяется, решения в индексе нет.

# Диалог

**Ход 1 — рамка.** `get_overview(poh-demo-checkout)`: 12 файлов, entry points
`src/server.mjs` и `static/app.js`, худший по здоровью и топ-модуль по churn —
`src/server.mjs`; ключевые модули — `src` (2 файла, включая не упомянутый в
описании `src/metrics.mjs`), тесты в `tests/*.test.mjs`.

**Ход 2 — где `/healthz`.** `get_answer` (деградация: нет LLM-провайдера, ответ
низкой уверенности, но retrieval дал 5 релевантных хитов): карточка
`src/server.mjs::app` с телом — ветка `/healthz` возвращает
`{status:'ok', uptime_sec: Math.floor(process.uptime())}`, 405 для не-GET;
сервер зависит от `src/pricing.mjs` и `src/metrics.mjs`.

**Ход 3 — что фиксируют тесты.** `get_context(tests/healthz.test.mjs,
include=[skeleton])`: полный текст файла, один тест с проверками по полям
(`status`, `content-type`, целочисленный `uptime_sec >= 0`), без глубокого
сравнения тела — добавление поля существующий тест не ломает.

**Ход 4 — источник версии и деплой.** `get_context(package.json, Dockerfile,
.github/workflows)`: `package.json` — `version: "0.1.0"`, `start` →
`node src/server.mjs`; `Dockerfile` не найден; workflow — `ci.yml`,
`openhands-resolver.yml`, `pr-review.yml`.

**Ход 5 — риск правки.** `get_risk(src/server.mjs, tests/healthz.test.mjs)`:
сервер — хотспот 0.67 с трендом increasing, health 5.45, `app` —
complex_method/change_entropy, `test_gap: true`, со-изменения в паре с
`tests/server.test.mjs`; сам тест healthz — низкий риск (hotspot 0.095).

**Ход 6 — почему так.** `get_why` по `/healthz` в `src/server.mjs`: решений в
store нет, сработала git-археология — 12 коммитов по файлу, создание 2026-08-17,
последняя правка 2026-08-28 в PR #163; авторы — боты контура плюс kibarik.

**Ход 7 — потребители и соседи.** `search_codebase("healthz")` ушёл в symbol-режим
и вернул пусто: литерал, а не символ (подсказка — grep); `list_repos` —
`workspace: false`, один репозиторий, соседей для Этапа 4 нет.

**Ход 8 — переформулировка (одна разрешённая).** `search_codebase` в гибридном
режиме: смысловые хиты — шум от mock-эмбеддера (символы `src/pricing.mjs`), FTS
видит `healthz` только на страницах `src/server.mjs` и его теста. Нового факта
нет; вместе с пустым ходом 7 это два хода подряд без нового факта — стоп.


---
session: rw-analysis-po-helper-org__poh-demo-checkout-165
workspace: product
turns: 9
started: 2026-09-01T18:28:14Z
finished: 2026-09-01T18:30:01Z
---

# Свежесть индекса

| репозиторий | SHA | возраст индекса |
|---|---|---|
| `poh-demo-checkout` | `4e52050191c0` | 26 мин |

# Диалог

## Ход 1 · `get_overview` · product

**Запрос:**

```json
{}
```

**Ответ:**

{
  "title": "Repository Overview: poh-demo-checkout",
  "content_md": "# Repository Overview: poh-demo-checkout\n\n**Files:** 12 | **Lines:** 1446",
  "code_health": {
    "average_health": 8.64,
    "band": "healthy",
    "hotspot_health": 7.88,
    "worst_performer_path": "src/server.mjs",
    "worst_performer_score": 5.45,
    "open_findings": 22,
    "file_count": 23,
    "distribution": {
      "total_files": 23,
      "total_nloc": 2143,
      "bands": {
        "healthy": {
          "files": 19,
          "nloc": 1388,
          "pct": 64.8
        },
        "warning": {
          "files": 4,
          "nloc": 755,
          "pct": 35.2
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
    "src/server.mjs",
    "static/app.js"
  ],
  "git_health": {
    "files_git_attributed": 22,
    "hotspot_count": 5,
    "avg_bus_factor": 1.0,
    "files_with_bus_factor_1": 8,
    "churn_trend": "increasing",
    "top_churn_modules": [
      "src/server.mjs",
      ".github/workflows",
      "src/pricing.mjs",
      "tests/pricing.test.mjs",
      "README.md"
    ]
  },
  "knowledge_map": {
    "top_owners": [
      {
        "name": "poh-harness-demo[bot]",
        "files_owned": 6,
        "percentage": 27.3
      },
      {
        "name": "github-actions[bot]",
        "files_owned": 4,
        "percentage": 18.2
      },
      {
        "name": "openhands-agent",
        "files_owned": 3,
        "percentage": 13.6
      }
    ]
  },
  "community_summary": [
    {
      "id": 0,
      "label": "external:node:fs",
      "size": 6
    },
    {
      "id": 1,
      "label": "external:node:crypto",
      "size": 2
    },
    {
      "id": 2,
      "label": "static",
      "size": 2
    },
    {
      "id": 3,
      "label": "claude",
      "size": 1
    },
    {
      "id": 4,
      "label": "checks",
      "size": 1
    },
    {
      "id": 5,
      "label": "workflows",
      "size": 1
    },
    {
      "id": 6,
      "label": "workflows (1)",
      "size": 1
    },
    {
      "id": 7,
      "label": "workflows (1)",
      "size": 1
    },
    {
      "id": 8,
      "label": "context",
      "size": 1
    },
    {
      "id": 9,
      "label": "plan",
      "size": 1
    }
  ],
  "content_hint": "Overview essay trimmed to its summary section. Call get_overview(include=[\"content\"]) for the full walkthrough.",
  "outline": {
    "root": {
      "page_id": "repo_overview:poh-demo-checkout",
      "title": "Repository Overview: poh-demo-checkout"
    },
    "total_pages": 9,
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
        "descendants": 5
      },
      {
        "section": "3",
        "page_id": "file_page:static/app.js",
        "title": "File: static/app.js",
        "page_type": "file_page",
        "target_path": "static/app.js"
      }
    ]
  },
  "outline_hint": "The stored page tree — the same outline the web app and the editor extension render. Every 'section' in this response indexes into it, and 'descendants' is how much sits below an entry. Top rung only by default; call get_overview(include=[\"outline\"]) for one level deeper, then get_context on an entry's target_path to read it.",
  "architecture": {
    "layers": [
      {
        "name": "Application",
        "description": "",
        "file_count": 11
      },
      {
        "name": "Config",
        "description": "",
        "file_count": 8
      },
      {
        "name": "Test",
        "description": "",
        "file_count": 4
      }
    ],
    "tour_available": true,
    "tour_step_count": 6,
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
      "section": "2.3"
    },
    {
      "order": 3,
      "title": "pricing.mjs",
      "kind": "code",
      "reason": "Directly used by the entry points above; a core collaborator.",
      "target_path": "src/pricing.mjs",
      "page_id": "file_page:src/pricing.mjs",
      "section": "2.2"
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
    "indexed_commit": "4e52050191c0",
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
  "question": "Где в src/server.mjs реализован обработчик GET /healthz, что именно он возвращает и откуда берётся поле uptime_sec?",
  "repo": "poh-demo-checkout"
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
    "src/server.mjs",
    "src/metrics.mjs",
    "src/server.mjs::app",
    "src/pricing.mjs",
    "static/app.js"
  ],
  "retrieval": [
    {
      "path": "src/server.mjs",
      "title": "File: src/server.mjs",
      "summary": "`src/server.mjs` is a javascript entry-point source file in the Application layer.",
      "snippet": "# src/server.mjs\n\n## Overview\n\n`src/server.mjs` is a javascript entry-point source file in the Application layer.\n\nIt exposes 1 public symbol and depends on 2 other files.\n\n## Public API\n\n| Symbol | K",
      "excerpt": "# src/server.mjs\n\n## Overview\n\n`src/server.mjs` is a javascript entry-point source file in the Application layer.\n\nIt exposes 1 public symbol and depends on 2 other files.\n\n## Public API\n\n| Symbol | Kind | Signature |\n| --- | --- | --- |\n| `app` | function | app(req, res) |\n\n## Depends on\n\n- `src/pricing.mjs`\n- `src/metrics.mjs`\n\n## Used by\n\nImported by 2 files in this repository.\n\n- `tests/healthz.test.mjs`\n- `tests/server.test.mjs`\n\n## Usage Notes\n\n**Layer:** Application | **Role:** internal\n\n## Questions this page answers\n\n- What does `src/server.mjs` export?\n- Where is `app` defined?\n- What imports `src/server.mjs`?\n\n## In the code\n\nstatus uptime_sec uptime sec body node:http node:fs node:path node:url ./pricing.mjs ./metrics.mjs ../static .html text/html; charset=utf-8 .css text/css; charset=utf-8 .js application/javascript; charset=utf-8 .json application/json; charset=utf-8 .png image/png .jpg image/jpeg .gif image/gif .svg image/svg+xml .ico image/x-icon content-type content-length application/octet-stream файл не найден ? ERR_HTTP_PAYLOAD_TOO_LARGE utf8 http://localhost /healthz GET Method Not Allowed Allow /stats /quote POST application/json ожидается Content-Type: application/json тело запроса не разобралось как JSON не найдено HTTP-обёртка вокруг расчёта. Тонкая намеренно: вся арифметика в pricing.mjs и проверяется без сети, здесь остаётся только разбор запроса и коды ответов. Remove leading slash and decode URI Security: resolve the canonical path first before an",
      "score": 2.77,
      "key_symbols": [
        {
          "name": "__dirname",
          "kind": "variable",
          "signature": "__dirname = dirname(fileURLToPath(import.meta.url))",
          "docstring": "",
          "start_line": 12,
          "end_line": 12
        },
        {
          "name": "STATIC_DIR",
          "kind": "constant",
          "signature": "STATIC_DIR = join(__dirname, '../static')",
          "docstring": "",
          "start_line": 13,
          "end_line": 13
        },
        {
          "name": "MIME_TYPES",
          "kind": "constant",
          "signature": "MIME_TYPES = {",
          "docstring": "",
          "start_line": 15,
          "end_line": 25
        },
        {
          "name": "PORT",
          "kind": "constant",
          "signature": "PORT = Number(process.env.PORT || 8080)",
          "docstring": "",
          "start_line": 27,
          "end_line": 27
        },
        {
          "name": "send",
          "kind": "function",
          "signature": "function send(res, code, body, extraHeaders = {}) {",
          "docstring": "",
          "start_line": 29,
          "end_line": 37
        },
        {
          "name": "sendStatic",
          "kind": "function",
          "signature": "function sendStatic(res, filePath) {",
          "docstring": "",
          "start_line": 39,
          "end_line": 53
        },
        {
          "name": "serveStatic",
          "kind": "function",
          "signature": "function serveStatic(url) {",
          "docstring": "",
          "start_line": 55,
          "end_line": 83,
          "source_excerpt": "function serveStatic(url) {\n  // Remove leading slash and decode URI\n  const path = url === '/' ? '/index.html' : url;\n  const decodedPath = decodeURIComponent(path);\n  const filePath = join(STATIC_DIR, decodedPath);\n  \n  try {\n    // Security: resolve the canonical path first before any file system operations\n    const realPath = realpathSync(filePath);\n    \n    // Security check: ensure the resolved path is within STATIC_DIR\n    const normalizedStatic = STATIC_DIR.replace(/\\\\/g, '/');\n    const normalizedFile = realPath.replace(/\\\\/g, '/');\n    \n    if (!normalizedFile.startsWith(normalizedStatic)) {\n      return null;\n    }\n    \n    // Check if the path points to a regular file (after security validation)\n    const stats = statSync(realPath);\n    if (!stats.isFile()) {\n      return null;\n    }\n    \n    return realPath;\n  } catch {\n    return null;\n  }\n}"
        },
        {
          "name": "readJson",
          "kind": "function",
          "signature": "async function readJson(req, maxSize = 64 * 1024) {",
          "docstring": "",
          "start_line": 85,
          "end_line": 101
        },
        {
          "name": "app",
          "kind": "function",
          "signature": "export const app = async (req, res) => {",
          "docstring": "",
          "start_line": 103,
          "end_line": 175
        }
      ]
    },
    {
      "path": "src/metrics.mjs",
      "title": "File: src/metrics.mjs",
      "summary": "Модуль метрик посещений и успешных транзакций. Экспортирует замыкание с счётчиками и функциями управления. **Ограничение хранение:** Счётчики хранятся в памяти процесса и сбрасываются при перезапуске сервиса.",
      "snippet": "# src/metrics.mjs\n\n## Overview\n\nМодуль метрик посещений и успешных транзакций.\nЭкспортирует замыкание с счётчиками и функциями управления.\n**Ограничение хранение:** Счётчики хранятся в памяти процесса",
      "excerpt": "# src/metrics.mjs\n\n## Overview\n\nМодуль метрик посещений и успешных транзакций.\nЭкспортирует замыкание с счётчиками и функциями управления.\n**Ограничение хранение:** Счётчики хранятся в памяти процесса и сбрасываются при\nперезапуске сервиса. Это осознанное архитектурное решение демо-сервиса: отсутствие\nперсистентности упрощает код и позволяет сосредоточиться на контуре производства,\nа не на хранении данных. На графиках метрики будут обнуляться после каждого\nперезапуска, что является свойством архитектуры, а не ошибкой.\n\nIt exposes 1 public symbol.\n\n## Public API\n\n| Symbol | Kind | Signature |\n| --- | --- | --- |\n| `counters` | variable | counters = (() => { |\n\n## Used by\n\nImported by 3 files in this repository.\n\n- `src/server.mjs`\n- `tests/metrics.test.mjs`\n- `tests/server.test.mjs`\n\n## Questions this page answers\n\n- What does `src/metrics.mjs` export?\n- Where is `counters` defined?\n- What imports `src/metrics.mjs`?\n\n## In the code\n\nexport const counters let visits successes return post quote returns void inc visit http success number get stats\n\n---\n\n*Built from the code itself: parsed symbols, the import graph, git history and\nthe knowledge graph. Every statement here is checked against the source rather\nthan written about it.*",
      "score": 2.468,
      "key_symbols": [
        {
          "name": "counters",
          "kind": "variable",
          "signature": "counters = (() => {",
          "docstring": "",
          "start_line": 11,
          "end_line": 43
        }
      ]
    },
    {
      "path": "src/server.mjs::app",
      "file": "src/server.mjs",
      "title": "Symbol: src.server.app",
      "summary": "`app` is a function defined in `src/server.mjs`. It carries no docstring.",
      "snippet": "# src.server.app\n\n**Kind:** function | **Defined in:** `src/server.mjs` | **Estimated complexity:** 16\n\n```\napp(req, res)\n```\n\n## Overview\n\n`app` is a function defined in `src/server.mjs`. It carries",
      "excerpt": "# src.server.app\n\n**Kind:** function | **Defined in:** `src/server.mjs` | **Estimated complexity:** 16\n\n```\napp(req, res)\n```\n\n## Overview\n\n`app` is a function defined in `src/server.mjs`. It carries no docstring.\n\n## Where it is used\n\n2 files import the module that defines it. These are import-level references, not confirmed call sites.\n\n- `tests/healthz.test.mjs`\n- `tests/server.test.mjs`\n\n## Implementation\n\n```\nexport const app = async (req, res) => {\n  const url = new URL(req.url, 'http://localhost');\n  const pathname = url.pathname;\n\n  if (pathname === '/healthz') {\n    if (req.method !== 'GET') {\n      return send(res, 405, { error: 'Method Not Allowed' }, { 'Allow': 'GET' });\n    }\n    return send(res, 200, {\n      status: 'ok',\n      uptime_sec: Math.floor(process.uptime())\n    });\n  }\n\n  if (pathname === '/stats') {\n    if (req.method !== 'GET') {\n      return send(res, 405, { error: 'Method Not Allowed' }, { 'Allow': 'GET' });\n    }\n    return send(res, 200, counters.getStats());\n  }\n\n  // Не POST на /quote — 405 с Allow, как у /healthz и /stats: без guard-а\n  // запрос проваливается в раздачу статики и отвечает 404 про файл.\n  if (pathname === '/quote' && req.method !== 'POST') {\n    return send(res, 405, { error: 'Method Not Allowed' }, { 'Allow': 'POST' });\n  }\n\n  if (pathname === '/quote' && req.method === 'POST') {\n    counters.incVisit();\n    \n    // Проверка Content-Type до попытки парсинга JSON\n    const contentType = req.headers['content-type'];\n    if (!co",
      "score": 2.213
    },
    {
      "path": "src/pricing.mjs",
      "title": "File: src/pricing.mjs",
      "summary": "`src/pricing.mjs` is a javascript source file in the Application layer.",
      "snippet": "# src/pricing.mjs\n\n## Overview\n\n`src/pricing.mjs` is a javascript source file in the Application layer.\n\nIt exposes 10 public symbols.\n\n## Public API\n\n| Symbol | Kind | Signature |\n| --- | --- | --- |",
      "excerpt": "# src/pricing.mjs\n\n## Overview\n\n`src/pricing.mjs` is a javascript source file in the Application layer.\n\nIt exposes 10 public symbols.\n\n## Public API\n\n| Symbol | Kind | Signature |\n| --- | --- | --- |\n| `DELIVERY_FEE` | constant | DELIVERY_FEE = 300 |\n| `FREE_DELIVERY_FROM` | constant | FREE_DELIVERY_FROM = 3000 |\n| `MIN_ORDER_AMOUNT` | constant | MIN_ORDER_AMOUNT = 1000 |\n| `PROMO_CODES` | constant | PROMO_CODES = { |\n| `PAYMENT_PROVIDERS` | constant | PAYMENT_PROVIDERS = { |\n| `CURRENCY` | constant | CURRENCY = 'RUB' |\n| `subtotal` | function | function subtotal(items) |\n| `deliveryFee` | function | function deliveryFee(amount) |\n| `discountAmount` | function | function discountAmount(goods, promoCode) |\n| `quote` | function | function quote(items, promoCode = null, paymentMethod = null, invoiceSeq = 1) |\n\n## Used by\n\nImported by 2 files in this repository.\n\n- `src/server.mjs`\n- `tests/pricing.test.mjs`\n\n## Usage Notes\n\n**Layer:** Application | **Role:** internal\n\n## Questions this page answers\n\n- What does `src/pricing.mjs` export?\n- Where is `DELIVERY_FEE` defined?\n- What imports `src/pricing.mjs`?\n\n## In the code\n\ndiscount payment provider amount currency node:crypto 2+1 WELCOME10 SUMMER20 2026-09-01 FALL15 2026-12-01 SALE10 Скидка 10% cloudpayments RUB заказ без позиций некорректная сумма заказа sha256 hex unknown none applied ready Расчёт стоимости заказа. Чистые функции без ввода-вывода: цена — то, что проверяется тестом построчно, и подмешивать сюда сеть значило бы п",
      "score": 2.19
    },
    {
      "path": "static/app.js",
      "title": "File: static/app.js",
      "summary": "`static/app.js` is a javascript entry-point source file.",
      "snippet": "Validate input Hide previous results Disable button and show loading state Display results document get element order form add event listener async prevent default const value trim parse float int div",
      "excerpt": "# static/app.js\n\n## Overview\n\n`static/app.js` is a javascript entry-point source file.\n\n## Used by\n\nImported by 1 file in this repository.\n\n- `static/index.html`\n\n## Questions this page answers\n\n- What imports `static/app.js`?\n\n## In the code\n\nmethod headers body items style currency order-form submit sku price quantity result error calculate-btn SKU товара обязателен Цена должна быть положительным числом Количество должно быть положительным целым числом hidden Расчёт... /quote POST Content-Type application/json Ошибка расчёта goods-amount delivery-amount total-amount Рассчитать ru-RU RUB Validate input Hide previous results Disable button and show loading state Display results document get element order form add event listener async prevent default const value trim parse float int div calculate btn validate input show return hide previous results class list disable button and loading state disabled true text content try response await fetch quote type application json stringify qty data throw new display goods amount format delivery total remove catch message finally false function intl number minimum fraction digits maximum\n\n---\n\n*Built from the code itself: parsed symbols, the import graph, git history and\nthe knowledge graph. Every statement here is checked against the source rather\nthan written about it.*",
      "score": 2.167
    }
  ],
  "note": "DEGRADED: no LLM provider configured (set REPOWISE_PROVIDER + API key). Synthesis is what is missing here, not retrieval.",
  "best_guesses": [
    {
      "file": "src/server.mjs",
      "why_relevant": "`src/server.mjs` is a javascript entry-point source file in the Application layer..",
      "score": 2.77
    },
    {
      "file": "src/metrics.mjs",
      "why_relevant": "Модуль метрик посещений и успешных транзакций.",
      "score": 2.468
    },
    {
      "file": "src/server.mjs",
      "why_relevant": "`app` is a function defined in `src/server.mjs`.",
      "score": 2.213
    }
  ],
  "_meta": {
    "timing_ms": 177.2,
    "hint": "No synthesis, and retrieval was weak. Refine the query with search_codebase rather than reading these files in order.",
    "index_age_days": 0,
    "indexed_commit": "4e52050191c0",
    "index_behind": false,
    "embedder": "mock",
    "embedder_degraded": false,
    "semantic_search": false,
    "degraded": "no-llm-provider"
  },
  "candidates": [
    {
      "path": "src/server.mjs",
      "lines": "12-175",
      "defines": "send:29, sendStatic:39, serveStatic:55, readJson:85, app:103, STATIC_DIR:13"
    },
    {
      "path": "src/metrics.mjs",
      "lines": "11-43"
    },
    {
      "path": "src/pricing.mjs",
      "defines": "subtotal:45, deliveryFee:64, validatePromoCode:77, discountAmount:95, generateInvoiceId:112, quote:128"
    },
    {
      "path": "static/app.js",
      "defines": "showError:67, formatCurrency:73"
    }
  ]
}

## Ход 3 · `get_context` · product

**Запрос:**

```json
{
  "repo": "poh-demo-checkout",
  "targets": [
    "tests/healthz.test.mjs"
  ],
  "include": [
    "skeleton"
  ]
}
```

**Ответ:**

{
  "targets": {
    "tests/healthz.test.mjs": {
      "target": "tests/healthz.test.mjs",
      "type": "file",
      "docs": {
        "summary": "healthz.test.mjs: 23 lines, no indexed symbols.",
        "file_preview": {
          "lines": 23,
          "chars": 795,
          "head": [
            "import assert from 'node:assert/strict';",
            "import { test } from 'node:test';",
            "import { createServer } from 'node:http';",
            "import { app } from '../src/server.mjs';",
            "test('GET /healthz возвращает статус и время работы', async () => {",
            "  const server = createServer(app);",
            "  const port = 0; // случайный свободный порт",
            "  await new Promise(resolve => server.listen(port, resolve));",
            "  const res = await fetch(`http://localhost:${server.address().port}/healthz`);",
            "  const body = await res.json();",
            "  assert.equal(res.status, 200);",
            "  assert.equal(res.headers.get('content-type'), 'application/json; charset=utf-8');",
            "  assert.equal(body.status, 'ok');",
            "  assert.equal(typeof body.uptime_sec, 'number');",
            "  assert.ok(Number.isInteger(body.uptime_sec));"
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
        "tokens": 198,
        "full_tokens": 198,
        "pct_of_full": 100.0,
        "bodies_kept": [],
        "text": "import assert from 'node:assert/strict';\nimport { test } from 'node:test';\nimport { createServer } from 'node:http';\nimport { app } from '../src/server.mjs';\n\ntest('GET /healthz возвращает статус и время работы', async () => {\n  const server = createServer(app);\n  const port = 0; // случайный свободный порт\n\n  await new Promise(resolve => server.listen(port, resolve));\n\n  const res = await fetch(`http://localhost:${server.address().port}/healthz`);\n  const body = await res.json();\n\n  assert.equal(res.status, 200);\n  assert.equal(res.headers.get('content-type'), 'application/json; charset=utf-8');\n  assert.equal(body.status, 'ok');\n  assert.equal(typeof body.uptime_sec, 'number');\n  assert.ok(Number.isInteger(body.uptime_sec));\n  assert.ok(body.uptime_sec >= 0);\n\n  server.close();\n});\n",
        "verified": true,
        "note": "No usable symbol bounds for this file — returned source as-is."
      }
    }
  },
  "_meta": {
    "timing_ms": 42.95,
    "index_age_days": 0,
    "indexed_commit": "4e52050191c0",
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
  "repo": "poh-demo-checkout",
  "targets": [
    "package.json",
    "Dockerfile",
    ".github/workflows"
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
        "symbols": [],
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
      }
    },
    "Dockerfile": {
      "target": "Dockerfile",
      "error": "Target not found: 'Dockerfile'"
    },
    ".github/workflows": {
      "target": ".github/workflows",
      "error": "Target not found: '.github/workflows'",
      "suggestions": [
        ".github/workflows/ci.yml",
        ".github/workflows/openhands-resolver.yml",
        ".github/workflows/pr-review.yml"
      ]
    }
  },
  "_meta": {
    "timing_ms": 70.3,
    "index_age_days": 0,
    "indexed_commit": "4e52050191c0",
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
  "repo": "poh-demo-checkout",
  "targets": [
    "src/server.mjs",
    "tests/healthz.test.mjs"
  ]
}
```

**Ответ:**

{
  "targets": {
    "src/server.mjs": {
      "target": "src/server.mjs",
      "hotspot_score": 0.6667,
      "dependents_count": 2,
      "co_change_partners": [
        {
          "file_path": "tests/server.test.mjs",
          "weight": 6.88,
          "last_co_change": "2026-08-28",
          "has_import_link": true
        },
        {
          "file_path": "src/pricing.mjs",
          "weight": 3.85,
          "last_co_change": "2026-08-24",
          "has_import_link": true
        },
        {
          "file_path": "tests/pricing.test.mjs",
          "weight": 3.85,
          "last_co_change": "2026-08-24",
          "has_import_link": false
        }
      ],
      "primary_owner": "github-actions[bot]",
      "owner_pct": 0.4317,
      "recent_owner": "poh-harness-demo[bot]",
      "recent_owner_pct": 0.5833,
      "bus_factor": 3,
      "contributor_count": 4,
      "trend": "increasing",
      "risk_type": "stable",
      "change_pattern": "feature-active",
      "change_magnitude": {
        "lines_added_90d": 201,
        "lines_deleted_90d": 18,
        "avg_commit_size": 18.2
      },
      "impact_surface": [
        {
          "file_path": "tests/healthz.test.mjs",
          "pagerank": 0.02723,
          "is_entry_point": true
        },
        {
          "file_path": "tests/server.test.mjs",
          "pagerank": 0.02723,
          "is_entry_point": true
        }
      ],
      "test_gap": true,
      "security_signals": [],
      "commit_count_capped": false,
      "risk_summary": "src/server.mjs — hotspot score 67% (increasing), 2 dependents, stable, feature-active, 3 co-change partners, owned 43% by github-actions[bot]",
      "health_score": 5.45,
      "top_biomarkers": [
        {
          "biomarker_type": "change_entropy",
          "severity": "high",
          "function_name": null,
          "impact": 1.81
        },
        {
          "biomarker_type": "complex_method",
          "severity": "high",
          "function_name": "app",
          "impact": 1.45
        },
        {
          "biomarker_type": "nested_complexity",
          "severity": "medium",
          "function_name": "app",
          "impact": 0.94
        }
      ]
    },
    "tests/healthz.test.mjs": {
      "target": "tests/healthz.test.mjs",
      "hotspot_score": 0.09524,
      "dependents_count": 0,
      "co_change_partners": [],
      "primary_owner": "openhands-agent",
      "owner_pct": 1.0,
      "recent_owner": "openhands-agent",
      "recent_owner_pct": 1.0,
      "bus_factor": 1,
      "contributor_count": 1,
      "trend": "increasing",
      "risk_type": "stable",
      "change_pattern": "feature-active",
      "change_magnitude": {
        "lines_added_90d": 23,
        "lines_deleted_90d": 0,
        "avg_commit_size": 23.0
      },
      "impact_surface": [],
      "test_gap": false,
      "security_signals": [],
      "commit_count_capped": false,
      "risk_summary": "tests/healthz.test.mjs — hotspot score 10% (increasing), 0 dependents, stable, feature-active, 0 co-change partners, owned 100% by openhands-agent",
      "health_score": 10.0
    }
  },
  "global_hotspots": [
    {
      "file_path": "tests/pricing.test.mjs",
      "hotspot_score": 1.0,
      "primary_owner": "poh-harness-demo[bot]"
    },
    {
      "file_path": "tests/server.test.mjs",
      "hotspot_score": 0.9524,
      "primary_owner": "poh-harness-demo[bot]"
    },
    {
      "file_path": ".github/workflows/openhands-resolver.yml",
      "hotspot_score": 0.9048,
      "primary_owner": null
    },
    {
      "file_path": "src/pricing.mjs",
      "hotspot_score": 0.8095,
      "primary_owner": "poh-harness-demo[bot]"
    },
    {
      "file_path": "README.md",
      "hotspot_score": 0.7619,
      "primary_owner": "poh-harness-demo[bot]"
    }
  ],
  "_meta": {
    "index_age_days": 0,
    "indexed_commit": "4e52050191c0",
    "index_behind": false,
    "embedder": "mock",
    "embedder_degraded": false,
    "semantic_search": false
  }
}

## Ход 6 · `get_why` · product

**Запрос:**

```json
{
  "query": "почему GET /healthz возвращает только status и uptime_sec, и кто потребляет этот эндпоинт",
  "repo": "poh-demo-checkout",
  "targets": [
    "src/server.mjs"
  ]
}
```

**Ответ:**

{
  "mode": "search",
  "query": "почему GET /healthz возвращает только status и uptime_sec, и кто потребляет этот эндпоинт",
  "decisions": [],
  "try_instead": [
    "get_answer"
  ],
  "reason": "No decision record covers this question. The store holds none carrying its terms, and the closest ones would be noise.",
  "target_context": {
    "src/server.mjs": {
      "governing_decisions": [],
      "origin": {
        "available": true,
        "primary_author": "github-actions[bot]",
        "author_commit_pct": 0.4317,
        "contributors": [
          {
            "name": "poh-harness-demo[bot]",
            "email": "poh-harness-demo[bot]@users.noreply.github.com",
            "commit_count": 7,
            "last_commit_ts": 1787632008,
            "first_commit_ts": 1787223203
          },
          {
            "name": "openhands-agent",
            "email": "openhands-agent@users.noreply.github.com",
            "commit_count": 2,
            "last_commit_ts": 1787933658,
            "first_commit_ts": 1787584611
          },
          {
            "name": "github-actions[bot]",
            "email": "github-actions[bot]@users.noreply.github.com",
            "commit_count": 2,
            "last_commit_ts": 1787704984,
            "first_commit_ts": 1787570051
          },
          {
            "name": "kibarik",
            "email": "cvyatoslavka@gmail.com",
            "commit_count": 1,
            "last_commit_ts": 1786993121,
            "first_commit_ts": 1786993121
          }
        ],
        "total_commits": 12,
        "first_commit": "2026-08-17",
        "last_commit": "2026-08-28",
        "age_days": 10,
        "key_commits": [
          {
            "sha": "4abc8be4",
            "date": "2026-08-28T16:14:18+00:00",
            "message": "feat(#163): реализация по системным требованиям",
            "author": "openhands-agent",
            "pr_number": 163
          },
          {
            "sha": "503b9660",
            "date": "2026-08-25T04:26:48+00:00",
            "message": "feat(#122): реализация по системным требованиям (#144)",
            "author": "poh-harness-demo[bot]",
            "pr_number": 122
          },
          {
            "sha": "9ca725f7",
            "date": "2026-08-25T04:15:05+00:00",
            "message": "feat(#126): реализация по системным требованиям (#141)",
            "author": "poh-harness-demo[bot]",
            "pr_number": 126
          },
          {
            "sha": "72006e01",
            "date": "2026-08-25T03:54:54+00:00",
            "message": "feat(#121): реализация по системным требованиям (#131)",
            "author": "poh-harness-demo[bot]",
            "pr_number": 121
          },
          {
            "sha": "edd86363",
            "date": "2026-08-25T03:43:29+00:00",
            "message": "feat(#120): реализация по системным требованиям (#130)",
            "author": "poh-harness-demo[bot]",
            "pr_number": 120
          }
        ],
        "linked_decisions": [],
        "summary": "Created ~2026-08-17, last modified 2026-08-28 (10 days old). Primary author: github-actions[bot] (12 total commits). Earliest key commit: \"feat: демо-стенд контура производства\" by kibarik on 2026-08-17T18:58:41+00:00. Contributors: poh-harness-demo[bot], openhands-agent, github-actions[bot]."
      },
      "git_archaeology": {
        "triggered": true,
        "file_commits": [
          {
            "sha": "4abc8be4",
            "message": "feat(#163): реализация по системным требованиям",
            "author": "openhands-agent",
            "date": "2026-08-28T16:14:18+00:00"
          },
          {
            "sha": "503b9660",
            "message": "feat(#122): реализация по системным требованиям (#144)",
            "author": "poh-harness-demo[bot]",
            "date": "2026-08-25T04:26:48+00:00"
          },
          {
            "sha": "9ca725f7",
            "message": "feat(#126): реализация по системным требованиям (#141)",
            "author": "poh-harness-demo[bot]",
            "date": "2026-08-25T04:15:05+00:00"
          },
          {
            "sha": "72006e01",
            "message": "feat(#121): реализация по системным требованиям (#131)",
            "author": "poh-harness-demo[bot]",
            "date": "2026-08-25T03:54:54+00:00"
          },
          {
            "sha": "edd86363",
            "message": "feat(#120): реализация по системным требованиям (#130)",
            "author": "poh-harness-demo[bot]",
            "date": "2026-08-25T03:43:29+00:00"
          },
          {
            "sha": "80c671cd",
            "message": "feat(#100): реализация по системным требованиям",
            "author": "openhands-agent",
            "date": "2026-08-24T15:16:51+00:00"
          },
          {
            "sha": "63e91f99",
            "message": "feat(#90): реализация по системным требованиям (#98)",
            "author": "poh-harness-demo[bot]",
            "date": "2026-08-24T10:16:18+00:00"
          },
          {
            "sha": "a9b8fc09",
            "message": "feat(#83): Оплата картой через CloudPayments в чекауте (#89)",
            "author": "poh-harness-demo[bot]",
            "date": "2026-08-24T10:03:40+00:00"
          },
          {
            "sha": "a9d6c756",
            "message": "feat(#64): Скидка по промокоду в корзине (#73)",
            "author": "poh-harness-demo[bot]",
            "date": "2026-08-20T10:53:23+00:00"
          },
          {
            "sha": "ca11525c",
            "message": "feat: демо-стенд контура производства",
            "author": "kibarik",
            "date": "2026-08-17T18:58:41+00:00"
          }
        ],
        "cross_references": [],
        "git_log": [
          {
            "sha": "4abc8be4a94c",
            "author": "openhands-agent",
            "date": "2026-08-28",
            "message": "feat(#163): реализация по системным требованиям",
            "source": "git_log_follow"
          },
          {
            "sha": "9f7046aa0f28",
            "author": "github-actions[bot]",
            "date": "2026-08-26",
            "message": "feat(#8): Поменять цвета на стилистику Threads (#9)",
            "source": "git_log_follow"
          },
          {
            "sha": "503b96600e30",
            "author": "poh-harness-demo[bot]",
            "date": "2026-08-25",
            "message": "feat(#122): реализация по системным требованиям (#144)",
            "source": "git_log_follow"
          },
          {
            "sha": "9ca725f7216a",
            "author": "poh-harness-demo[bot]",
            "date": "2026-08-25",
            "message": "feat(#126): реализация по системным требованиям (#141)",
            "source": "git_log_follow"
          },
          {
            "sha": "72006e0184d7",
            "author": "poh-harness-demo[bot]",
            "date": "2026-08-25",
            "message": "feat(#121): реализация по системным требованиям (#131)",
            "source": "git_log_follow"
          },
          {
            "sha": "edd86363c52f",
            "author": "poh-harness-demo[bot]",
            "date": "2026-08-25",
            "message": "feat(#120): реализация по системным требованиям (#130)",
            "source": "git_log_follow"
          },
          {
            "sha": "80c671cdf1ec",
            "author": "openhands-agent",
            "date": "2026-08-24",
            "message": "feat(#100): реализация по системным требованиям",
            "source": "git_log_follow"
          },
          {
            "sha": "a6ee8c4ceb65",
            "author": "github-actions[bot]",
            "date": "2026-08-24",
            "message": "feat(#1): реализация по системным требованиям (#6)",
            "source": "git_log_follow"
          },
          {
            "sha": "63e91f99fa23",
            "author": "poh-harness-demo[bot]",
            "date": "2026-08-24",
            "message": "feat(#90): реализация по системным требованиям (#98)",
            "source": "git_log_follow"
          },
          {
            "sha": "a9b8fc09014c",
            "author": "poh-harness-demo[bot]",
            "date": "2026-08-24",
            "message": "feat(#83): Оплата картой через CloudPayments в чекауте (#89)",
            "source": "git_log_follow"
          },
          {
            "sha": "a9d6c756fb45",
            "author": "poh-harness-demo[bot]",
            "date": "2026-08-20",
            "message": "feat(#64): Скидка по промокоду в корзине (#73)",
            "source": "git_log_follow"
          },
          {
            "sha": "ca11525c7657",
            "author": "kibarik",
            "date": "2026-08-17",
            "message": "feat: демо-стенд контура производства",
            "source": "git_log_follow"
          }
        ],
        "summary": "No architectural decisions found for src/server.mjs, but git archaeology recovered 10 direct commit(s), 0 cross-reference(s), and 12 git log result(s). Review these to understand the intent behind this code."
      }
    }
  },
  "_meta": {
    "index_age_days": 0,
    "indexed_commit": "4e52050191c0",
    "index_behind": false,
    "embedder": "mock",
    "embedder_degraded": false,
    "semantic_search": false
  }
}

## Ход 7 · `search_codebase` · product

**Запрос:**

```json
{
  "limit": 10,
  "query": "healthz",
  "repo": "poh-demo-checkout"
}
```

**Ответ:**

{
  "results": [],
  "mode": "symbol",
  "_meta": {
    "index_age_days": 0,
    "indexed_commit": "4e52050191c0",
    "index_behind": false,
    "embedder": "mock",
    "embedder_degraded": false,
    "semantic_search": false
  },
  "exact_match": false,
  "note": "No indexed symbol exactly matches 'healthz'. The results are fuzzy neighbours ranked by token overlap — confirm a hit names what you meant before relying on it. If you expected an exact symbol, recheck spelling/casing, or Grep the literal name for an exhaustive usage sweep.",
  "grep_hint": "No indexed match for identifier 'healthz'. Retry with mode=\"symbol\" (or check spelling/casing); if you need every literal usage for an exhaustive sweep such as a rename, Grep is the right tool for that."
}

## Ход 8 · `list_repos` · product

**Запрос:**

```json
{}
```

**Ответ:**

{
  "workspace": false,
  "workspace_root": null,
  "default_repo": "default",
  "repos": [
    {
      "alias": "default",
      "path": "/workspaces/product/poh-demo-checkout",
      "absolute_path": "/workspaces/product/poh-demo-checkout",
      "is_default": true
    }
  ],
  "hint": "This MCP server is serving a single repo; omit repo unless a tool asks for it.",
  "_meta": {
    "embedder": "mock",
    "embedder_degraded": false,
    "semantic_search": false,
    "replaced_tokens": 120,
    "tokens_saved": 19
  }
}

## Ход 9 · `search_codebase` · product

**Запрос:**

```json
{
  "limit": 8,
  "mode": "hybrid",
  "query": "кто вызывает /healthz: smoke-проверка, CI workflow, мониторинг, README, статический фронтенд",
  "repo": "poh-demo-checkout"
}
```

**Ответ:**

{
  "results": [
    {
      "type": "symbol",
      "symbol_id": "src/pricing.mjs::validatePromoCode",
      "name": "validatePromoCode",
      "kind": "function",
      "file": "src/pricing.mjs",
      "start_line": 77,
      "end_line": 87,
      "signature": "function validatePromoCode(code, now = new Date())",
      "qualified_name": "src.pricing.validatePromoCode",
      "language": "javascript",
      "score": 2.054,
      "next": "get_symbol"
    },
    {
      "type": "symbol",
      "symbol_id": "src/pricing.mjs::quote",
      "name": "quote",
      "kind": "function",
      "file": "src/pricing.mjs",
      "start_line": 128,
      "end_line": 173,
      "signature": "function quote(items, promoCode = null, paymentMethod = null, invoiceSeq = 1)",
      "qualified_name": "src.pricing.quote",
      "language": "javascript",
      "score": 1.548,
      "next": "get_symbol"
    },
    {
      "type": "symbol",
      "symbol_id": "src/pricing.mjs::deliveryFee",
      "name": "deliveryFee",
      "kind": "function",
      "file": "src/pricing.mjs",
      "start_line": 64,
      "end_line": 69,
      "signature": "function deliveryFee(amount)",
      "qualified_name": "src.pricing.deliveryFee",
      "language": "javascript",
      "score": 1.348,
      "next": "get_symbol"
    },
    {
      "type": "symbol",
      "symbol_id": "src/pricing.mjs::subtotal",
      "name": "subtotal",
      "kind": "function",
      "file": "src/pricing.mjs",
      "start_line": 45,
      "end_line": 58,
      "signature": "function subtotal(items)",
      "qualified_name": "src.pricing.subtotal",
      "language": "javascript",
      "score": 1.348,
      "next": "get_symbol"
    },
    {
      "title": "Repository Overview: poh-demo-checkout",
      "page_type": "repo_overview",
      "snippet": "by PageRank over the import graph: the files most of the codebase ultimately depends on.\n\n- `src/pricing.mjs` (0.1023)\n\n- `.github/workflows/ci.yml` (0.0599)\n\n- `.github/workflows/openhands-resolver.y",
      "relevance_score": 3.0,
      "sources": [
        "fts"
      ],
      "target_path": "poh-demo-checkout",
      "type": "page"
    },
    {
      "title": "File: src/server.mjs",
      "page_type": "file_page",
      "snippet": "nd | Signature |\n| --- | --- | --- |\n| `app` | function | app(req, res) |\n\n## Depends on\n\n- `src/pricing.mjs`\n- `src/metrics.mjs`\n\n## Used by\n\nImported by 2 files in this repository.\n\n- `tests/healthz",
      "relevance_score": 2.951,
      "sources": [
        "fts"
      ],
      "target_path": "src/server.mjs",
      "type": "page"
    },
    {
      "title": "Symbol: src.server.app",
      "page_type": "symbol_spotlight",
      "snippet": "the module that defines it. These are import-level references, not confirmed call sites.\n\n- `tests/healthz.test.mjs`\n- `tests/server.test.mjs`\n\n## Implementation\n\n```\nexport const app = async (req, r",
      "relevance_score": 2.903,
      "sources": [
        "fts"
      ],
      "target_path": "src/server.mjs::app",
      "file": "src/server.mjs",
      "type": "page"
    },
    {
      "title": "How It Works",
      "page_type": "onboarding",
      "snippet": "mjs`\n\n\n\n\n## Traced flows\n\n\n\n\n### From `src/server.mjs::app`\n\n\n\n1. `src/server.mjs::app`\n\n2. `src/pricing.mjs::quote`\n\n3. `src/pricing.mjs::subtotal`\n\n\n\n\n\n\n## Reading order\n\nThe guided tour walks these",
      "relevance_score": 2.857,
      "sources": [
        "fts"
      ],
      "target_path": "onboarding/how_it_works",
      "type": "page"
    }
  ],
  "mode": "hybrid",
  "_meta": {
    "index_age_days": 0,
    "indexed_commit": "4e52050191c0",
    "index_behind": false,
    "embedder": "mock",
    "embedder_degraded": false,
    "semantic_search": false,
    "replaced_tokens": 1600,
    "tokens_saved": 795
  },
  "candidates": [
    {
      "path": "src/pricing.mjs"
    },
    {
      "path": "src/server.mjs"
    }
  ]
}
