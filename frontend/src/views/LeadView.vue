<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { api, ApiError, download } from '@/api/client';
import type {
  AllowedIp,
  AuditAction,
  AuditLog,
  LeaveRequest,
  Member,
  MissingCheckout,
} from '@/api/types';
import { halfOffText, kstDateTime, kstTime, REQUEST_TYPE } from '@/format';
import SettlementPanel from '@/components/SettlementPanel.vue';
import { ACTION_LABEL, describeLog } from '@/audit-log';
import { useClockStore } from '@/stores/clock';

// 리드 전용: 승인·반려, 당일 취소, 팀 미기록, 월별 정산, 연구실 IP, 이력
const clock = useClockStore();
const pending = ref<LeaveRequest[]>([]);
const approved = ref<LeaveRequest[]>([]);
const missing = ref<MissingCheckout[]>([]);
const ips = ref<AllowedIp[]>([]);
const members = ref<Member[]>([]);
// 이력 필터·이름 표시용: 퇴사자 포함 (ATT-38)
const everyone = ref<Member[]>([]);
const newMember = reactive({
  loginId: '',
  password: '',
  name: '',
  joinDate: '',
});
const logs = ref<AuditLog[]>([]);
const newIp = reactive({ ip: '', label: '' });
const logFilter = reactive({
  userId: '',
  from: '',
  to: '',
  includeLogin: false,
});
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
    Object.entries(logFilter)
      .filter(([, v]) => v !== '' && v !== false)
      .map(([k, v]) => [k, String(v)]),
  );
  logs.value = await api<AuditLog[]>('GET', `/lead/audit-logs?${q}`);
}

// 카드마다 따로 불러온다: 한 목록이 실패해도 나머지 카드는 보이게 (오류는 첫 번째만 표시)
async function load() {
  error.value = '';
  const fail = (e: unknown) => {
    error.value ||=
      e instanceof ApiError ? e.message : '불러오지 못한 목록이 있습니다';
  };
  await Promise.all([
    api<LeaveRequest[]>('GET', '/lead/requests?status=PENDING').then(
      (r) => (pending.value = r),
      fail,
    ),
    api<LeaveRequest[]>('GET', '/lead/requests?status=APPROVED').then(
      (r) => (approved.value = r),
      fail,
    ),
    api<MissingCheckout[]>('GET', '/lead/missing-checkouts').then(
      (r) => (missing.value = r),
      fail,
    ),
    api<AllowedIp[]>('GET', '/lead/allowed-ips').then(
      (r) => (ips.value = r),
      fail,
    ),
    api<Member[]>('GET', '/lead/users').then((r) => (members.value = r), fail),
    api<Member[]>('GET', '/lead/users?includeRetired=true').then(
      (r) => (everyone.value = r),
      fail,
    ),
    loadLogs().catch(fail),
  ]);
}
onMounted(load);
watch(() => clock.version, load);
// 사람·로그인 포함을 바꾸면 바로 다시 조회 (기간은 두 칸을 고른 뒤 조회 버튼으로)
watch(
  () => [logFilter.userId, logFilter.includeLogin],
  () => guard(loadLogs),
);

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

// 회원가입 대신 리드가 팀원을 등록한다 (결정 A19)
const registerMember = () =>
  guard(async () => {
    await api('POST', '/lead/users', newMember);
    Object.assign(newMember, {
      loginId: '',
      password: '',
      name: '',
      joinDate: '',
    });
    await load();
  });

// 퇴사 처리 = 소프트 삭제. 기록은 남고 내일 이후 신청은 자동 취소 (결정 A20)
const retireMember = (m: Member) =>
  guard(async () => {
    if (
      !confirm(
        `${m.name}(${m.loginId})님을 퇴사 처리할까요?\n기록은 남고, 로그인과 팀 목록에서 빠지며 내일 이후 신청은 자동 취소됩니다.`,
      )
    )
      return;
    await api('DELETE', `/lead/users/${m.id}`);
    await load();
  });

const pdf = (r: LeaveRequest) =>
  guard(() => download(`/requests/${r.id}/pdf`, `신청서-${r.id}.pdf`));

// 이력의 신청자 id → 이름. 퇴사자는 목록에 없어 #id로
const nameOf = (id: unknown) =>
  everyone.value.find((m) => m.id === id)?.name ?? `#${String(id)}`;

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
            <span v-if="r.isOverLimit" class="tag warn">한도 초과</span>
            <span v-if="r.isAfterDeadline" class="tag warn">기한 후</span>
          </td>
          <td>
            {{ period(r) }} <span class="muted">({{ r.days.length }}일)</span>
          </td>
          <td>
            {{ r.reason || '-' }}
            <div v-if="r.type === 'HALF_OFF'" class="muted">
              {{
                halfOffText({
                  part: r.halfOffPart,
                  startTime: r.startTime,
                  endTime: r.endTime,
                })
              }}
            </div>
            <div v-else-if="r.startTime" class="muted">
              {{ r.ip }} · {{ r.startTime }}~{{ r.endTime }}
            </div>
          </td>
          <td class="row">
            <button class="primary" @click="approve(r)">승인</button>
            <button class="danger" @click="reject(r)">반려</button>
            <button @click="pdf(r)">PDF</button>
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
          <td class="row">
            <button class="danger" @click="cancelToday(r)">
              오늘만 취소 (긴급 출근)
            </button>
            <button @click="pdf(r)">PDF</button>
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
    <h2>팀원</h2>
    <table>
      <thead>
        <tr>
          <th>이름</th>
          <th>아이디</th>
          <th>입사일</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="m in members" :key="m.id">
          <td>
            {{ m.name }}
            <span v-if="m.role === 'LEAD'" class="tag">리드</span>
          </td>
          <td>{{ m.loginId }}</td>
          <td>{{ m.joinDate }}</td>
          <td>
            <button
              v-if="m.role === 'MEMBER'"
              class="danger"
              @click="retireMember(m)"
            >
              퇴사 처리
            </button>
          </td>
        </tr>
      </tbody>
    </table>
    <form class="row" style="margin-top: 12px" @submit.prevent="registerMember">
      <input
        v-model="newMember.name"
        placeholder="이름"
        aria-label="이름"
        required
      />
      <input
        v-model="newMember.loginId"
        placeholder="아이디 (영문 소문자·숫자 3~20자)"
        aria-label="아이디"
        pattern="[a-z0-9]{3,20}"
        required
      />
      <input
        v-model="newMember.password"
        type="password"
        placeholder="초기 비밀번호 (8자 이상)"
        aria-label="초기 비밀번호"
        minlength="8"
        autocomplete="new-password"
        required
      />
      <label>
        입사일
        <input
          v-model="newMember.joinDate"
          type="date"
          :max="clock.today"
          required
        />
      </label>
      <button class="primary" type="submit">팀원 등록</button>
    </form>
    <p class="muted">
      입사일 기준으로 연차가 적립됩니다. 퇴사 처리해도 출퇴근·신청·이력은
      남습니다.
    </p>
  </section>

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
      <select v-model="logFilter.userId" aria-label="누가">
        <option value="">전체</option>
        <option v-for="m in everyone" :key="m.id" :value="String(m.id)">
          {{ m.name }}{{ m.retiredDate ? ' (퇴사)' : '' }}
        </option>
      </select>
      <input v-model="logFilter.from" type="date" /> ~
      <input v-model="logFilter.to" type="date" />
      <label
        ><input v-model="logFilter.includeLogin" type="checkbox" /> 로그인
        포함</label
      >
      <button type="submit">조회</button>
    </form>
    <p class="muted">
      출퇴근·신청·승인 등 모든 인터랙션이 기록됩니다. 로그인 성공은 기본으로
      숨기고, 로그인 실패·접속 차단은 보안상 항상 보여 줍니다.
    </p>
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
          <td>{{ ACTION_LABEL[l.action as AuditAction] ?? l.action }}</td>
          <td>
            {{ describeLog(l, nameOf) }}
            <details class="muted payload">
              <summary>원본</summary>
              {{ JSON.stringify(l.payload) }}
            </details>
          </td>
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
