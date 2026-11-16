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
      <RouterLink to="/calendar">팀 일정</RouterLink>
      <RouterLink v-if="auth.isLead" to="/lead">리드 관리</RouterLink>
    </nav>
    <ClockPanel />
    <div class="account">
      <span class="who"
        >{{ auth.me.name }} ({{ auth.isLead ? '리드' : '팀원' }})</span
      >
      <button class="link" @click="logout">로그아웃</button>
    </div>
  </header>
  <main class="page">
    <RouterView />
  </main>
</template>

<style>
/* 색·간격은 여기 토큰으로만 (ATT-44). 화면은 단순하게, 상태(호버·포커스·비활성)만 분명하게 */
:root {
  --ink: #1b1f24;
  --muted: #5b636e;
  --line: #e4e7eb;
  --line-soft: #eef0f3;
  --surface: #fff;
  --bg: #f5f6f8;
  --hover: #f2f4f7;
  --accent: #1a56db;
  --accent-strong: #1446b8;
  --accent-soft: #e8effd;
  --danger: #b42318;
  --danger-soft: #fdecea;
  --warn: #a64b05;
  --warn-soft: #fff1e3;
  --ok: #17703a;
  --ok-soft: #e6f4ea;
  --radius: 8px;
  --control-h: 32px;
  --ring: 0 0 0 3px rgba(26, 86, 219, 0.28);
}
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  font-family:
    system-ui,
    -apple-system,
    'Apple SD Gothic Neo',
    'Malgun Gothic',
    sans-serif;
  color: var(--ink);
  background: var(--bg);
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
::selection {
  background: var(--accent-soft);
  color: var(--ink);
}
input,
textarea {
  caret-color: var(--accent);
}
:focus-visible {
  outline: none;
  box-shadow: var(--ring);
}

/* 상단 바 */
.top {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 8px 20px;
  padding: 0 24px;
  min-height: 52px;
  background: var(--surface);
  border-bottom: 1px solid var(--line);
  flex-wrap: wrap;
}
.top > strong {
  font-size: 15px;
  letter-spacing: -0.01em;
}
.top nav {
  display: flex;
  gap: 2px;
}
.top nav a {
  padding: 6px 10px;
  border-radius: 6px;
  color: var(--muted);
  text-decoration: none;
  font-weight: 500;
  transition: background-color 150ms ease-out;
}
.top nav a:hover {
  background: var(--hover);
  color: var(--ink);
}
.top nav a.router-link-exact-active {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}
.account {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}
.who {
  color: var(--muted);
}

.page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px;
}
.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
  padding: 20px;
  margin-bottom: 16px;
}
.card h2 {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin: 0 0 12px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}
.grid > .card {
  margin-bottom: 0;
}

/* 표: 숫자·시각은 자릿수 맞춤, 행 구분은 옅게 */
table {
  width: 100%;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}
th,
td {
  text-align: left;
  padding: 8px;
  border-bottom: 1px solid var(--line-soft);
  vertical-align: top;
}
th {
  color: var(--muted);
  font-weight: 500;
}
thead th {
  font-size: 12px;
  border-bottom-color: var(--line);
}
tbody tr:last-child > * {
  border-bottom: none;
}
tbody tr:hover > td {
  background: #fafbfc;
}

/* 버튼 */
button {
  min-height: var(--control-h);
  padding: 0 12px;
  border: 1px solid #cdd2d8;
  border-radius: 6px;
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background-color 150ms ease-out,
    border-color 150ms ease-out;
}
button:hover {
  background: var(--hover);
}
button:active {
  background: #e9ecf0;
}
button.primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
button.primary:hover {
  background: var(--accent-strong);
  border-color: var(--accent-strong);
}
button.danger {
  color: var(--danger);
  border-color: #efc5c0;
}
button.danger:hover {
  background: var(--danger-soft);
}
button.link {
  min-height: 0;
  border: none;
  background: none;
  color: var(--accent);
  padding: 0;
}
button.link:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}
button:disabled,
button:disabled:hover {
  background: var(--hover);
  border-color: var(--line);
  color: #9aa1aa;
  cursor: not-allowed;
}

/* 입력 */
input,
select,
textarea {
  min-height: var(--control-h);
  padding: 4px 8px;
  border: 1px solid #cdd2d8;
  border-radius: 6px;
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  transition: border-color 150ms ease-out;
}
input[type='checkbox'],
input[type='radio'] {
  min-height: 0;
  accent-color: var(--accent);
}
input:hover,
select:hover,
textarea:hover {
  border-color: #aeb5be;
}
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  border-color: var(--accent);
}
::placeholder {
  color: #8a929c;
}
label {
  display: block;
  margin-bottom: 8px;
}
label > span {
  display: inline-block;
  min-width: 90px;
  color: var(--muted);
}

/* 상태 표시 */
.tag {
  display: inline-block;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  line-height: 18px;
  white-space: nowrap;
  background: var(--line-soft);
  color: var(--muted);
  margin-left: 4px;
}
.tag.warn {
  background: var(--warn-soft);
  color: var(--warn);
}
.tag.bad {
  background: var(--danger-soft);
  color: var(--danger);
}
.tag.ok {
  background: var(--ok-soft);
  color: var(--ok);
}
.error {
  color: var(--danger);
  background: var(--danger-soft);
  border-radius: 6px;
  padding: 8px 12px;
  margin: 8px 0;
}
.muted {
  color: var(--muted);
}
.row {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

@media (max-width: 640px) {
  .top {
    padding: 8px 16px;
  }
  .page {
    padding: 16px;
  }
  .card {
    padding: 16px;
  }
  /* 좁은 화면에서는 칸을 찌그러뜨리지 않고 표만 옆으로 스크롤 */
  table {
    display: block;
    overflow-x: auto;
  }
  th,
  td {
    white-space: nowrap;
  }
  td.row {
    flex-wrap: nowrap;
  }
}
@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
  }
}
</style>
