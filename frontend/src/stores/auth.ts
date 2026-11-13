import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { api, tokenStore } from '@/api/client';
import type { Me } from '@/api/types';

// 로그인 상태. 토큰은 localStorage (결정 20, httpOnly 쿠키는 확장 방안)
export const useAuthStore = defineStore('auth', () => {
  const me = ref<Me | null>(null);
  const isLead = computed(() => me.value?.role === 'LEAD');

  async function login(loginId: string, password: string) {
    const r = await api<{ accessToken: string; user: Me }>(
      'POST',
      '/auth/login',
      {
        loginId,
        password,
      },
    );
    tokenStore.set(r.accessToken);
    me.value = r.user;
  }

  /** 새로고침 후 토큰이 있으면 내 정보를 다시 받아 온다 */
  async function restore(): Promise<boolean> {
    if (me.value) return true;
    if (!tokenStore.get()) return false;
    try {
      me.value = await api<Me>('GET', '/auth/me');
      return true;
    } catch {
      return false;
    }
  }

  function logout() {
    tokenStore.clear();
    me.value = null;
  }

  return { me, isLead, login, restore, logout };
});
