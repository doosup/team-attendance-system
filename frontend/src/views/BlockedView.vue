<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

// IP 차단 안내 (403 IP_NOT_ALLOWED). 메시지에 서버가 본 현재 IP가 들어 있다.
const route = useRoute();
const message = computed(
  () => (route.query.message as string | undefined) ?? '등록된 IP가 아닙니다',
);
</script>

<template>
  <div class="card blocked">
    <h2>접속할 수 없습니다</h2>
    <p role="alert">{{ message }}</p>
    <p class="muted">
      연구실 IP에서 접속하거나, 승인된 재택·주말 근무 신청의 IP와 시간대에서
      접속해 주세요.
    </p>
    <RouterLink to="/">다시 시도</RouterLink>
  </div>
</template>

<style scoped>
.blocked {
  max-width: 520px;
  margin: 60px auto;
}
</style>
