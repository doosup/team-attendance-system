<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { api, ApiError } from '@/api/client';

// 본인 비밀번호 변경 (ATT-53): 현재 비밀번호 확인 후 새 비밀번호(8자 이상)로
const emit = defineEmits<{ close: [] }>();
const current = ref('');
const next = ref('');
const confirmNext = ref('');
const error = ref('');
const done = ref(false);
const busy = ref(false);

async function submit() {
  error.value = '';
  if (next.value !== confirmNext.value) {
    error.value = '새 비밀번호와 확인이 다릅니다';
    return;
  }
  busy.value = true;
  try {
    await api('PUT', '/auth/me/password', {
      currentPassword: current.value,
      newPassword: next.value,
    });
    done.value = true;
  } catch (e) {
    error.value =
      e instanceof ApiError && e.code === 'VALIDATION_FAILED'
        ? '새 비밀번호는 8자 이상 72자 이하입니다'
        : e instanceof ApiError
          ? e.message
          : '바꾸지 못했습니다';
  } finally {
    busy.value = false;
  }
}

const onKey = (e: KeyboardEvent) => e.key === 'Escape' && emit('close');
onMounted(() => window.addEventListener('keydown', onKey));
onUnmounted(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <div class="backdrop" @click.self="emit('close')">
    <div
      class="card modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pw-title"
    >
      <h2 id="pw-title">비밀번호 변경</h2>
      <template v-if="done">
        <p>비밀번호를 바꿨습니다. 다음 로그인부터 새 비밀번호를 씁니다.</p>
        <button class="primary" @click="emit('close')">닫기</button>
      </template>
      <form v-else class="fields" @submit.prevent="submit">
        <label
          >현재 비밀번호
          <input
            v-model="current"
            type="password"
            autocomplete="current-password"
            required
        /></label>
        <label
          >새 비밀번호 (8자 이상)
          <input
            v-model="next"
            type="password"
            autocomplete="new-password"
            minlength="8"
            maxlength="72"
            required
        /></label>
        <label
          >새 비밀번호 확인
          <input
            v-model="confirmNext"
            type="password"
            autocomplete="new-password"
            required
        /></label>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <div class="row">
          <button class="primary" type="submit" :disabled="busy">바꾸기</button>
          <button type="button" @click="emit('close')">취소</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.modal {
  width: 400px;
  max-width: calc(100% - 32px);
}
.fields {
  display: grid;
  gap: 12px;
}
.fields label {
  display: grid;
  gap: 4px;
  font-size: 13px;
}
</style>
