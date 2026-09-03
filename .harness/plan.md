# HEAD на `/healthz` и `/stats` — Implementation Plan (Issue #171)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> Прогон неинтерактивный: вопросов некому — сомнения фиксируются в `.reflect.md`
> (задача 3), а не диалогом. План только читается, шаги исполняются по порядку.

**Goal:** `HEAD /healthz` и `HEAD /stats` отвечают `200` с теми же заголовками,
что и `GET`, и пустым телом (сейчас оба попадают в ветку `405`).

**Architecture:** правка только в HTTP-обёртке `src/server.mjs`: guard двух
маршрутов пропускает `HEAD` наряду с `GET`, а `send()` получает флаг `omitBody`,
который пишет заголовки от полного ответа, но не пишет само тело. Арифметика
(`src/pricing.mjs`) не затрагивается — здесь её нет вовсе.

**Tech Stack:** Node.js 22, `node:http`, `node:test` + `node:assert/strict`.
Зависимостей у сервиса нет и не появляется.

## Global Constraints

- **Git не трогаем.** Коммит, пуш и PR делает workflow после прогона
  (`.task.md` «Как работать» п. 4). Шагов `git commit` в плане нет; результат —
  рабочее дерево в нужном состоянии.
- **Проверка та же, что в CI:** `node --test "tests/*.test.mjs"`. Красный прогон
  в PR не отдаём — failing-тесты и правка уходят вместе, в одной задаче.
- **Новая логика — новый тест.** Правка без теста на неё считается
  незавершённой (`.task.md` п. 3, `CLAUDE.md` «Проверки»).
- **Арифметика — в `src/pricing.mjs` чистыми функциями;** `src/server.mjs` только
  разбирает запрос и отдаёт коды. Эта задача не добавляет расчётов.
- **Зависимости не заводить** — всё нужною закрывается `node:http` и
  глобальным `fetch`.
- **MVP-граница = `.harness/howtodemo.md`:** «было — запросы `HEAD /healthz` и
  `HEAD /stats` возвращают код 405; стало — оба возвращают код 200 с теми же
  заголовками, что и GET, и с пустым телом».
- **Комментарии и имена тестов — на русском,** как во всём репозитории.
- **Индекс `repowise` (MCP) до первой правки** — обязательный шаг `.task.md`:
  минимум один вопрос про компоненты, которые меняются. Если вызов вернул
  ошибку — работаем без индекса, это штатный режим. В этой сессии планирования
  инструмента `repowise` не было, поэтому запрос остаётся за исполнителем.

## Источники

- `.harness/context.md` → называет только `howtodemo.md`. `requirements.md` не
  собрался — работаем от тела Issue (`.task.md`), это штатный путь.
- `.task.md` — постановка, включая curl-проверку и правила прогона.
- `src/server.mjs` — ветки `/healthz` (строки 107–115) и `/stats` (117–122) с
  guard-ом `req.method !== 'GET'` → 405; `send()` (29–37) пишет тело всегда.
- `tests/server.test.mjs` — mock-хелпер `request(url, method, body,
  customHeaders)`, возвращающий `{statusCode, headers, body}`; там же живут
  тесты на 405 у всех прочих методов.
- `tests/healthz.test.mjs` — единственное место, где `app` гоняется через
  настоящий `createServer`.
- `README.md` — таблица маршрутов (только `GET`), раздел «Расхождения между
  README и кодом».

## Что именно меняется (суть)

1. Guard: `req.method !== 'GET'` → `req.method !== 'GET' && req.method !== 'HEAD'`
   в `/healthz` и `/stats`. `Allow: GET` в 405-ответе **не меняется** — см.
   «Вне MVP».
2. Тело: `send()` получает пятый параметр `omitBody`. Заголовки считаются от
   полного ответа (`content-length` остаётся длиной тела GET — на неё и опирается
   мониторинг), а `res.end()` вызывается без payload. Явное подавление нужно
   потому, что mock-обёртка тестов записывает в `body` всё, что ушло в
   `res.end()`, и assertion «тело пустое» иначе проверить нельзя; relying on
   транспорт («реальный Node сам срежет тело HEAD-ответа») — это логика, которой
   в коде не видно, а `CLAUDE.md` прямо просит не прятать логику в обёртке.

---

### Task 1: HEAD на `/healthz` и `/stats` — guard и пустое тело

**Files:**
- Modify: `src/server.mjs` (функция `send`, строки 29–37; `app`, строки 103–122)
- Modify: `tests/server.test.mjs` (вставка после теста `DELETE /stats…`, строка 217)
- Modify: `README.md` (строка после таблицы маршрутов, после строки 36)

**Interfaces:**
- Consumes: mock-хелпер `request(url, method = 'GET', body = null,
  customHeaders = {})` из `tests/server.test.mjs` — уже есть, возвращает
  `{statusCode, headers, body}`; для HEAD вызывается как
  `request('/healthz', 'HEAD')`. Функция `send(res, code, body, extraHeaders = {})`
  из `src/server.mjs` — уже есть, расширяем её сигнатуру.
- Produces: `send(res, code, body, extraHeaders = {}, omitBody = false)` — при
  `omitBody: true` заголовки пишутся от полного ответа, тело не пишется;
  маршруты `/healthz` и `/stats` отвечают `200` на `GET` и `HEAD` (HEAD — с
  пустым телом) и `405` c `Allow: GET` на все прочие методы. Больше никто из
  задач этот интерфейс не использует — остальные `send(...)` в файле остаются
  с четырьмя аргументами и дефолтным `omitBody: false`.

- [ ] **Шаг 1: спросить индекс `repowise` (если он доступен), до правок**

  Вопросы: кто, кроме `/healthz` и `/stats`, читает `send()` из
  `src/server.mjs`; почему guard у этих маршрутов устроен через
  `req.method !== 'GET'`, а не через белый список (история и решение —
  `get_why`/`get_risk`). Ошибка вызова → идём дальше без индекса.

- [ ] **Шаг 2: написать failing-тесты (mock-уровень)**

  Вставить в `tests/server.test.mjs` сразу после теста
  `DELETE /stats возвращает 405…`:

  ```js
  // === HEAD на /healthz и /stats (Issue #171) ===

  test('HEAD /healthz возвращает 200 с заголовками GET и пустым телом', async () => {
    const getRes = await request('/healthz', 'GET');
    const res = await request('/healthz', 'HEAD');

    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['content-type'], getRes.headers['content-type']);
    assert.ok(Number(res.headers['content-length']) > 0);
    assert.equal(res.body, '');
  });

  test('HEAD /stats возвращает 200 с теми же заголовками, что GET, и пустым телом', async () => {
    const getRes = await request('/stats', 'GET');
    const res = await request('/stats', 'HEAD');

    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['content-type'], getRes.headers['content-type']);
    assert.equal(res.headers['content-length'], getRes.headers['content-length']);
    assert.equal(res.body, '');
  });

  test('HEAD /healthz не инкрементирует visits', async () => {
    const before = counters.getStats().visits;
    await request('/healthz', 'HEAD');
    const after = counters.getStats().visits;
    assert.equal(after, before);
  });
  ```

  Почему у `/stats` сравнивается `content-length` один в один, а у `/healthz`
  только «больше нуля»: тело `/healthz` содержит `uptime_sec`, и точное сравнение
  двух ответов, разнесённых по времени, рассыпалось бы на границе разряда
  (9 → 10 секунд). `/stats` между двумя соседними вызовами не меняется — там
  сравнение точное и детерминированное.

  Пустое тело mock показывает как `''`: `request()` пробует `JSON.parse('')`,
  падает и возвращает строку как есть.

- [ ] **Шаг 3: убедиться, что тесты красные**

  Run: `node --test tests/server.test.mjs`
  Expected: FAIL — три новых теста, в каждом `actual: 405`, `expected: 200`
  (HEAD пока попадает в guard). Остальные тесты файла зелёные.

- [ ] **Шаг 4: минимальная правка `src/server.mjs`**

  4.1. Заменить `send` целиком:

  ```js
  function send(res, code, body, extraHeaders = {}, omitBody = false) {
    const payload = JSON.stringify(body);
    res.writeHead(code, {
      'content-type': 'application/json; charset=utf-8',
      'content-length': Buffer.byteLength(payload),
      ...extraHeaders
    });
    // HEAD отвечает теми же заголовками, что и GET, но без тела
    // (RFC 9110 §9.3.2): content-length остаётся длиной полного ответа —
    // по нему мониторинг и сравнивает живой сервис.
    res.end(omitBody ? undefined : payload);
  }
  ```

  4.2. В начале `app`, сразу после `const pathname = url.pathname;`:

  ```js
    // HEAD — это GET без тела: так живость проверяют балансировщики и мониторинг.
    const omitBody = req.method === 'HEAD';
  ```

  4.3. Маршрут `/healthz` целиком:

  ```js
    if (pathname === '/healthz') {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        return send(res, 405, { error: 'Method Not Allowed' }, { 'Allow': 'GET' });
      }
      return send(res, 200, {
        status: 'ok',
        uptime_sec: Math.floor(process.uptime())
      }, {}, omitBody);
    }
  ```

  4.4. Маршрут `/stats` целиком:

  ```js
    if (pathname === '/stats') {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        return send(res, 405, { error: 'Method Not Allowed' }, { 'Allow': 'GET' });
      }
      return send(res, 200, counters.getStats(), {}, omitBody);
    }
  ```

  Больше в файле ничего не менять: `/quote`, статика и финальный `404` остаются
  как есть (см. «Вне MVP»).

- [ ] **Шаг 5: убедиться, что тесты зелёные**

  Run: `node --test tests/server.test.mjs`
  Expected: PASS, включая существующие `POST/PUT/DELETE /healthz` и
  `POST/PUT/DELETE /stats` → `405` c `Allow: GET` (их ассерты не правим).

- [ ] **Шаг 6: одна строка в README, чтобы не наращивать дрейф**

  Сразу после таблицы маршрутов в `README.md` (после строки с `POST /quote`)
  добавить:

  ```markdown

  `HEAD` на `/healthz` и `/stats` отвечает `200` с теми же заголовками, что и
  `GET`, но без тела — так живость проверяют балансировщики и мониторинг.
  ```

  Раздел «Расхождения между README и кодом» не трогаем — там накопленный дрейф,
  к этой задаче не относящийся.

---

### Task 2: транспортная проверка HEAD — реальный сокет вместо mock

Mock-обёртка из задачи 1 не проходит по настоящему HTTP: она проверяет
`app(req, res)` и видит только то, что ушло в `res.end()`. Сценарий приёмки
снимается curl-ом с живого сервера, поэтому у MVP должна быть и автоматическая
проверка на транспорте — иначе сломать HEAD на уровне `createServer` тесты не
заметят.

**Files:**
- Create: `tests/head.test.mjs`

**Interfaces:**
- Consumes: экспорт `app(req, res)` из `src/server.mjs` (уже есть,
  `tests/healthz.test.mjs` использует его так же); поведение из задачи 1 —
  `HEAD` на `/healthz` и `/stats` отвечает `200` с заголовками GET и пустым
  телом. Ничего нового в прод-коде не появляется.
- Produces: ничего — файл только проверяет. Ништо из последующих задач его
  не импортирует.

- [ ] **Шаг 1: создать `tests/head.test.mjs` с содержимым целиком**

  ```js
  import assert from 'node:assert/strict';
  import { test } from 'node:test';
  import { createServer } from 'node:http';
  import { app } from '../src/server.mjs';

  // Сценарий приёмки Issue #171 снимается curl-ом с живого сервера. Здесь тот
  // же прогон через реальный сокет: mock-обёртка server.test.mjs не видит,
  // как HEAD выглядит на настоящем HTTP.
  async function withServer(run) {
    const server = createServer(app);
    await new Promise(resolve => server.listen(0, resolve));
    const base = `http://localhost:${server.address().port}`;
    try {
      await run(base);
    } finally {
      server.close();
    }
  }

  test('HEAD /healthz отвечает 200, заголовками GET и пустым телом', async () => {
    await withServer(async base => {
      const getRes = await fetch(`${base}/healthz`);
      await getRes.text();

      const headRes = await fetch(`${base}/healthz`, { method: 'HEAD' });
      const body = await headRes.text();

      assert.equal(headRes.status, 200);
      assert.equal(headRes.headers.get('content-type'), getRes.headers.get('content-type'));
      assert.ok(Number(headRes.headers.get('content-length')) > 0);
      assert.equal(body, '');
    });
  });

  test('HEAD /stats отвечает 200, тем же content-length, что GET, и пустым телом', async () => {
    await withServer(async base => {
      const getRes = await fetch(`${base}/stats`);
      await getRes.text();

      const headRes = await fetch(`${base}/stats`, { method: 'HEAD' });
      const body = await headRes.text();

      assert.equal(headRes.status, 200);
      assert.equal(headRes.headers.get('content-type'), getRes.headers.get('content-type'));
      assert.equal(headRes.headers.get('content-length'), getRes.headers.get('content-length'));
      assert.equal(body, '');
    });
  });
  ```

  `server.close()` без `await` — как в существующем `tests/healthz.test.mjs`;
  тела GET-ответов прочитаны до HEAD-запроса, чтобы undici вернул сокет в пул.

- [ ] **Шаг 2: прогнать файл**

  Run: `node --test tests/head.test.mjs`
  Expected: PASS — два теста. До задачи 1 файл падал бы с `405`; здесь он
  проверяет уже внесённую правку на транспорте.

- [ ] **Шаг 3: полный прогон, как в CI**

  Run: `node --test "tests/*.test.mjs"`
  Expected: PASS во всех четырёх файлах (`healthz`, `metrics`, `pricing`,
  `server`, `head`). Красный прогон в PR не отдаём.

- [ ] **Шаг 4: снять сценарий приёмки руками (как в `.task.md`)**

  В одном терминале: `node src/server.mjs` (порт по умолчанию 8080). В другом:

  ```
  $ curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/healthz
  200

  $ curl -s -o /dev/null -w '%{http_code}\n' -I http://localhost:8080/healthz
  200

  $ curl -s -o /dev/null -w '%{http_code}\n' -I http://localhost:8080/stats
  200
  ```

  Равенство заголовков с GET проверяется сравнением двух выводов:
  `curl -s -I http://localhost:8080/healthz` и
  `curl -s -D - -o /dev/null http://localhost:8080/healthz` — в обоих
  `content-type: application/json; charset=utf-8` и одинаковый `content-length`
  (для свежего процесса `/healthz` — `30`, `/stats` — `26`).

  Пустоту тела `-I` не покажет: с `--head` curl сам не ждёт тело. Её проверяет
  `tests/head.test.mjs` (`assert.equal(body, '')`); вручную при желании —
  `curl -s -X HEAD --max-time 3 http://localhost:8080/healthz`: вывода нет,
  код возврата 28 (curl ждал тело, которого сервер не прислал).

---

### Task 3: след решения и находки вне MVP

**Files:**
- Create: `.followups.md` (в корне рабочего каталога; если находок нет — файл не создавать)
- Create: `.reflect.md` (в корне рабочего каталога)

**Interfaces:**
- Consumes: результат задач 1–2 (рабочее дерево с правкой и зелёным прогоном) и
  перечень «Вне MVP» из этого плана.
- Produces: `.reflect.md` — три раздела `## Намерение` / `## Допущения` /
  `## Сомнения`; `.followups.md` — по разделу `## <кратко>` на находку в
  формате из `.task.md`. Оба файла контур снимает, в коммит они не попадают;
  SubIssue по находкам заводит контур своим токеном.

- [ ] **Шаг 1: записать находки в `.followups.md`**

  Две находки из этого прогона (после правки строки в `src/server.mjs`
  сместились — перепроверь номера перед записью):

  ```markdown
  ## Allow в 405 на /healthz и /stats не перечисляет HEAD

  После того как HEAD стал валидным методом, ответ 405 на прочие методы
  отдаёт `Allow: GET` (src/server.mjs, ветки /healthz и /stats). По
  RFC 9110 §10.2.1 Allow должен перечислять все поддерживаемые методы, то есть
  `GET, HEAD`. Правка трогает шесть существующих ассертов в
  tests/server.test.mjs и для сценария приёмки #171 не нужна.

  ## HEAD на статику отвечает 404

  Раздача статики обёрнута в `req.method === 'GET'` (src/server.mjs, блок
  «Serve static files»), поэтому `HEAD /index.html` проваливается в финальный
  404 с JSON-телом про «файл не найден». Мониторинг из #171 статикой не
  пользуется.
  ```

- [ ] **Шаг 2: записать `.reflect.md`**

  ```markdown
  # След решения

  ## Намерение
  - Тело HEAD-ответа срезаю явно в `send()` (параметр `omitBody`), а не полагаюсь
    на транспорт: сценарий приёмки требует пустого тела, mock-обёртка тестов
    видит ровно то, что ушло в `res.end()`, а спрятанная в обёртке логика — то,
    чего тест не увидит.
  - `omitBody` прокинул только в два маршрута из Issue: остальные коды ответов
    (404, 405 /quote) сценарий не трогает, а правка всех вызовов `send` раздула
    бы дифф без нужды для MVP.
  - Guard переписал на `!== 'GET' && !== 'HEAD'`, а не на список методов: правка
    одной строки в существующем условии, и 405-ветка с `Allow: GET` не меняется.

  ## Допущения
  - `Allow: GET` в 405-ответах оставил как есть — смена на `GET, HEAD` правит
    шесть существующих тестов и вынесена в `.followups.md`.
  - Индекс repowise был <доступен/недоступен — дописать, как вышло>.
  - `HEAD /quote` оставил 405 c `Allow: POST`: у /quote нет GET-представления.

  ## Сомнения
  - Не проверено, срезает ли реальный Node тело HEAD-ответа сам: при явном
    `omitBody` это ни на что не влияет, но curl-прогон из задачи 2 стоит
    посмотреть глазами.
  - `HEAD /index.html` → 404 записан в `.followups.md`, но желаемое поведение
    человеком не подтверждено.
  ```

---

## Вне MVP

Без этого сценарий приёмки проходит; в ветку не брать.

1. **`Allow: GET, HEAD` в 405 на `/healthz` и `/stats`** — корректнее по
   RFC 9110 §10.2.1, но требует правки шести существующих ассертов в
   `tests/server.test.mjs`. Записывается в `.followups.md` (задача 3).
2. **`HEAD` на статику** — сейчас 404, потому что раздача обёрнута в
   `req.method === 'GET'`. Мониторинг из Issue статикой не проверяет.
   Записывается в `.followups.md`.
3. **`omitBody` в остальных ответах** — `HEAD /quote` (405) и `HEAD /<неизвестное>`
   (404) пишут JSON-тело; явное подавление сделано только в двух маршрутах из
   Issue. На реальном сервере тело HEAD-ответа срезает сам Node, поэтому
   видимого эффекта нет; правка затронула бы ~15 call sites `send`.
4. **Раздел `README.md` «Расхождения между README и кодом»** — накопленный
   дрейф (промокоды, 415, минимальная сумма, `/stats`), к #171 отношения не
   имеет.
5. **`DELETE`/`PUT` и прочие методы** — поведение не меняется и тестами уже
   покрыто; новых веток не заводить.
