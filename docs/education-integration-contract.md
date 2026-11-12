# Контур интеграции обучения

Документ описывает будущую интеграцию CryptoPulse Research Lab с Eclipse Library и Eclipse Chat. Это контракт подготовки, а не реализованный серверный API.

## Состояние

- По умолчанию интеграция выключена: `VITE_EDUCATION_INTEGRATION_ENABLED=false`.
- CryptoPulse сейчас не синхронизирует аккаунты, курсы или прогресс с Library.
- Ссылки на Library открывают отдельный продукт и не передают токены или персональные данные.

## Курс

```ts
type EducationCourse = {
  courseId: string;
  title: string;
  lessons: Array<{
    lessonId: string;
    title: string;
    deepLink: string;
  }>;
};
```

`courseId` и `lessonId` должны быть стабильными идентификаторами Library. `deepLink` ведёт на конкретный материал и не содержит секретов.

## Завершение урока

```ts
type LessonCompletion = {
  courseId: string;
  lessonId: string;
  completedAt: string;
  source: 'library' | 'cryptopulse' | 'chat';
};
```

До появления серверного контура запись остаётся локальной и не считается подтверждённым прогрессом. После запуска потребуется отдельная авторизация, проверка прав и идемпотентная запись на сервере.

## Ссылка в Eclipse Chat

Будущий deep link должен передавать только контекст курса и урока, например:

`https://chat.eclipse-forge.ru/?course=<courseId>&lesson=<lessonId>`

Токены, API-ключи и содержимое пользовательских промптов в URL не передаются. Формат и домен нужно подтвердить перед реализацией серверного API.
