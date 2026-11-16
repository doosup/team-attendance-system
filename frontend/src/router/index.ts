import { createRouter, createWebHistory } from 'vue-router';
import { setApiHandlers } from '@/api/client';
import { useAuthStore } from '@/stores/auth';
import BlockedView from '@/views/BlockedView.vue';
import CalendarView from '@/views/CalendarView.vue';
import DashboardView from '@/views/DashboardView.vue';
import LeadView from '@/views/LeadView.vue';
import LoginView from '@/views/LoginView.vue';
import RequestsView from '@/views/RequestsView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { public: true },
    },
    {
      path: '/blocked',
      name: 'blocked',
      component: BlockedView,
      meta: { public: true },
    },
    { path: '/', name: 'dashboard', component: DashboardView },
    { path: '/requests', name: 'requests', component: RequestsView },
    { path: '/calendar', name: 'calendar', component: CalendarView },
    { path: '/lead', name: 'lead', component: LeadView, meta: { lead: true } },
  ],
});

// 역할별 화면 (FR-SYS-02): 로그인 전엔 로그인 화면, 리드 화면은 리드만
router.beforeEach(async (to) => {
  if (to.meta.public) return true;
  const auth = useAuthStore();
  if (!(await auth.restore())) return { name: 'login' };
  if (to.meta.lead && !auth.isLead) return { name: 'dashboard' };
  return true;
});

setApiHandlers({
  unauthorized: () => {
    useAuthStore().logout();
    if (router.currentRoute.value.name !== 'login')
      void router.push({ name: 'login' });
  },
  ipBlocked: (message) => {
    void router.push({ name: 'blocked', query: { message } });
  },
});

export default router;
