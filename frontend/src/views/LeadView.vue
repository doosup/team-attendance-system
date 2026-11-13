<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { api, ApiError } from '@/api/client';
import type {
  AllowedIp,
  AuditLog,
  LeaveRequest,
  MissingCheckout,
} from '@/api/types';
import { kstDateTime, kstTime, REQUEST_TYPE } from '@/format';
import SettlementPanel from '@/components/SettlementPanel.vue';
import { useClockStore } from '@/stores/clock';

// 리드 전용: 승인·반려, 당일 취소, 팀 미기록, 월별 정산, 연구실 IP, 이력
const clock = useClockStore();
const pending = ref<LeaveRequest[]>([]);
const approved = ref<LeaveRequest[]>([]);
const missing = ref<MissingCheckout[]>([]);
const ips = ref<AllowedIp[]>([]);
const logs = ref<AuditLog[]>([]);
const newIp = reactive({ ip: '', label: '' });
const logFilter = reactive({ userId: '', from: '', to: '' });
const error = ref('');

async function guard(action: () => Promise<unknown>) {
  error.value = '';
  try {
    await action();
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '요청에 실패했습니다';
  }
}

async function loadLogs() {
  const q = new URLSearchParams(
    Object.entries(logFilter).filter(([, v]) => v !== '') as [string, string][],
  );
  logs.value = await api<AuditLog[]>('GET', `/lead/audit-logs?${q}`);
}

async function load() {
  await guard(async () => {
    [pending.value, approved.value, missing.value, ips.value] =
      await Promise.all([
        api<LeaveRequest[]>('GET', '/lead/requests?status=PENDING'),
        api<LeaveRequest[]>('GET', '/lead/requests?status=APPROVED'),
        api<MissingCheckout[]>('GET', '/lead/missing-checkouts'),
        api<AllowedIp[]>('GET', '/lead/allowed-ips'),
      ]);
    await loadLogs();
  });
}
onMounted(load);
watch(() => clock.version, load);

// 당일 취소 대상: 승인된 신청 중 오늘 날짜가 살아 있는 것 (결정 12)
const todays = computed(() =>
  approved.value.filter((r) =>
    r.days.some((d) => d.date === clock.today && d.status === 'ACTIVE'),
  ),
);

const approve = (r: LeaveRequest) =>
  guard(async () => {
    await api('POST', `/lead/requests/${r.id}/approve`);
    await load();
  });

const reject = (r: LeaveRequest) =>
  guard(async () => {
    const rejectReason = prompt('반려 사유 (필수)');
    if (!rejectReason) return;
    await api('POST', `/lead/requests/${r.id}/reject`, { rejectReason });
    await load();
  });

const cancelToday = (r: LeaveRequest) =>
  guard(async () => {
    const cancelReason = prompt(
      `${r.userName} ${clock.today} 당일 취소 사유 (필수, 그날은 긴급 출근)`,
    );
    if (!cancelReason) return;
    await api('POST', `/lead/requests/${r.id}/days/${clock.today}/cancel`, {
      cancelReason,
    });
    await load();
  });

const addIp = () =>
  guard(async () => {
    await api('POST', '/lead/allowed-ips', newIp);
    newIp.ip = newIp.label = '';
    await load();
  });

const deleteIp = (ip: AllowedIp) =>
  guard(async () => {
    if (!confirm(`${ip.ip} (${ip.label})를 삭제할까요?`)) return;
    await api('DELETE', `/lead/allowed-ips/${ip.id}`);
    await load();
  });

const period = (r: LeaveRequest) =>
  r.endDate === r.startDate ? r.startDate : `${r.startDate} ~ ${r.endDate}`;
</script>

<template>
  <p v-if="error" class="error" role="alert">{{ error }}</p>

  <section class="card">
    <h2>승인 대기 ({{ pending.length }})</h2>
    <p v-if="pending.length === 0" class="muted">대기 중인 신청이 없습니다</p>
    <table v-else>
      <tbody>
        <tr v-for="r in pending" :key="r.id">
          <td>{{ r.userName }}</td>
          <td>
            {{ REQUEST_TYPE[r.type] }}
            <span v-if="r.isOverLimit" class="tag warn">예외 신청</span>
          </td>
          <td>
            {{ period(r) }} <span class="muted">({{ r.days.length }}일)</span>
          </td>
          <td>
            {{ r.reason || '-' }}
            <div v-if="r.ip" class="muted">
              {{ r.ip }} · {{ r.startTime }}~{{ r.endTime }}
            </div>
          </td>
          <td class="row">
            <button class="primary" @click="approve(r)">승인</button>
            <button class="danger" @click="reject(r)">반려</button>
          </td>
        </tr>
      </tbody>
    </table>
  </section>

  <section class="card">
    <h2>오늘({{ clock.today }}) 승인된 신청 · 당일 취소</h2>
    <p v-if="todays.length === 0" class="muted">
      오늘 적용되는 승인 신청이 없습니다
    </p>
    <table v-else>
      <tbody>
        <tr v-for="r in todays" :key="r.id">
          <td>{{ r.userName }}</td>
          <td>{{ REQUEST_TYPE[r.type] }}</td>
          <td>{{ period(r) }}</td>
          <td>
            <button class="danger" @click="cancelToday(r)">
              오늘만 취소 (긴급 출근)
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </section>

  <section class="card">
    <h2>팀 퇴근 미기록·직접 입력</h2>
    <p v-if="missing.length === 0" class="muted">없습니다</p>
    <table v-else>
      <tbody>
        <tr v-for="m in missing" :key="m.attendanceId">
          <td>{{ m.userName }}</td>
          <td>{{ m.workDate }}</td>
          <td>
            <span :class="['tag', m.kind === 'MISSING' ? 'bad' : '']">
              {{ m.kind === 'MISSING' ? '미기록' : '직접 입력' }}
            </span>
          </td>
          <td>
            출근 {{ kstTime(m.checkInAt) }} · 퇴근 {{ kstTime(m.checkOutAt) }}
          </td>
        </tr>
      </tbody>
    </table>
  </section>

  <SettlementPanel />

  <section class="card">
    <h2>연구실 IP</h2>
    <table>
      <tbody>
        <tr v-for="ip in ips" :key="ip.id">
          <td>{{ ip.ip }}</td>
          <td>{{ ip.label }}</td>
          <td><button class="danger" @click="deleteIp(ip)">삭제</button></td>
        </tr>
      </tbody>
    </table>
    <form class="row" style="margin-top: 12px" @submit.prevent="addIp">
      <input v-model="newIp.ip" placeholder="IP (CIDR 미지원)" required />
      <input
        v-model="newIp.label"
        placeholder="이름 (예: 2층 회의실)"
        required
      />
      <button class="primary" type="submit">추가</button>
    </form>
  </section>

  <section class="card">
    <h2>인터랙션 이력</h2>
    <form class="row" @submit.prevent="guard(loadLogs)">
      <input v-model="logFilter.userId" placeholder="사용자 id" size="8" />
      <input v-model="logFilter.from" type="date" /> ~
      <input v-model="logFilter.to" type="date" />
      <button type="submit">조회</button>
    </form>
    <table>
      <thead>
        <tr>
          <th>업무 시각</th>
          <th>누가</th>
          <th>무엇을</th>
          <th>내용</th>
          <th>IP</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="l in logs" :key="l.id">
          <td>
            {{ kstDateTime(l.occurredAt) }}
            <div class="muted" title="실제 기록 시각">
              {{ kstDateTime(l.createdAt) }}
            </div>
          </td>
          <td>{{ l.actor?.name ?? '-' }}</td>
          <td>{{ l.action }}</td>
          <td class="muted payload">{{ JSON.stringify(l.payload) }}</td>
          <td>{{ l.ip }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.payload {
  max-width: 420px;
  word-break: break-all;
  font-size: 12px;
}
</style>
