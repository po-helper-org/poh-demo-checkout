# Issue #163: 405 с `Allow: POST` на не-POST `/quote` — Implementation Plan

> **For agentic workers:** план исполняется неинтерактивно, задача за задачей,
> по порядку. Шаги помечены чекбоксами (`- [ ]`). Спрашивать некого: если шаг
> нельзя выполнить буквально — принять минимальное решение в духе репозитория и
> записать его в `.reflect.md`, не расширяя дифф.

**Goal:** `GET /quote` (и любой метод, кроме `POST`) отвечает `405 Method Not
Allowed` с заголовком `Allow: POST` и телом `{"error":"Method Not Allowed"}` —
вместо нынешнего `404 {"error":"не найдено"}`. `POST /quote` работает как
раньше.

**Architecture:** один guard в HTTP-обёртке `src/server.mjs`, по образцу уже
существующих проверок `/healthz` (строки 107–115) и `/stats` (117–122): путь
совпал, метод не тот → `405` + `Allow`. Guard ставится **до** POST-ветки и
**до** раздачи статики, чтобы запрос перестал проваливаться в `serveStatic` и
падать в общий `404` (строка 168). Расчёт (`src/pricing.mjs`) и метрики не
трогаются.

**Tech Stack:** Node.js >= 22, только stdlib — `node:http`, `node:test`,
`node:assert/strict`. Зависимостей у сервиса нет и не появляется.

## Как собран этот план

`.harness/` на этом прогоне содержит только `context.md` — ни `requirements.md`,
ни `howtodemo.md` не собрались. Граница MVP взята из тела Issue (`.task.md`):
curl-сценарий «было/должно работать» + «`POST /quote` продолжает работать как
раньше» + правило репозитория «новая логика — новый тест».

## Global Constraints

- Тесты гонять той же командой, что и CI (`.github/workflows/ci.yml`):
  `node --test "tests/*.test.mjs"`. Красный прогон в PR не отдаём.
- Новая логика — новый тест; правка без теста в этом репозитории считается
  незавершённой.
- Зависимостей нет: задачу закрываем из stdlib, новых пакетов не заводим.
- `src/server.mjs` остаётся тонкой обёрткой — только разбор запроса и коды
  ответов. `src/pricing.mjs` не меняется вообще.
- Ответ на не-POST `/quote` дословно: статус `405`, заголовок `Allow: POST`,
  тело `{"error":"Method Not Allowed"}` — тот же формат, что у `/healthz` и
  `/stats`.
- `405` по `/quote` **не** инкрементирует `visits`/`successes` — как и `405`
  у `/healthz` и `/stats`.
- Границы Issue: меняется поведение только `/quote` и только для методов,
  отличных от `POST`. Раздача статики, расчёт и остальные эндпоинты — без
  изменений; условие POST-ветки (`pathname === '/quote' && req.method ===
  'POST'`) не «упрощать» — минимальный дифф.
- Коммит, пуш и PR делает workflow после агента. В плане нет `git commit` /
  `git push`; рабочее дерево остаётся с правками.
- Ветка по конвенции репозитория: `fix/163-quote-405-allow-post`.
- Edge-кейсы, найденные по дороге, в эту ветку не брать — записывать в
  `.followups.md` в корне рабочего каталога (раздел `## <кратко>` на находку).

---

### Task 0: Спросить индекс repowise до первой правки

**Files:**
- Create: ничего (диалог с индексом публикуется артефактом автоматически)

**Interfaces:**
- Consumes: пусто — задача независима, это обязательный прегрев перед правками.
- Produces: ответы индекса по компонентам `/quote` и раздаче статики; ними
  пользуется Task 1 при формулировке тестов и Task 2 при выборе места guard-а.

- [ ] **Step 1: Задать индексу вопрос о компонентах, которые собираемся менять**

До чтения файлов по существу и до первой правки — не меньше одного вопроса к
MCP-серверу `repowise` (`search_codebase`, `get_context`, `get_symbol` или
`get_answer`) про `app` в `src/server.mjs`: кто ещё вызывает этот обработчик,
как устроена раздача статики и почему `/quote` объявлен только под `POST`.
Если индекс недоступен (вызов вернул ошибку) — работать без него, это штатный
режим; пропускать шаг «потому что задача простая» нельзя.

---

### Task 1: Красные тесты на 405 для не-POST `/quote`

**Files:**
- Modify: `tests/server.test.mjs` (дописать в конец файла, после тестов
  «Тесты валидации Content-Type», с шапкой-разделителем в стиле существующих)
- Test: `tests/server.test.mjs`

**Interfaces:**
- Consumes: пусто — тесты от предыдущих задач не зависят. Используют уже
  существующие в этом файле импорты и хелпер: `request(url, method, body,
  customHeaders)` (строки 15–81) и синглтон `counters` из `src/metrics.mjs`.
- Produces: пять тестов, фиксирующих контракт не-POST `/quote` — статус `405`,
  заголовок `Allow: POST`, тело `{"error":"Method Not Allowed"}`, `visits` не
  растёт, `POST /quote` остаётся `200`. Task 2 принимает их как спецификацию.

- [ ] **Step 1: Дописать тесты в конец `tests/server.test.mjs`**

```js

// === Метод, отличный от POST, на /quote ===

test('GET /quote возвращает 405 с заголовком Allow: POST', async () => {
  const res = await request('/quote', 'GET');
  assert.equal(res.statusCode, 405);
  assert.equal(res.body.error, 'Method Not Allowed');
  assert.equal(res.headers['Allow'], 'POST');
});

test('PUT /quote возвращает 405 с заголовком Allow: POST', async () => {
  const res = await request('/quote', 'PUT');
  assert.equal(res.statusCode, 405);
  assert.equal(res.body.error, 'Method Not Allowed');
  assert.equal(res.headers['Allow'], 'POST');
});

test('DELETE /quote возвращает 405 с заголовком Allow: POST', async () => {
  const res = await request('/quote', 'DELETE');
  assert.equal(res.statusCode, 405);
  assert.equal(res.body.error, 'Method Not Allowed');
  assert.equal(res.headers['Allow'], 'POST');
});

test('GET /quote не инкрементирует visits', async () => {
  const before = counters.getStats().visits;
  await request('/quote', 'GET');
  const after = counters.getStats().visits;
  assert.equal(after, before);
});

test('POST /quote продолжает работать как раньше', async () => {
  const res = await request('/quote', 'POST', {
    items: [{ sku: 'a', price: 1000, qty: 1 }],
  });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.goods, 1000);
  assert.equal(res.body.delivery, 300);
  assert.equal(res.body.total, 1300);
});
```

Трио `GET`/`PUT`/`DELETE` повторяет форму уже существующих тестов на `405`
для `/healthz` и `/stats` (там оно зеркальное — `POST`/`PUT`/`DELETE` против
GET-only эндпоинта). Тесты на `visits` и на `POST` — регрессионные: они
проходят и до правки, они фиксируют то, что Issue требует не сломать.

- [ ] **Step 2: Прогнать файл и убедиться, что новые тесты красные**

Run: `node --test tests/server.test.mjs`
Expected: FAIL — ровно три новых теста падают (`GET`/`PUT`/`DELETE /quote`) на
первом ассерте с сообщением вида
`Expected values to be strictly equal: 404 !== 405`. Два регрессионных теста
(`visits`, `POST /quote`) зелёные и до правки. Остальные тесты файла зелёные.

- [ ] **Step 3: Зафиксировать красный прогон как точку отсчёта**

Ничего не править в `src/`. Если упало что-то, кроме трёх названных тестов, —
остановиться и разобраться, а не идти дальше: значит, тест написан не так, как
думалось.

---

### Task 2: Guard `405` в `src/server.mjs`

**Files:**
- Modify: `src/server.mjs:124` — вставить guard между блоком `/stats`
  (заканчивается строкой 122) и POST-веткой `/quote` (строка 124)
- Test: `tests/server.test.mjs`

**Interfaces:**
- Consumes: контракт из Task 1 (`405` + `Allow: POST` +
  `{"error":"Method Not Allowed"}`, метрики не трогаем). Внутри файла
  использует уже существующие `pathname` (строка 105) и `send(res, code, body,
  extraHeaders)` (строки 29–37) — новых функций не заводить.
- Produces: поведение `/quote` — любой метод, кроме `POST`, получает `405` до
  того, как дойдёт до раздачи статики; POST-ветка (строки 124–158) и
  раздача статики (строки 160–166) не изменены. Task 3 принимает это как
  готовое поведение для HowToDemo.

- [ ] **Step 1: Вставить guard перед POST-веткой `/quote`**

Между строкой 123 (пустая) и строкой 124:

```js
  // Не POST на /quote — 405 с Allow, как у /healthz и /stats: без guard-а
  // запрос проваливается в раздачу статики и отвечает 404 про файл.
  if (pathname === '/quote' && req.method !== 'POST') {
    return send(res, 405, { error: 'Method Not Allowed' }, { 'Allow': 'POST' });
  }
```

Guard стоит **до** POST-ветки и **до** `if (req.method === 'GET')` со статикой,
поэтому: не-POST до статики не доходит, а POST-ветка не меняет ни строки.
Счётчики `counters.incVisit()` / `incSuccess()` остаются внутри POST-ветки,
так что `405` метрики не двигает.

- [ ] **Step 2: Прогнать весь набор тестов**

Run: `node --test "tests/*.test.mjs"`
Expected: PASS — все тесты всех четырёх файлов, включая пять новых и все
старые (`/healthz`, `/stats`, Content-Type, 413, метрики, расчёт в
`pricing.test.mjs`).

- [ ] **Step 3: Прогнать HowToDemo из Issue на живом сервере**

```bash
PORT=8080 node src/server.mjs &
sleep 1

# 1. Главное из Issue: не-POST на /quote — 405 с Allow: POST
curl -i http://localhost:8080/quote
#   HTTP/1.1 405 Method Not Allowed
#   Allow: POST
#   {"error":"Method Not Allowed"}

# 2. POST /quote продолжает работать: расчёт не меняется
curl -i -X POST http://localhost:8080/quote \
  -H 'content-type: application/json' \
  -d '{"items":[{"sku":"a","price":1000,"qty":2}]}'
#   HTTP/1.1 200 … {"goods":2000,"delivery":300,"total":2300,...}

# 3. Статика не тронута
curl -i http://localhost:8080/
#   HTTP/1.1 200 … text/html

# 4. Соседние эндпоинты не тронуты
curl -i http://localhost:8080/healthz          # 200 {"status":"ok",...}
curl -i -X POST http://localhost:8080/healthz  # 405, Allow: GET
curl -i http://localhost:8080/stats            # 200

kill %1
```

Expected: все пять проверок совпадают с комментариями. Любое расхождение —
назад к Step 1, без расширения диффа.

- [ ] **Step 4: Проверить, что дифф ровно такой, как задумано**

Run: `git diff --stat`
Expected: два файла — `src/server.mjs` (+6 строк: guard и две строки коммента)
и `tests/server.test.mjs` (только добавленные тесты, без удалений). Что-либо
ещё — убрать, это не относится к Issue #163.

---

### Task 3: Завершение прогона — след решения и находки

**Files:**
- Create: `.reflect.md` (корень рабочего каталога; в коммит не попадает —
  его снимает контур)
- Create: `.followups.md` (корень рабочего каталога; только если есть
  настоящая находка — выдумывать не надо)

**Interfaces:**
- Consumes: результат Task 1 и Task 2 — рабочее дерево с правками в
  `src/server.mjs` и `tests/server.test.mjs` и зелёным прогоном.
- Produces: зафиксированный HowToDemo, `.reflect.md` с тремя разделами и
  (при находках) `.followups.md`. В git ничего не коммитится и не пушится.

- [ ] **Step 1: Финальный прогон тестов**

Run: `node --test "tests/*.test.mjs"`
Expected: PASS целиком. Без зелёного прогона работу не завершать.

- [ ] **Step 2: Записать находки в `.followups.md` (если есть)**

По одному разделу `## <кратко>` на находку, с файлом/строкой и тем, когда
всплывёт. Кандидаты, обнаруженные при планировании — проверить и записать, если
подтвердятся своими глазами:

- `README.md:36` — таблица маршрутов обещает для `POST /quote` коды
  «200, 400, 404, 415»: `404` для POST-ветки недостижим, а появившийся `405`
  для не-POST методов в таблице не назван. Сценарий приёмки проходит и без
  правки документации, поэтому строка не входит в эту ветку.
- `OPTIONS /quote` теперь тоже отвечает `405` — отдельного ответа на `OPTIONS`
  (и CORS) у сервиса нет нигде.

Честно незакрытых находок нет — файла не создавать.

- [ ] **Step 3: Записать `.reflect.md`**

Три раздела по строке на пункт: `## Намерение` — почему guard до POST-ветки и
статики, а не внутри неё; `## Допущения` — что принято на веру (например, что
`405` не должен считаться визитом в метриках); `## Сомнения` — что стоит
перепроверить человеку.

- [ ] **Step 4: Оставить рабочее дерево для workflow**

Ничего не коммитить и не пушить: коммит, пуш и PR делает workflow после агента.
Проверить `git status --short` — в изменениях только файлы из Task 2.

---

## Вне MVP

Не входит в эту ветку — сценарий приёмки проходит и без этого. По кандидатурам
снимаются находки в `.followups.md` (Task 3, Step 2), SubIssue по ним заводит
контур.

1. **Таблица маршрутов в `README.md:36`.** После правки для `POST /quote`
   реальны коды `200, 400, 405, 413, 415`, а не «200, 400, 404, 415».
   Документацию стоит привести в соответствие, но на curl-сценарий она не
   влияет; если ревьюер согласен, её можно донести в этом же PR отдельной
   строкой диффа — решение за ревьюером, не за исполнителем.
2. **`OPTIONS` и CORS.** Ни один эндпоинт не отвечает на `OPTIONS` отдельно;
   `/quote` теперь отвечает `405` и там. Для демо-стенда этого достаточно.
3. **`HEAD /quote`.** Тоже `405` с `Allow: POST`. Это корректно (GET на
   `/quote` нет, пары GET/HEAD не возникает), но поведение стоит знать при
   ревью.
4. **Общий fallback `404`.** Неизвестный путь при любом методе по-прежнему
   отвечает `404 {"error":"не найдено"}` — границы Issue это не трогают.
