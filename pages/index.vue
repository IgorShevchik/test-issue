<script setup lang="ts">
// Страница приложения (Application URL).
// Регистрирует rest-тип поля и создаёт поле-встройку в лиде/сделке
// через @bitrix24/b24jssdk. SDK импортируется динамически ТОЛЬКО на клиенте.
import { ref, onMounted } from 'vue'
import { useRuntimeConfig } from '#app'
import type { B24Frame } from '@bitrix24/b24jssdk'

const CODE = 'b24widget' // код rest-типа (userfieldtype.add)
const FIELD_NAME = 'B24_WIDGET_DEMO' // код поля (A-Z, 0-9, _)
const TITLE = 'B24 Widget Demo'

type Line = { t: string, msg: string, cls?: string }
const logs = ref<Line[]>([])
const ctx = ref('Инициализация BX24…')
const ready = ref(false)

let b24: B24Frame | null = null
let sdkText: any = null // ссылка на Text из SDK (для requestId)
let appId: number | null = null
let fullTypeId = ''
let handlerUrl = ''

function log(msg: string, cls?: string) {
  logs.value.push({ t: new Date().toLocaleTimeString(), msg, cls })
}

// Обёртка над REST-вызовом через action-поверхность SDK.
async function call(method: string, params: Record<string, any> = {}) {
  const res = await b24!.actions.v2.call.make({ method, params, requestId: sdkText.getUuidRfc4122() })
  if (!res.isSuccess) {
    throw new Error(res.getErrorMessages().join('; '))
  }
  return res.getData()!.result
}

onMounted(async () => {
  // Динамический импорт SDK — только в браузере (не на сервере/пререндере).
  const sdk = await import('@bitrix24/b24jssdk')
  sdkText = sdk.Text

  // HANDLER обязан быть на том же домене, что и приложение — берём текущий origin
  // + базовый путь приложения (подпапка), файл handler.html.
  const base = useRuntimeConfig().app.baseURL // напр. '/rest-issue-uf/'
  handlerUrl = window.location.origin + base + 'handler.html'
  try {
    b24 = await sdk.initializeB24Frame()
    log('BX24 инициализирован. HANDLER = ' + handlerUrl)
    const info: any = await call('app.info')
    appId = info.ID
    fullTypeId = `rest_${appId}_${CODE}`
    ctx.value = `App ID: ${appId} · тип поля: ${fullTypeId}`
    ready.value = true
    log('app.info OK. Полный код типа: ' + fullTypeId, 'ok')
  }
  catch (e: any) {
    ctx.value = 'Нет контекста приложения — откройте страницу как установленное приложение (OAuth), не по webhook.'
    log('init/app.info FAILED: ' + e.message, 'err')
  }
})

async function registerType() {
  log('userfieldtype.add …')
  try {
    await call('userfieldtype.add', {
      USER_TYPE_ID: CODE,
      HANDLER: handlerUrl,
      TITLE,
      DESCRIPTION: 'Minimal iframe userfield prototype',
      OPTIONS: { height: 120 } // высота поля в px; иначе 0 -> «поля не видно»
    })
    log('Тип поля зарегистрирован ✔', 'ok')
  }
  catch (e: any) {
    if (/already binded|ERROR_CORE/i.test(e.message)) {
      log('Тип уже зарегистрирован (ок).', 'muted')
    }
    else {
      log('userfieldtype.add FAILED: ' + e.message + '  (нужен админ + контекст приложения)', 'err')
    }
  }
}

async function addField(entity: 'lead' | 'deal') {
  const method = `crm.${entity}.userfield.add`
  log(method + ' …')
  try {
    const id = await call(method, {
      fields: {
        USER_TYPE_ID: fullTypeId,
        FIELD_NAME,
        XML_ID: FIELD_NAME,
        EDIT_FORM_LABEL: TITLE,
        LIST_COLUMN_LABEL: TITLE,
        MANDATORY: 'N',
        SHOW_IN_LIST: 'Y',
        EDIT_IN_LIST: 'Y',
        SETTINGS: {}
      }
    })
    log(`Поле создано в ${entity}, ID=${id} ✔ Откройте карточку ${entity}.`, 'ok')
  }
  catch (e: any) {
    if (/уже существует|duplicate/i.test(e.message)) {
      log(`Поле уже существует в ${entity} (ок).`, 'muted')
    }
    else {
      log(method + ' FAILED: ' + e.message, 'err')
    }
  }
}
</script>

<template>
  <div class="wrap">
    <h1>B24 UserField Widget (Nuxt + b24jssdk)</h1>
    <p class="sub">Регистрирует rest-тип поля и создаёт поле-встройку (iframe) в карточке лида/сделки.</p>

    <div class="card">
      <div class="row">
        <button @click="registerType">
          1. Зарегистрировать тип поля
        </button>
        <button class="secondary" :disabled="!ready" @click="addField('lead')">
          2. Добавить поле в Лид
        </button>
        <button class="secondary" :disabled="!ready" @click="addField('deal')">
          2. Добавить поле в Сделку
        </button>
      </div>
      <p class="muted">
        {{ ctx }}
      </p>
    </div>

    <div class="card">
      <strong>Лог</strong>
      <pre class="log"><span v-for="(l, i) in logs" :key="i" :class="l.cls">[{{ l.t }}] {{ l.msg }}
</span></pre>
    </div>
  </div>
</template>

<style scoped>
:root { color-scheme: light dark }
.wrap { font: 14px/1.5 system-ui, sans-serif; margin: 0; padding: 24px; max-width: 760px }
h1 { font-size: 18px; margin: 0 0 4px }
.sub { color: #888; margin: 0 0 20px }
.card { border: 1px solid #8883; border-radius: 10px; padding: 16px; margin: 0 0 16px }
.row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center }
button { font: inherit; padding: 8px 14px; border-radius: 8px; border: 1px solid #4c8bf5; background: #4c8bf5; color: #fff; cursor: pointer }
button.secondary { background: transparent; color: #4c8bf5 }
button:disabled { opacity: .5; cursor: not-allowed }
.muted { color: #888 }
.log { background: #1113; border-radius: 8px; padding: 12px; white-space: pre-wrap; word-break: break-word; max-height: 320px; overflow: auto; margin: 8px 0 0 }
.ok { color: #2e9e50 } .err { color: #d64545 }
</style>
