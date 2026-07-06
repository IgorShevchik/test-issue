// Минимальная конфигурация Nuxt для приложения-встройки Битрикс24.
//
// ⚠️ ПОДПАПКА РАЗМЕЩЕНИЯ. Все ассеты (JS-чанки) грузятся относительно BASE.
// Если приложение лежит НЕ в корне домена, укажите путь c ведущим и завершающим '/'.
//   https://dl.bx-shef.by/rest-issue-uf/  ->  '/rest-issue-uf/'
//   https://your-app.example/            ->  '/'
// Можно переопределить переменной окружения NUXT_APP_BASE_URL при сборке.
const BASE = process.env.NUXT_APP_BASE_URL || '/rest-issue-uf/'

// Важно: НЕ используем `ssr: false` — в связке Nuxt 3.21 / Vite 7 это ломает
// сборку ("No entry found in rollupOptions.input"). Оставляем SSR по умолчанию
// и пререндерим страницы в статику. SDK @bitrix24/b24jssdk грузится только на
// клиенте (динамический import в onMounted).
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: false },

  app: {
    baseURL: BASE,
    head: {
      title: 'B24 UserField Widget (Nuxt)',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }]
    }
  },

  // Отдаём страницы установки и обработчика как отдельные .html-файлы
  // (детерминированные пути без каталогов/слэшей — надёжнее на статик-хостинге).
  hooks: {
    'pages:extend'(pages) {
      for (const p of pages) {
        if (p.path === '/handler') p.path = '/handler.html'
        if (p.path === '/install') p.path = '/install.html'
      }
    }
  },

  // Не извлекаем полезную нагрузку в _payload.json — на подпути она давала 500
  // и лишние preload-запросы. Для этого мини-приложения она не нужна.
  experimental: {
    payloadExtraction: false
  },

  // Пререндер всех страниц -> чистая статика в .output/public.
  nitro: {
    prerender: {
      routes: ['/', '/handler.html', '/install.html']
    }
  }
})
