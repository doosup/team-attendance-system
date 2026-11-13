<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api, ApiError } from '@/api/client';
import type { PendingCheckout } from '@/api/types';
import { kstIso, kstTime } from '@/format';
import { useAuthStore } from '@/stores/auth';

// 미기록 퇴근 직접 입력 (결정 17): 닫기 없음, 로그아웃만. 입력해야 퇴근 버튼이 동작한다 (서버가 강제)
const props = defineProps<{ pending: PendingCheckout }>();
const emit = defineEmits<{ done: [] }>();
const auth = useAuthStore();
const router = useRouter();
const time = ref('');
const error = ref('');
const busy = ref(false);

async function submit() {
  error.value = '';
  busy.value = true;
  try {
    await api('POST', `/attendance/${props.pending.id}/manual-check-out`, {
      checkOutAt: kstIso(props.pending.workDate, time.value),
    });
    emit('done');
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '저장하지 못했습니다';
  } finally {
    busy.value = false;
  }
}

function logout() {
  auth.logout();
  void router.push({ name: 'login' });
}
</script>

<template>
  <div class="backdrop">
    <div
      class="card modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-title"
    >
      <h2 id="manual-title">퇴근 시각을 입력해 주세요</h2>
      <p>
        <strong>{{ auth.me?.name }}</strong> 님,
        <strong>{{ pending.workDate }}</strong> 퇴근이 기록되지 않았습니다.
      </p>
      <p class="muted">
        그날 출근 {{ kstTime(pending.checkInAt) }} 이후 ~ 23:59:59 사이로
        입력합니다. '직접 입력'으로 표시되고 리드가 확인할 수 있습니다. 입력
        전에는 오늘 퇴근을 찍을 수 없습니다.
      </p>
      <form class="row" @submit.prevent="submit">
        <input
          v-model="time"
          type="time"
          step="1"
          required
          aria-label="퇴근 시각 (KST)"
        />
        <button class="primary" type="submit" :disabled="busy || !time">
          저장
        </button>
      </form>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <button class="link" @click="logout">로그아웃</button>
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
  width: 440px;
  max-width: calc(100% - 32px);
}
</style>
