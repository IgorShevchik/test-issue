# B24 UserField Widget — Nuxt + @bitrix24/b24jssdk

Минимальный **рабочий** пример встройки интерфейса приложения **в пользовательское поле карточки
лида/сделки** (приватная точка встройки `USERFIELD_TYPE`), на **Nuxt 3** и официальном
SDK **[@bitrix24/b24jssdk](https://github.com/bitrix24/b24jssdk)** — без классического `BX24.js`.

Совместимо со стеком [`bitrix24/templates-dashboard`](https://github.com/bitrix24/templates-dashboard)
(Nuxt + b24jssdk): те же вызовы можно перенести в дашборд один в один.

## Структура

| Файл | Роль |
|---|---|
| `pages/index.vue`   | Страница приложения (Application URL): регистрация rest-типа + создание поля. |
| `pages/handler.vue` | **HANDLER** (`handler.html`): рендер внутри iframe поля, режимы `view`/`edit`, `placement.setValue`. |
| `pages/install.vue` | Установка (`install.html`): `b24.installFinish()`. |
| `nuxt.config.ts`    | `BASE` (подпапка), SSR + пререндер `index.html` / `handler.html` / `install.html` в статику. |

## ⚠️ Подпапка размещения (BASE) — САМОЕ ВАЖНОЕ

Если приложение лежит **не в корне домена**, а в подпапке (напр. `https://dl.bx-shef.by/rest-issue-uf/`),
задайте её в `nuxt.config.ts`:

```ts
const BASE = '/rest-issue-uf/'   // с ведущим и завершающим '/'; в корне домена — '/'
```

Иначе Nuxt запросит JS-чанки от корня домена (`/_nuxt/*.js`, `/install/_payload.json`) → **404/500**,
и страница зависнет на «Установка…». Именно это ломало первый запуск.

## Запуск локально

```bash
pnpm install      # или npm install / yarn
pnpm dev          # http://localhost:3000
```

Локально вне Битрикс24 страницы покажут сообщение «нет контекста приложения» — это нормально:
SDK общается с родительским окном B24 по `postMessage`, поэтому нужен реальный iframe портала.

## Сборка и хостинг (для проверки в портале)

```bash
pnpm generate     # статика в .output/public (index.html, handler.html, install.html)
```

Залейте **содержимое** `.output/public` **внутрь папки размещения** на HTTPS-хостинге.
Например, при `BASE = '/rest-issue-uf/'` файлы должны лежать так, чтобы открывались:

- `https://dl.bx-shef.by/rest-issue-uf/`            → страница приложения
- `https://dl.bx-shef.by/rest-issue-uf/handler.html` → обработчик поля
- `https://dl.bx-shef.by/rest-issue-uf/install.html` → установка
- `https://dl.bx-shef.by/rest-issue-uf/_nuxt/…`       → ассеты

Все страницы — отдельные `.html`-файлы, SPA-fallback не нужен.

> Почему не `ssr: false`: в связке Nuxt 3.21 / Vite 7 отключение SSR ломает сборку
> (`No entry found in rollupOptions.input`). Поэтому оставляем SSR по умолчанию, пререндерим
> страницы в статику, а SDK грузим динамическим импортом только на клиенте (в `onMounted`).

## Регистрация приложения в Битрикс24

Разработчикам → **Другое → Локальное приложение** (серверное, «виджет/вкладка»):

- **Application URL:** `https://dl.bx-shef.by/rest-issue-uf/` (это `index.html`)
- **Installation URL:** `https://dl.bx-shef.by/rest-issue-uf/install.html` (было `/install/` — поменяйте на `install.html`)
- **Права (scope):** `crm`, `placement`
- Установить **для всех пользователей**.

Затем:
1. Откройте приложение → **«1. Зарегистрировать тип поля»** → **«2. Добавить поле в Лид/Сделку»**.
2. Откройте карточку лида/сделки → поле-встройка отрисуется как iframe (`handler.html`).
   В режиме редактирования введите значение — оно уйдёт в форму через `setValue` и сохранится с карточкой.

## Требования (из спецификации `userfieldtype.add`)

- **HANDLER на том же домене, что и приложение** — здесь `origin + BASE + 'handler.html'`, домен совпадает.
- **Только HTTPS** — иначе браузер блокирует содержимое поля.
- Регистрация типа (`userfieldtype.*`) — **админ + контекст приложения (OAuth)**, не webhook.
- `OPTIONS.height` (здесь 120) — иначе высота поля 0 и «поля не видно».

## Особенности b24jssdk, использованные тут

- `initializeB24Frame()` — бутстрап B24Frame (дедуплицирует повторные вызовы).
- REST через `b24.actions.v2.call.make({ method, params, requestId })`; ошибки — `res.getErrorMessages()`.
- `b24.placement.placement` / `b24.placement.options` — код встройки и её опции (`MODE`, `VALUE`, `FIELD_NAME`).
- `b24.placement.setValue(v)` — сам сериализует значение в JSON (родитель делает `JSON.parse`).
- `b24.parent.fitWindow()` — подгонка высоты iframe.

## Если поле не отрисовалось — чек-лист

1. DevTools → Elements: внутри `span.field-wrap` есть `<iframe>`? нет → тип не зарегистрирован / приложение не установлено у юзера / `OPTIONS.height=0`.
2. Console/Network: HTTPS? `X-Frame-Options` / CSP `frame-ancestors` не запрещают встраивание? сторонние cookie не заблокированы?
3. Тип регистрировали из приложения (OAuth) под админом, а не по webhook?
4. HANDLER — тот же домен + HTTPS?
5. Приложение установлено для всех?
6. Поля нет в карточке совсем? Раскладка карточки персональная — добавьте поле через настройку полей карточки.
