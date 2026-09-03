# Issue #169: HEAD /healthz — план работ

> **Для агента-исполнителя:** план исполняется задача за задачей, шаги помечены
> чекбоксами (`- [ ]`). Прогон неинтерактивный — вопросов некому: всё, что нужно
> решать по ходу, зафиксировано в самих задачах и в «Глобальных ограничениях».

**Goal:** `HEAD /healthz` отвечает `200` с теми же заголовками, что GET, и пустым
телом — вместо нынешнего `405`, из-за которого мониторинг считает сервис
мёртвым.

**Architecture:** правка только в HTTP-обёртке (`src/server.mjs`). `send()`
получает опцию `head`: заголовки пишутся как у GET (включая `content-length`
будущего тела), тело не пишется. Guard ветки `/healthz` пускает `GET` и `HEAD`,
остальные методы по-прежнему `405`, но с актуальным `Allow: GET, HEAD`.
Арифметика и `src/pricing.mjs` не затрагиваются.

**Tech Stack:** Node.js >= 22, только стандартная библиотека (`node:http` в
тестах), `node --test`. Зависимостей нет — это свойство сервиса.

**HowToDemo (граница MVP, из `.harness/howtodemo.md`):**

> было — запрос `HEAD /healthz` возвращает код 405; стало — запрос `HEAD
> /healthz` возвращает код 200 с теми же заголовками, что и GET, и с пустым
> телом.

## Глобальные ограничения

- Зависимости не заводятся: всё закрывается `node:http`, `node:assert/strict`,
  `node:test`.
- `src/pricing.mjs` не меняется — в этой задаче нет арифметики.
- Комментарии в коде — на русском, в стиле окружающего кода `src/server.mjs`.
- Проверка — та же, что в CI: `node --test "tests/*.test.mjs"`. Красный прогон
  в PR не отдаётся: последний шаг каждой задачи — зелёный полный прогон.
- **Коммитить не надо** — коммит, пуш и PR делает workflow после прогона
  (`.task.md`, п. 4). Исполнитель оставляет рабочее дерево в нужном состоянии.
  Ветка, если её создаёт контур, — `fix/169-healthz-head`, PR несёт
  `Closes #169` (правило репозитория: ветка и PR = Issue).
- Изменение контракта `405` на `/healthz` — часть задачи, а не лишнее: ответ
  `Allow: GET` при принимаемом HEAD был бы неверным (RFC 9110 §15.5.5 требует
  перечислять реально поддерживаемые методы). Три существующих теста на
  `Allow: GET` обновляются в задаче 1, там же, где меняется контракт.
- HEAD на другие маршруты (кроме теста-границы на `/stats`) в эту ветку не
  входит — см. «Вне MVP».

---

### Task 1: `send()` умеет HEAD, guard `/healthz` пускает HEAD

**Files:**
- Modify: `src/server.mjs:29-37` (функция `send`)
- Modify: `src/server.mjs:107-115` (ветка `/healthz` в `app`)
- Test: `tests/server.test.mjs` — два новых теста после теста
  `DELETE /healthz возвращает 405...` (сейчас строка 182) и правка `Allow` в
  трёх существующих тестах (сейчас строки 167, 174, 181)

**Interfaces:**
- Consumes: ничего из новых задач. Опирается на существующее: `send(res, code,
  body, extraHeaders)` в `src/server.mjs:29` и mock-хелпер
  `request(url, method, body, customHeaders)` в `tests/server.test.mjs:15`,
  который возвращает `{ statusCode, headers, body }`, где `headers` — тот
  объект, что передан в `writeHead` (значения не приведены к строке).
- Produces: сигнатура `send(res, code, body, extraHeaders = {}, { head = false
  } = {})` — при `head: true` заголовки пишутся как для GET, тело не пишется.
  Контракт `/healthz`, на который опирается задача 2: `GET` и `HEAD` → `200`,
  тело `{"status":"ok","uptime_sec":<int>}` (у HEAD тела нет, `content-length`
  как у GET); прочие методы → `405` с `Allow: GET, HEAD`.

- [ ] **Шаг 1: спросить индекс repowise до первой правки**

Обязательно по `.task.md` (п. «Индекс кода»): не меньше одного вопроса про
меняемые компоненты и их связи — `search_codebase` / `get_context` /
`get_symbol` по темам «ветка `/healthz` в `src/server.mjs`», «кто вызывает
`send()`», «HEAD-обработка в обёртке». Ответы могут назвать места, трогать
которые нельзя, — это дешевле узнать до правки. Индекс недоступен (вызов
вернул ошибку) — работать без него, это штатный режим; «задача простая»
основанием пропуска не считается.

- [ ] **Шаг 2: написать падающие тесты**

В `tests/server.test.mjs` сразу после теста
`DELETE /healthz возвращает 405 с заголовком Allow: GET` добавить:

```js
test('HEAD /healthz возвращает 200 с заголовками GET и пустым телом', async () => {
  // Патчим uptime, чтобы content-length был предсказуем: HEAD обязан нести
  // content-length ровно того тела, которое отдал бы GET, а без патча целая
  // секунда может переключиться между запросами и тест станет плавающим.
  const realUptime = process.uptime;
  process.uptime = () => 7;
  try {
    const get = await request('/healthz', 'GET');
    const head = await request('/healthz', 'HEAD');

    assert.deepEqual(get.body, { status: 'ok', uptime_sec: 7 });
    assert.equal(head.statusCode, 200);
    assert.equal(head.body, ''); // тело пустое — в этом смысл HEAD
    assert.equal(head.headers['content-type'], 'application/json; charset=utf-8');
    // content-length как у GET, хотя самого тела нет
    assert.equal(
      head.headers['content-length'],
      Buffer.byteLength(JSON.stringify(get.body))
    );
  } finally {
    process.uptime = realUptime;
  }
});

test('HEAD /stats остаётся 405: HEAD разрешён только на /healthz', async () => {
  const res = await request('/stats', 'HEAD');
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers['Allow'], 'GET');
});
```

В трёх существующих тестах на `/healthz` (POST, PUT, DELETE) заменить ожидание
заголовка — контракт 405 меняется вместе с guard-ом:

```js
  assert.equal(res.headers['Allow'], 'GET, HEAD');
```

Тесты на `/stats` (там POST/PUT/DELETE) не трогаются: на `/stats` HEAD не
разрешается, `Allow: GET` там остаётся верным.

- [ ] **Шаг 3: прогнать, убедиться, что красный**

Run: `node --test tests/server.test.mjs`
Expected: FAIL, 4 упавших теста:
- `HEAD /healthz возвращает 200 ...` — `head.statusCode` равен `405`, а не `200`;
- `POST /healthz ...`, `PUT /healthz ...`, `DELETE /healthz ...` — `Allow`
  равен `'GET'`, а не `'GET, HEAD'`.

Тест `HEAD /stats остаётся 405 ...` зелёный уже сейчас — он фиксирует границу
MVP и страхует от того, чтобы fix расползся на `/stats`.

- [ ] **Шаг 4: минимальная правка в `src/server.mjs`**

В функции `send` (сейчас строки 29-37) добавить пятый параметр и условное тело:

```js
function send(res, code, body, extraHeaders = {}, { head = false } = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    ...extraHeaders
  });
  // HEAD отвечает теми же заголовками, что GET (включая content-length), но
  // без тела: на нём живость проверяют балансировщики и мониторинг.
  res.end(head ? undefined : payload);
}
```

В ветке `/healthz` (сейчас строки 107-115) пустить HEAD и актуализировать
`Allow`:

```js
  if (pathname === '/healthz') {
    const isHead = req.method === 'HEAD';
    if (req.method !== 'GET' && !isHead) {
      return send(res, 405, { error: 'Method Not Allowed' }, { 'Allow': 'GET, HEAD' });
    }
    return send(res, 200, {
      status: 'ok',
      uptime_sec: Math.floor(process.uptime())
    }, {}, { head: isHead });
  }
```

Больше ничего в `src/server.mjs` не менять: ветки `/stats` и `/quote` остаются
как были.

- [ ] **Шаг 5: полный зелёный прогон**

Run: `node --test "tests/*.test.mjs"`
Expected: PASS — все файлы, включая обновлённые тесты на `Allow` и оба новых.
Красный прогон дальше не передаётся.

---

### Task 2: приёмка по HowToDemo — тест на живом сервере и артефакты прогона

**Files:**
- Test: `tests/healthz.test.mjs` — один новый тест в конец файла
- Create: `.followups.md` (корень рабочего каталога, в `.gitignore` уже есть)
- Create: `.reflect.md` (корень рабочего каталога, контур снимает сам)

**Interfaces:**
- Consumes: из задачи 1 — контракт `/healthz` (HEAD → `200`, пустое тело,
  заголовки как у GET) и опция `head` в `send()`. Mock-хелпер здесь не
  годится: он не повторяет поведение реального `node:http`, который сам
  отбрасывает тело HEAD-ответа, поэтому приёмка — через `createServer(app)` и
  `fetch`, как в существующем первом тесте этого файла.
- Produces: для кода — ничего; для контура — `.followups.md` (постановки для
  SubIssue) и `.reflect.md` (след решения).

- [ ] **Шаг 1: тест на реальном сервере**

В конец `tests/healthz.test.mjs` добавить — в стиле уже существующего теста
на GET в этом же файле:

```js
test('HEAD /healthz возвращает 200 с пустым телом', async () => {
  const server = createServer(app);
  const port = 0; // случайный свободный порт

  await new Promise(resolve => server.listen(port, resolve));

  const res = await fetch(`http://localhost:${server.address().port}/healthz`, {
    method: 'HEAD'
  });
  const body = await res.text();

  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'application/json; charset=utf-8');
  assert.equal(body, '');

  server.close();
});
```

Равенство `content-length` с GET здесь не проверяется: у живого сервера длина
зависит от `uptime_sec`, а эта часть контракта уже покрыта детерминированно в
задаче 1. Здесь проверяется то, чего mock не видит, — что по проводу у HEAD
нет тела и нет 405.

- [ ] **Шаг 2: прогон файла**

Run: `node --test tests/healthz.test.mjs`
Expected: PASS — оба теста (старый на GET и новый на HEAD). Правка из задачи 1
уже в рабочем дереве, поэтому красного здесь быть не должно; красный — повод
вернуться в задачу 1, а не править тест.

- [ ] **Шаг 3: полный зелёный прогон**

Run: `node --test "tests/*.test.mjs"`
Expected: PASS, все файлы.

- [ ] **Шаг 4: прогнать HowToDemo вживую**

Сценарий из `.harness/howtodemo.md`, один в один:

```bash
node src/server.mjs &
sleep 1
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/healthz
# → 200
curl -s -o /dev/null -w '%{http_code}\n' -I http://localhost:8080/healthz
# → 200  (было 405)
curl -s -D - -o /dev/null http://localhost:8080/healthz
# заголовки GET
curl -s -D - -o /dev/null -I http://localhost:8080/healthz
# те же заголовки у HEAD (content-type, content-length совпадают), тела нет
kill %1
```

Критерий: оба кода `200`, наборы заголовков совпадают, у HEAD тело пустое.
Если живой прогон невозможен в этом окружении — сказать об этом прямо в
отчёте прогона, а не засчитывать сценарий по тестам.

- [ ] **Шаг 5: записать найденные edge-кейсы в `.followups.md`**

Два находки за пределами MVP, в эту ветку не брать. Номера строк перед записью
сверить с фактическими (`grep -n "pathname === '/stats'" src/server.mjs` и
`grep -n "method === 'GET'" src/server.mjs`) — после правки задачи 1 они
сдвинулись:

```markdown
## HEAD /stats отвечает 405

Guard `/stats` пускает только GET и отдаёт 405 с `Allow: GET`
(src/server.mjs, ветка `pathname === '/stats'`). Тот же аргумент, что в #169,
но для `/stats`: HEAD — тот же GET без тела. В MVP не взят: живость проверяют
по `/healthz`, `/stats` — ручной дашборд. Граница зафиксирована тестом
«HEAD /stats остаётся 405» в tests/server.test.mjs.

## HEAD на статические файлы отвечает 404

Раздача статики завёрнута в `if (req.method === 'GET')`
(src/server.mjs, ветка «Serve static files»): HEAD на существующий файл
проваливается в 404 «не найдено». Затронет прокси и краулеры, пингующие
страницы HEAD-ом; в MVP не нужен — HowToDemo про `/healthz`.
```

Если по дороге нашлось что-то ещё — дописать по разделу на находку в том же
формате. Выдумывать находки ради галочки не надо; если бы ничего не нашлось,
файл не создавался бы.

- [ ] **Шаг 6: записать след решения в `.reflect.md`**

Три раздела, по строке на пункт, — то, чего по диффу не восстановить:

```markdown
## Намерение
## Допущения
## Сомнения
```

Что писать: в «Намерение» — почему правка в `send()` опцией, а не отдельной
функцией или разветвлением в обработчике; в «Допущения» — например, что
`content-length` у HEAD должен равняться длине GET-тела (RFC 9110 §9.3.2), а
не нулю; в «Сомнения» — что стоит перепроверить человеку. Пустых разделов не
оставлять.

- [ ] **Шаг 7: оставить рабочее дерево**

Коммит не делать — коммит, пуш и PR делает workflow. Проверить
`git status --short` и `git diff`: изменены только `src/server.mjs`,
`tests/server.test.mjs`, `tests/healthz.test.mjs`; `.followups.md` и
`.reflect.md` лежат в корне рабочего каталога и в PR не уезжают
(`.followups.md` в `.gitignore`).

---

## Вне MVP

Не входит в эту ветку, берётся отдельными SubIssue по находкам из
`.followups.md`:

- **HEAD /stats** — сейчас 405; симметрично #169, но живость проверяют по
  `/healthz`, поэтому к HowToDemo не ведёт. Граница закреплена тестом в
  задаче 1.
- **HEAD на статику** — сейчас 404: раздача статики только для GET.
- **OPTIONS на `/healthz`** — сейчас 405; отдельный обработчик OPTIONS нужен,
  только если такой запрос появится в реальном трафике.

Осознанно оставлено как есть (не находка, а норма RFC): `HEAD /quote` и
`HEAD /stats` отвечают 405 с корректным `Allow` — на ресурсе без метода GET
это правильный ответ.
