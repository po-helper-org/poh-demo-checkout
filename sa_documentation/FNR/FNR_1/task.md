# FNR-1: Валидация Content-Type для POST /quote

## Описание проблемы

Эндпоинт `POST /quote` в `src/server.mjs` пытается разобрать тело запроса как JSON независимо от значения заголовка `Content-Type`. Когда клиент (например, браузерная форма) отправляет запрос с другим типом контента (`application/x-www-form-urlencoded`, `multipart/form-data`), сервер всё равно вызывает `JSON.parse()`, что приводит к некорректному сообщению об ошибке «тело запроса не разобралось как JSON» вместо корректного статуса 415 Unsupported Media Type.

## Код-доказательства

### Текущая реализация (AS IS)

**src/server.mjs:20-25** — функция `readJson()` читает тело запроса и парсит JSON без проверки заголовка:

```javascript
async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return null;
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
```

**src/server.mjs:37-61** — обработчик `/quote` вызывает `readJson()` и возвращает 400 при любой ошибке парсинга:

```javascript
if (req.url === '/quote' && req.method === 'POST') {
  counters.incVisit();
  let body;
  try {
    body = await readJson(req);  // ← нет проверки content-type
  } catch {
    return send(res, 400, { error: 'тело запроса не разобралось как JSON' });
  }
  // ... дальнейшая обработка
}
```

### Почему это проблема

1. **Неверный статусный код:** HTTP 400 (Bad Request) подразумевает, что формат запроса некорректен относительно его Content-Type. Если Content-Type не `application/json`, корректный ответ — 415 (Unsupported Media Type).
2. **Непонятное сообщение об ошибке:** Клиент, отправивший форму, получит «тело запроса не разобралось как JSON», хотя реальная проблема — в неправильном Content-Type.
3. **Нарушение контракта API:** API документирует JSON-интерфейс, но не enforce'ит это на уровне заголовков.

## Требуемое поведение (TO BE)

### Изменения в `src/server.mjs`

1. **Проверка заголовка Content-Type:**
   - Перед вызовом `readJson()` проверить `req.headers['content-type']`
   - Принимать только значения, начинающиеся с `application/json`
   - При несоответствии возвращать 415 с описанием ошибки

2. **Логика валидации:**
   ```
   - Если Content-Type отсутствует или не application/json:
     → вернуть 415 { error: 'ожидается Content-Type: application/json' }
   - Иначе:
     → продолжить с существующей логикой парсинга JSON
   ```

3. **Учёт пограничных случаев:**
   - Пустое тело запроса → обрабатывается существующей логикой (null в readJson)
   - Content-Type с параметрами (например, `application/json; charset=utf-8`) → ДОПУСКАТЬСЯ
   - Некорректный JSON при правильном Content-Type → 400 (текущее поведение сохраняется)

### Изменения в `tests/server.test.mjs`

1. **Расширение helper-функции `request()`:**
   - Добавить параметр для переопределения `content-type`
   - Текущая реализация (line 14) жёстко задаёт `'content-type': 'application/json'`

2. **Новые тесты:**
   - Тест на валидный Content-Type (`application/json`) → 200
   - Тест на Content-Type с параметрами (`application/json; charset=utf-8`) → 200
   - Тест на отсутствующий Content-Type → 415
   - Тест на `application/x-www-form-urlencoded` → 415
   - Тест на `multipart/form-data` → 415
   - Тест на `text/plain` → 415

## Связанные компоненты

| Компонент | Роль в задаче | Изменения |
|-----------|---------------|-----------|
| `src/server.mjs` | Содержит баг | Добавить валидацию Content-Type |
| `src/pricing.mjs` | Бизнес-логика расчёта | Без изменений |
| `tests/server.test.mjs` | Покрытие тестами | Добавить тесты валидации Content-Type |

## Критерии готовности

1. [ ] Сервер проверяет заголовок `Content-Type` для `POST /quote`
2. [ ] При несоответствии Content-Type возвращается статус 415 и сообщение об ошибке
3. [ ] Валидные JSON-запросы с `application/json` продолжают работать корректно
4. [ ] Валидные JSON-запросы с `application/json; charset=utf-8` обрабатываются корректно
5. [ ] Тесты покрывают все указанные сценарии
6. [ ] Существующие тесты не ломаются (обратная совместимость)

## Границы задачи

**Входит в зону:**
- Валидация Content-Type для эндпоинта `POST /quote`
- Возврат статуса 415 при несоответствии
- Добавление тестов в `tests/server.test.mjs`

**НЕ входит в зону:**
- Изменение других эндпоинтов (`/healthz`, `/stats`)
- Валидация других заголовков HTTP
- Изменение бизнес-логики расчёта в `pricing.mjs`
- Обработка других Content-Type (приём форм, XML и т.п.)

## Риски

| Риск | Влияние | Смягчение |
|------|---------|-----------|
| Существующие клиенты не отправляют Content-Type | Они начнут получать 415 | Проверить логи/метрики реального трафика перед релизом |
| Content-Type с параметрами может не распознаваться | 415 вместо 200 | Использовать проверку `startsWith('application/json')` |
| Order of validation: что сначала — JSON-валидность или Content-Type? | Разный статусный код | Content-Type проверяется ДО попытки парсинга |

## Контекст issue

- Issue: po-helper-org/poh-demo-checkout#126
- Исходный запрос: «POST /quote принимает любой content-type»
- Приоритет: P2
