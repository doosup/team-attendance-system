<script setup lang="ts">
import { ref } from 'vue';
import { ApiError } from '@/api/client';
import { kstDateTime, kstIso } from '@/format';
import { useClockStore } from '@/stores/clock';

// 현재 시각 변경 패널 (개발 모드, ATT-26). 판정은 모두 서버 시각 기준이라 여기서 바꾸면 전체에 적용된다.
const clock = useClockStore();
const open = ref(false);
const date = ref('');
const time = ref('09:00:00');
const error = ref('');

function toggle() {
  open.value = !open.value;
  date.value ||= clock.today;
}

async function run(action: () => Promise<void>) {
  error.value = '';
  try {
    await action();
    open.value = false;
  } catch (e) {
    error.value =
      e instanceof ApiError ? e.message : '시각을 바꾸지 못했습니다';
  }
}
</script>

<template>
  <div v-if="clock.available" class="clock">
    <button class="link" title="현재 시각 변경 (개발 모드)" @click="toggle">
      서버 시각 {{ kstDateTime(clock.serverNow.toISOString()) }}
      <span v-if="clock.overridden" class="tag warn">변경됨</span>
    </button>
    <div v-if="open" class="pop card">
      <div class="row">
        <input v-model="date" type="date" aria-label="날짜 (KST)" />
        <input v-model="time" type="time" step="1" aria-label="시각 (KST)" />
        <button
          class="primary"
          @click="run(() => clock.set(kstIso(date, time)))"
        >
          적용
        </button>
        <button @click="run(clock.reset)">실제 시각으로</button>
      </div>
      <p class="muted">
        KST 기준. 바꾼 뒤에도 시간은 흐릅니다. 서버를 재시작하면 실제 시각으로
        돌아갑니다.
      </p>
      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>

<style scoped>
.clock {
  position: relative;
}
.pop {
  position: absolute;
  top: 28px;
  left: 0;
  z-index: 10;
  width: 420px;
  box-shadow: 0 8px 24px rgba(16, 24, 40, 0.12);
}
</style>
