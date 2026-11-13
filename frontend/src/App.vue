<script setup lang="ts">
import { watch } from 'vue';
import { RouterLink, RouterView, useRouter } from 'vue-router';
import ClockPanel from '@/components/ClockPanel.vue';
import { useAuthStore } from '@/stores/auth';
import { useClockStore } from '@/stores/clock';

const auth = useAuthStore();
const clock = useClockStore();
const router = useRouter();

watch(
  () => auth.me,
  (me) => {
    if (me) void clock.load();
  },
  { immediate: true },
);

function logout() {
  auth.logout();
  void router.push({ name: 'login' });
}
</script>

<template>
  <header v-if="auth.me" class="top">
    <strong>팀 근태관리</strong>
    <nav>
      <RouterLink to="/">대시보드</RouterLink>
      <RouterLink to="/requests">신청</RouterLink>
      <RouterLink v-if="auth.isLead" to="/lead">리드 관리</RouterLink>
    </nav>
    <ClockPanel />
    <span class="who"
      >{{ auth.me.name }} ({{ auth.isLead ? '리드' : '팀원' }})</span
    >
    <button class="link" @click="logout">로그아웃</button>
  </header>
  <main class="page">
    <RouterView />
  </main>
</template>

<style>
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  font-family:
    system-ui,
    -apple-system,
    'Apple SD Gothic Neo',
    sans-serif;
  color: #1f2328;
  background: #f6f7f9;
  font-size: 14px;
}
.top {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 20px;
  background: #fff;
  border-bottom: 1px solid #e3e6ea;
  flex-wrap: wrap;
}
.top nav {
  display: flex;
  gap: 12px;
}
.top nav a {
  color: #57606a;
  text-decoration: none;
}
.top nav a.router-link-exact-active {
  color: #0b57d0;
  font-weight: 600;
}
.who {
  margin-left: auto;
  color: #57606a;
}
.page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 20px;
}
.card {
  background: #fff;
  border: 1px solid #e3e6ea;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}
.card h2 {
  font-size: 16px;
  margin: 0 0 12px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  text-align: left;
  padding: 6px 8px;
  border-bottom: 1px solid #eef0f2;
  vertical-align: top;
}
th {
  color: #57606a;
  font-weight: 500;
}
button {
  padding: 6px 12px;
  border: 1px solid #c9ced4;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
}
button.primary {
  background: #0b57d0;
  border-color: #0b57d0;
  color: #fff;
}
button.danger {
  color: #b42318;
  border-color: #f0c2bd;
}
button.link {
  border: none;
  background: none;
  color: #0b57d0;
  padding: 0;
}
button:disabled {
  opacity: 0.5;
  cursor: default;
}
input,
select {
  padding: 6px 8px;
  border: 1px solid #c9ced4;
  border-radius: 6px;
  font: inherit;
}
label {
  display: block;
  margin-bottom: 8px;
}
label > span {
  display: inline-block;
  min-width: 90px;
  color: #57606a;
}
.tag {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 12px;
  background: #eef0f2;
  margin-left: 4px;
}
.tag.warn {
  background: #fff1e5;
  color: #b54708;
}
.tag.bad {
  background: #fde8e7;
  color: #b42318;
}
.tag.ok {
  background: #e7f6ec;
  color: #1a7f37;
}
.error {
  color: #b42318;
  margin: 8px 0;
}
.muted {
  color: #6e7781;
}
.row {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
</style>
