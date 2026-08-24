# FNR-1: Эндпоинт GET /version с версией из package.json

## Метаданные

| Поле | Значение |
|------|----------|
| **Тип задачи** | Новая функциональность |
| **Компоненты** | `src/server.mjs`, `tests/` |
| **Источник** | po-helper-org/poh-demo-checkout#105 |
| **Статус** | Открыто |

## Диагноз проблемы

### AS IS (текущее состояние)

При разборе инцидента первый вопрос — какая версия сервиса сейчас работает на проде. 

**Доказательство:**
- **Описание проблемы:** "Сейчас ответ на вопрос о версии на проде добывается только чтением логов выкатки, то есть человеком и не сразу" — из описания задачи (#105)

**Текущий HTTP-интерфейс:**
- Сервер `src/server.mjs` ([src/server.mjs:1-70](src/server.mjs:1-70)) реализует три эндпоинта:
  - `GET /healthz` — health-check ([src/server.mjs:28](src/server.mjs:28))
  - `GET /stats` — метрики запросов ([src/server.mjs:30-32](src/server.mjs:30-32))
  - `POST /quote` — расчёт стоимости ([src/server.mjs:34-58](src/server.mjs:34-58))
- **Эндпоинт для получения версии отсутствует**

**Текущие данные версии:**
- `package.json` содержит `name: "poh-demo-checkout"` и `version: "0.1.0"` ([package.json:2-3](package.json:2-3))
- Эти значения не экспонированы через HTTP-интерфейс

**Паттерн чтения файлов:**
- Поиск по кодовой базе (`search_codebase("import JSON file read fs")`) не выявил существующих паттернов чтения JSON-файлов ([sa_documentation/FNR/FNR_1/repowise-dialog.md:40](sa_documentation/FNR/FNR_1/repowise-dialog.md:40))
- Реализация будет требовать стандартного Node.js API: `fs.readFile` + `JSON.parse`

### TO BE (целевое состояние)

**Функциональные требования:**

| ID | Требование | Проверка |
|----|------------|----------|
| ФТ-1 | `GET /version` возвращает код 200 | HTTP-запрос возвращает statusCode 200 |
| ФТ-2 | Ответ имеет заголовок `Content-Type: application/json` | Заголовок ответа содержит `content-type: application/json` |
| ФТ-3 | Тело ответа содержит поля `name` и `version` | JSON ответа содержит оба поля |
| ФТ-4 | Значения совпадают с `package.json` | Поля ответа равны значениям из package.json |
| ФТ-5 | Правка версии в package.json меняет ответ без перезаписи server.mjs | Изменение package.json.version изменяет ответ endpoint |

**Требование к покрытию тестами:**

| ID | Требование | Проверка |
|----|------------|----------|
| ИТ-1 | Существует интеграционный тест для `/version` | Файл `tests/*.test.mjs` содержит тест запроса к `/version` |
| ИТ-2 | Тест верифицирует совпадение с `package.json` | Тест читает package.json и сравнивает значения с ответом |

### Ограничения и границы

**Границы решения:**
1. Добавление **единственного** нового эндпоинта `GET /version` ([src/server.mjs:27-61](src/server.mjs:27-61))
2. Чтение `package.json` из корня проекта
3. Возврат только полей `name` и `version`
4. Новый тестовый файл в `tests/`

**Технические ограничения:**
- Зависимостей у сервиса нет ([CLAUDE.md:16](CLAUDE.md:16)) — чтение файла через стандартный `node:fs`
- Арифметика — в `src/pricing.mjs`, логика сервера — только разбор запроса ([src/server.mjs:1-2](src/server.mjs:1-2))
- Слой HTTP не покрыт интеграционными тестами ([sa_documentation/FNR/FNR_1/repowise-dialog.md:18](sa_documentation/FNR/FNR_1/repowise-dialog.md:18))

**Вне границ:**
- Изменение структуры `package.json`
- Кеширование содержимого файла
- Авторизация для endpoint
- Дополнительные поля в ответе

## Кодовые доказательства

### Точка внедрения

**Место в коде:** `src/server.mjs`, функция `app()`, строки 27-61

```javascript
export const app = async (req, res) => {
  if (req.url === '/healthz') return send(res, 200, { ok: true });

  if (req.url === '/stats' && req.method === 'GET') {
    return send(res, 200, counters.getStats());
  }
  // ... обработка /quote ...
  
  // Место для нового обработчика:
  // if (req.url === '/version' && req.method === 'GET') { ... }

  return send(res, 404, { error: 'не найдено' });
};
```

### Шаблон тестирования

**Паттерн:** `tests/server.test.mjs` использует вспомогательную функцию `request()` для интеграционных тестов ([tests/server.test.mjs:10-70](tests/server.test.mjs:10-70)):

```javascript
async function request(url, method = 'GET', body = null) {
  const req = { url, method, headers: {...}, ... };
  const res = { statusCode: null, headers: {}, writeHead, write, end };
  await app(req, res);
  return { statusCode, headers, body: parsedBody };
}
```

### Существующий HTTP-ответ

**Функция `send()`** ([src/server.mjs:11-18](src/server.mjs:11-18)):
```javascript
function send(res, code, body) {
  const payload = JSON.stringify(body);
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
  });
  res.end(payload);
}
```

## Контекст риска

**Файл `src/server.mjs`:**
- Hotspot score: 67%, trend: increasing ([sa_documentation/FNR/FNR_1/repowise-dialog.md:18](sa_documentation/FNR/FNR_1/repowise-dialog.md:18))
- Health score: 10/10 (healthy)
- Bus factor: 1 (kibarik) ([sa_documentation/FNR/FNR_1/repowise-dialog.md:18](sa_documentation/FNR/FNR_1/repowise-dialog.md:18))
- Test gap: HTTP-слой не покрыт тестами ([sa_documentation/FNR/FNR_1/repowise-dialog.md:18](sa_documentation/FNR/FNR_1/repowise-dialog.md:18))

**Вывод по риску:** Изменение локализовано, риск низкий. Новый обработчик добавляется в существующую цепочку `if`-блоков.

## Открытые вопросы

Отсутствуют — для реализации достаточно собранного контекста ([sa_documentation/FNR/FNR_1/repowise-dialog.md:24-27](sa_documentation/FNR/FNR_1/repowise-dialog.md:24-27)).

## Связанные артефакты

| Артефакт | Описание |
|----------|----------|
| `sa_documentation/FNR/FNR_1/repowise-dialog.md` | Контекст из репозитория (Repowise) |
| `po-helper-org/poh-demo-checkout#105` | Исходный Issue |
| `src/server.mjs` | Точка внедрения |
| `package.json` | Источник данных |

## Критерии завершения

1. ✅ `GET /version` отвечает 200 с `Content-Type: application/json`
2. ✅ Тело ответа: `{"name": "poh-demo-checkout", "version": "0.1.0"}`
3. ✅ Значения читаются из `package.json`, не захардкожены
4. ✅ Тест в `tests/` проверяет совпадение с `package.json`
5. ✅ Все тесты проходят: `node --test "tests/*.test.mjs"`

---

*Создано: 2026-08-24*
*Источник: `/fnr-new-task` поIssue #105*
