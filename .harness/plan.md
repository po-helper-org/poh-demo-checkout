# Issue #167: раздача статики выпускает файлы из каталога-соседа — план работ

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> Прогон неинтерактивный: вопрос «как исполняем» не задаётся никому — исполняй задачи по порядку. Коммит, пуш и PR после тебя делает workflow (`.task.md`, п. 4), поэтому шагов `git commit` в плане нет.

**Goal:** запрос файла из каталога-соседа, имя которого начинается с имени каталога статики (`static-secret/keys.json`), получает 404; содержимое не отдаётся. Всё остальное в раздаче статики работает как раньше.

**Architecture:** дыра — в проверке вложенности `src/server.mjs`, в `serveStatic`: она сравнивает канонический путь с `STATIC_DIR` голым `String.startsWith`, а это сравнение по символам, не по границе пути. `/app/static-secret/keys.json` начинается с `/app/static`, и проверка пропускает файл. Правка — одна строка условия: сравнивать на равенство или на префикс `STATIC_DIR + '/'`. Проверка остаётся в `server.mjs`: это разбор запроса и коды ответов, а не расчёт; наружу её не выносить.

**Tech Stack:** Node.js ≥ 22 (только `node:*`), `node:test` + `node:assert/strict`, без зависимостей.

## Global Constraints

- Зависимостей у сервиса нет намеренно. Новых пакетов не заводить; импорты только из `node:*`. В CI нет `npm ci` — это свойство сервиса, а не упущение.
- Прогон тестов — та же команда, что в CI (`.github/workflows/ci.yml`): `node --test "tests/*.test.mjs"`. Красный прогон в PR не отдаём.
- Новая логика — новый тест. Правка проверки пути без теста на неё считается незавершённой.
- `src/server.mjs` тонкий намеренно: арифметика — в `src/pricing.mjs` и тестируется без сети. Проверку пути здесь не переносить и не раздувать.
- Коммит не делать: `git add` / `git commit` / `push` — шаги workflow после агента. Рабочее дерево оставить в нужном состоянии (изменены только `src/server.mjs` и `tests/server.test.mjs`).
- Edge-кейс, найденный по дороге, в этой ветке не чинить — записать в `.followups.md` в корне рабочего каталога (раздел `## <кратко>` на находку). Найденные при планировании — в разделе «Вне MVP» этого плана.
- В конце работы — `.reflect.md` в корне рабочего каталога: `## Намерение`, `## Допущения`, `## Сомнения`, по строке на пункт.

## Файлы

- `src/server.mjs` — Modify: функция `serveStatic`, строки 55–83; меняется только условие на строках 69–71.
- `tests/server.test.mjs` — Modify: блок импортов (строки 1–4) + новый раздел тестов в конце файла (после строки 366).

Новых файлов нет.

---

### Task 1: Проверка вложенности по границе пути + тесты

**Files:**
- Modify: `src/server.mjs:65-71` (комментарий и условие в `serveStatic`)
- Test: `tests/server.test.mjs` (импорты в шапке, тесты в конце файла)

**Interfaces:**
- Consumes: пусто — задача независима. Опирается только на уже существующие поверхности: экспорт `app(req, res)` из `src/server.mjs` и вспомогательную `request(url, method, body, customHeaders)` в `tests/server.test.mjs:15` (поднимает фейковые req/res, реального сервера не нужно).
- Produces: `serveStatic(url)` в `src/server.mjs` отдаёт файл только если канонический путь равен `STATIC_DIR` или начинается с `STATIC_DIR + '/'` (после нормализации обратных слэшей). Для последующих задач: тесты раздела «Раздача статики» в `tests/server.test.mjs` — «сосед-с-префиксом» = 404, легитимная статика = 200.

- [ ] **Step 1: Дописать импорты в шапке `tests/server.test.mjs`**

После существующих импортов (строки 1–4) добавить:

```js
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
```

`REPO_ROOT` = корень репозитория; каталог статики — `join(REPO_ROOT, 'static')`, фикстура-сосед ляжет рядом с ним, как в сценарии из Issue.

- [ ] **Step 2: Написать failing-тест на каталог-соседа и контрольные тесты**

Добавить в конец `tests/server.test.mjs`:

```js
// === Раздача статики: проверка вложенности ===

test('GET /../static-<сосед>/keys.json возвращает 404 и не отдаёт содержимое', async (t) => {
  // Сосед каталога статики, имя которого начинается с "static": голый
  // startsWith('/…/static') считал такой путь вложенным и отдавал файл.
  const secretDir = mkdtempSync(join(REPO_ROOT, 'static-test-secret-'));
  t.after(() => rmSync(secretDir, { recursive: true, force: true }));
  writeFileSync(join(secretDir, 'keys.json'), 'секрет');

  const res = await request(`/../${basename(secretDir)}/keys.json`);

  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { error: 'не найдено' });
});

test('GET /../src/server.mjs возвращает 404 — исходник не отдаётся', async () => {
  const res = await request('/../src/server.mjs');
  assert.equal(res.statusCode, 404);
});

test('GET /style.css отдаётся как статика — 200', async () => {
  const res = await request('/style.css');
  assert.equal(res.statusCode, 200);
  assert.match(res.headers['content-type'], /text\/css/);
});

test('GET / отдаёт index.html — 200', async () => {
  const res = await request('/');
  assert.equal(res.statusCode, 200);
  assert.match(res.headers['content-type'], /text\/html/);
});
```

Почему таких четыре: первый — сам баг (имя фикстуры из `mkdtempSync` начинается с `static`, то есть ровно случай «сосед проходит голый префикс»); второй — классический traversal через `src/`, он закрыт и до правки, и нужен как контроль, что правка не ломает уже работающий отказ; третий и четвёртый — что раздача легитимной статики жива (фикс не перегнул в «всё в 404»). Фикстура удаляется в `t.after` — дерево после прогона чистое.

- [ ] **Step 3: Прогнать — тест на соседа красный**

Run: `node --test tests/server.test.mjs`
Expected: FAIL ровно один тест — «GET /../static-<сосед>/keys.json…»: `assert.equal(res.statusCode, 404)` получил 200. Остальные тесты файла, включая три новых контрольных, зелёные.

- [ ] **Step 4: Чинить условие в `serveStatic`**

В `src/server.mjs` заменить строки 65–71:

```js
    // Security check: ensure the resolved path is within STATIC_DIR.
    // Граница пути, а не префикс строки: '/app/static-secret' начинается
    // с '/app/static' посимвольно, но вложенным каталогом не является.
    const normalizedStatic = STATIC_DIR.replace(/\\/g, '/');
    const normalizedFile = realPath.replace(/\\/g, '/');

    if (normalizedFile !== normalizedStatic &&
        !normalizedFile.startsWith(`${normalizedStatic}/`)) {
      return null;
    }
```

Обе стороны сравнения нормализованы одинаково, поэтому суффикс `'/'` верен и на POSIX, и на Windows — отдельный `path.sep` не нужен. Ветка равенства нужна: запрос самого каталога статики проходит `realpathSync`, и его отсекает дальше `statSync().isFile()`. Больше в функции ничего не менять: `decodeURIComponent` и `try` остаются как есть (см. «Вне MVP»).

- [ ] **Step 5: Прогнать — зелёный на файле, потом как в CI**

Run: `node --test tests/server.test.mjs`
Expected: PASS, все тесты файла зелёные.

Run: `node --test "tests/*.test.mjs"`
Expected: PASS, весь прогон зелёный — это команда CI.

- [ ] **Step 6: Проверить рабочее дерево (вместо коммита)**

Run: `git status --short`
Expected: только ` M src/server.mjs` и ` M tests/server.test.mjs`. Каталогов-фикстур (`static-test-secret-*`, `static-secret`) в выводе быть не должно — тест убирает свой в `t.after`. Коммит не делать: его сделает workflow.

---

### Task 2: Приёмка по HowToDemo

**Files:**
- Create: ничего в коде. Фикстура `static-secret/keys.json` в корне репозитория — только на время проверки, удаляется в Step 4.

**Interfaces:**
- Consumes: рабочее дерево с правкой из Task 1 (`serveStatic` в `src/server.mjs` отсекает соседа по границе пути); скрипт `npm start` (`package.json`), порт по умолчанию 8080 (`PORT` из env).
- Produces: подтверждённый сценарий приёмки из `.harness/howtodemo.md` и чистое рабочее дерево. Наружу для последующих задач ничего не отдаёт — задача замыкает план.

- [ ] **Step 1: Поднять сервис**

Run: `npm start`
Expected: в выводе `checkout слушает :8080`; процесс оставить работать.

- [ ] **Step 2: Воспроизвести сценарий из Issue**

Run:
```bash
mkdir -p static-secret && echo 'секрет' > static-secret/keys.json
curl -s http://localhost:8080/../static-secret/keys.json
```
Expected: `{"error":"не найдено"}` — не `секрет`.

Run: `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/../static-secret/keys.json`
Expected: `404`

- [ ] **Step 3: Контроль — легитимная статика жива**

Run: `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/ http://localhost:8080/style.css`
Expected: `200` и `200`

- [ ] **Step 4: Убрать за собой**

Run: остановить процесс (`Ctrl-C`), затем `rm -rf static-secret && git status --short`
Expected: в `git status --short` только ` M src/server.mjs` и ` M tests/server.test.mjs`. Фикстура удаляется обязательно: коммит после тебя делает workflow, и `static-secret/keys.json` не должен уехать в PR.

---

## Вне MVP

Найдено при планировании, HowToDemo не блокирует — в эту ветку не брать, записать в `.followups.md` (по разделу на пункт):

1. **`decodeURIComponent` вне `try` в `serveStatic`** (`src/server.mjs:58`). Запрос с битым percent-encoding (`GET /%`) бросает `URIError` мимо `catch`, ошибка выходит из `app` без ответа клиенту. Лечится переносом декодирования под существующий `try` — но это отдельная ветка.
2. **`serveStatic` получает сырой `req.url`, а не `pathname`** (`src/server.mjs:168`). `app` уже вычисляет `new URL(...).pathname` и не использует его для статики, поэтому `GET /style.css?v=2` отдаёт 404 вместо файла: query string попадает в путь к файлу.
3. **Фикстуры демо не закрыты в `.gitignore`.** Ручной прогон HowToDemo оставляет `static-secret/` в дереве; строка вроде `static-secret/` в `.gitignore` — та же страховка от утечки в PR, что уже стоит для `.followups.md`. Коммитит всё равно workflow-человек, поэтому не блокер.

---

## Граница MVP

В план вошли ровно те задачи, без которых сценарий приёмки не проходит: правка проверки (Task 1) и её прогон руками по сценарию из Issue (Task 2). Контрольные тесты Task 1 — часть того же gate: без них правка в этом репозитории считается незавершённой, а перегиб до «всё в 404» сценарием не ловится.
