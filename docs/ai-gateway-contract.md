# CryptoPulse server AI gateway

Этот контракт описывает будущий server-side transport для Research Lab. Пока
`VITE_AI_GATEWAY_MODE=client`, браузерный режим остаётся единственным включённым.
Reference implementation: `workers/research-api/` (`POST /v1/ai`).

## Граница доверия

- Браузер передаёт только `provider`, `model` и `prompt`.
- API-ключи, лимиты, стоимость, выбор доступной модели и фактическое usage
  принадлежат серверу. Поля `apiKey` и `costUsd` из браузера запрещены.
- Endpoint должен требовать сессию пользователя, проверять `Origin` и CSRF,
  иметь rate limit и журналировать request id без содержимого prompt и секретов.
- Для браузерной сессии используется HttpOnly cookie; state-changing запросы
  дублируют readable CSRF-cookie в `X-CSRF-Token`. Bearer-сессии не зависят от
  browser-CSRF.
- Сервер сам проверяет allowlist провайдеров/моделей и повторно ограничивает prompt
  и response. Проверки в `src/services/aiGateway.ts` помогают UX, но не являются
  security boundary.

## Request

```http
POST /v1/ai
Content-Type: application/json
X-CSRF-Token: <session-bound-token>
X-Request-Id: <client-generated-id>

{
  "provider": "gemini",
  "model": "gemini-2.5-flash",
  "prompt": "..."
}
```

Клиент генерирует `X-Request-Id` для каждого запроса и повторяет его только при
намеренной retry-операции. Сервер должен отклонять неизвестного провайдера, модель вне allowlist, пустой или
слишком большой prompt, отсутствующую сессию, неверный Origin/CSRF и превышение
квоты. Повторный `X-Request-Id` не должен списывать usage повторно.

## Response

```json
{
  "text": "...",
  "usage": {
    "inputTokens": 120,
    "outputTokens": 240
  },
  "requestId": "req_..."
}
```

`costUsd` может быть внутренним полем биллинга, но не принимается от клиента и не
используется как единственный источник расчёта. Ошибки должны возвращать безопасный
код (`401`, `403`, `409`, `429`, `413`, `502`) без текста ответа провайдера и без
ключей.

## Минимальные операционные требования

1. Персистентная учётная запись и лимиты пользователя.
2. Server-side usage ledger с request id, provider/model, токенами и временем.
3. Таймаут upstream, отмена запроса и ограничение размера ответа до записи в память.
4. Мониторинг 4xx/5xx, rate-limit и upstream latency без сохранения prompt по умолчанию.
5. Отдельный production smoke: вход, один AI-запрос, отказ по квоте, повторный request id.

