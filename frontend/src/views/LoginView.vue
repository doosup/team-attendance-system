<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();
const loginId = ref('');
const password = ref('');
const error = ref('');
const busy = ref(false);

// 평가용 시드 계정 (prisma/seed.ts). 개발 서버(npm run dev)에서만 보인다:
// 빌드본(Docker·운영)은 첫 비밀번호가 SEED_PASSWORD라 이 안내가 틀리고, 계정 목록을 밖에 드러내지 않게
const showSeedAccounts = import.meta.env.DEV;
const accounts = [
  { loginId: 'lead', name: '이리드', role: '리드' },
  { loginId: 'kim', name: '김근태', role: '팀원 (1/1 입사)' },
  { loginId: 'yeon', name: '연차원', role: '팀원 (1/15 입사)' },
  { loginId: 'lim', name: '임자율', role: '팀원 (2/12 입사)' },
];

async function submit() {
  error.value = '';
  busy.value = true;
  try {
    await auth.login(loginId.value.trim(), password.value);
    await router.push({ name: 'dashboard' });
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '로그인하지 못했습니다';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="login card">
    <h2>팀 근태관리 로그인</h2>
    <form @submit.prevent="submit">
      <label
        ><span>아이디</span
        ><input v-model="loginId" autocomplete="username" required
      /></label>
      <label>
        <span>비밀번호</span>
        <input
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
        />
      </label>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <button class="primary" type="submit" :disabled="busy">로그인</button>
    </form>
    <template v-if="showSeedAccounts">
      <hr />
      <p class="muted">시드 계정 (비밀번호 모두 <code>password123</code>)</p>
      <table>
        <tbody>
          <tr v-for="a in accounts" :key="a.loginId">
            <td>
              <button
                class="link"
                type="button"
                @click="
                  loginId = a.loginId;
                  password = 'password123';
                "
              >
                {{ a.loginId }}
              </button>
            </td>
            <td>{{ a.name }}</td>
            <td class="muted">{{ a.role }}</td>
          </tr>
        </tbody>
      </table>
    </template>
  </div>
</template>

<style scoped>
.login {
  max-width: 420px;
  margin: 60px auto;
}
hr {
  border: none;
  border-top: 1px solid var(--line-soft);
  margin: 16px 0;
}
</style>
