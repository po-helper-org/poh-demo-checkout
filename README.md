# poh-demo-checkout

Маленький сервис расчёта стоимости заказа. Существует не ради себя: это
**демо-стенд контура производства** — на нём гоняется полный цикл от заявки до
влитого PR, и код намеренно простой, чтобы предметом разбора был контур, а не
предметная область.

```
Issue заведён
  └─ Issue-Agent: триаж (advisor:* + priority:* + phase:classified)
       └─ /analyze — аналитика FNR → ветка research/issue-N + системные требования
            └─ ready-for-dev + чеклист готовности
                 └─ OpenHands: разработка → PR с Closes #N
                      ├─ edge-кейсы по дороге → SubIssue (origin:agent)
                      └─ PR-Agent: ревью → задача готова к merge
```

## Сервис

`POST /quote` считает заказ: сумму позиций, доставку и итог.

```bash
npm start
curl -sX POST localhost:8080/quote \
  -H 'content-type: application/json' \
  -d '{"items":[{"sku":"a","price":1000,"qty":2}]}'
# {"goods":2000,"delivery":300,"total":2300}
```

Доставка бесплатна от 3000 (включительно). Зависимостей у сервиса нет — это его
свойство, а не упущение.

## Проверки

```bash
node --test "tests/*.test.mjs"
```

## Автоматика

| Workflow | Когда | Что делает |
|---|---|---|
| `ci.yml` | PR и push в main | тесты |
| `openhands-resolver.yml` | диспатч от Issue-Agent (либо метка `fix-me`) | разработка по Issue → PR |
| `pr-review.yml` | вызов из разработки, либо `/review` в PR | ревью PR-Agent + доклад в цикл |

Правила, по которым работают агенты, — в [`AGENTS.md`](AGENTS.md) и
[`CLAUDE.md`](CLAUDE.md). Конфигурация контура целиком — `poh-infra/harness`.
