<script setup lang="ts">
// Установочный обработчик локального приложения (Installation URL).
// SDK импортируется динамически ТОЛЬКО на клиенте.
import { onMounted, ref } from 'vue'

const status = ref('Установка…')

onMounted(async () => {
  try {
    const { initializeB24Frame } = await import('@bitrix24/b24jssdk')
    const b24 = await initializeB24Frame()
    await b24.installFinish()
    status.value = 'Готово. Приложение установлено — можно закрыть это окно.'
  }
  catch (e: any) {
    status.value = 'Ошибка установки: ' + (e?.message || e)
  }
})
</script>

<template>
  <p style="font: 14px system-ui, sans-serif; padding: 24px">
    {{ status }}
  </p>
</template>
