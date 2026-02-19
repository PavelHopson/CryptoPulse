# Эксплуатация и мониторинг (RU)

## Что мониторим
- доступность `health-check`
- ошибки Stripe webhook
- очередь `alert_jobs`
- частоту ошибок приложения

## Инциденты
- использовать `ALERT_WEBHOOK_URL` для мгновенных уведомлений
- анализировать `subscription_events` для биллинга
- смотреть structured logs и Sentry events

## Регулярные процедуры
- проверка успешности health-check workflow
- проверка ретраев и failed-джоб в `alert_jobs`
- контроль ключевых метрик MRR/churn
