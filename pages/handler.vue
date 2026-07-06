<script setup lang="ts">
// HANDLER — грузится ВНУТРИ iframe поля в карточке лида/сделки (placement USERFIELD_TYPE).
// Читает опции встройки через b24.placement и в режиме edit пишет значение через setValue.
// SDK импортируется динамически ТОЛЬКО на клиенте.
import { ref, onMounted } from 'vue'
import type { B24Frame } from '@bitrix24/b24jssdk'

const mode = ref<'view' | 'edit'>('view')
const value = ref('')
const fieldName = ref('')
const placement = ref('')
const errorMsg = ref('')

let b24: B24Frame | null = null

onMounted(async () => {
  try {
    const { initializeB24Frame } = await import('@bitrix24/b24jssdk')
    b24 = await initializeB24Frame()
    placement.value = b24.placement.placement // ожидаем 'USERFIELD_TYPE'
    const opt: any = b24.placement.options || {}
    mode.value = opt.MODE === 'edit' ? 'edit' : 'view'
    value.value = opt.VALUE ?? ''
    fieldName.value = opt.FIELD_NAME ?? ''
    // Подгоняем высоту iframe (высота поля также ограничена OPTIONS.height при регистрации).
    await b24.parent.fitWindow()
  }
  catch (e: any) {
    errorMsg.value = 'Эта страница работает только внутри поля карточки Битрикс24 (iframe). '
      + (e?.message || '')
  }
})

async function onInput(e: Event) {
  const v = (e.target as HTMLInputElement).value
  value.value = v
  // setValue сам сериализует значение через JSON.stringify (родитель делает JSON.parse).
  if (b24) {
    await b24.placement.setValue(v)
  }
}
</script>

<template>
  <div class="root">
    <p v-if="errorMsg" class="fallback">
      {{ errorMsg }}
    </p>

    <template v-else>
      <input
        v-if="mode === 'edit'"
        :value="value"
        type="text"
        placeholder="Введите значение виджета…"
        @input="onInput"
      >
      <div v-else :class="value ? 'view' : 'empty'">
        {{ value || '— значение не задано —' }}
      </div>

      <div class="ctx">
        placement: {{ placement }} · mode: {{ mode }}<span v-if="fieldName"> · field: {{ fieldName }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
:root { color-scheme: light dark }
.root { font: 13px/1.4 system-ui, sans-serif; padding: 8px 10px }
.view { font-weight: 600 }
.empty { color: #888 }
input { font: inherit; padding: 6px 8px; border: 1px solid #8886; border-radius: 6px; width: 100%; box-sizing: border-box }
.ctx { color: #888; font-size: 11px; margin-top: 6px }
.fallback { color: #d64545 }
</style>
