import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { api, ApiError } from '@/api/client';
import type { ServerClock } from '@/api/types';

// 서버 시각 (모든 판정 기준). 한 번 받아 온 뒤 브라우저에서 1초씩 흘려 보여 준다.
export const useClockStore = defineStore('clock', () => {
  const available = ref(true); // 운영 모드(NODE_ENV=production)면 /dev/clock이 없다
  const overridden = ref(false);
  const offsetMs = ref(0); // 서버 시각 - 브라우저 시각
  const tick = ref(Date.now());
  const version = ref(0); // 시각을 바꾸면 증가 → 화면들이 다시 불러온다

  setInterval(() => (tick.value = Date.now()), 1000);

  const serverNow = computed(() => new Date(tick.value + offsetMs.value));
  const today = computed(() =>
    new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(
      serverNow.value,
    ),
  );

  function apply(c: ServerClock) {
    offsetMs.value = new Date(c.now).getTime() - Date.now();
    overridden.value = c.overridden;
    tick.value = Date.now();
  }

  async function load() {
    try {
      apply(await api<ServerClock>('GET', '/dev/clock'));
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) available.value = false;
    }
  }

  async function set(isoWithOffset: string) {
    apply(await api<ServerClock>('PUT', '/dev/clock', { now: isoWithOffset }));
    version.value++;
  }

  async function reset() {
    apply(await api<ServerClock>('DELETE', '/dev/clock'));
    version.value++;
  }

  return { available, overridden, serverNow, today, version, load, set, reset };
});
