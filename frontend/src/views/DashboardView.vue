<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { api, ApiError } from '@/api/client';
import type { Balance, BoardRow, MissingCheckout, Today } from '@/api/types';
import ManualCheckoutModal from '@/components/ManualCheckoutModal.vue';
import {
  BOARD_STATUS,
  DAY_TYPE,
  halfOffText,
  kstTime,
  minutesText,
} from '@/format';
import { useAuthStore } from '@/stores/auth';
import { useClockStore } from '@/stores/clock';

// 일일 현황 (FR-DSH-01): 내 카드 + 팀 보드 + 미기록 건
const auth = useAuthStore();
const clock = useClockStore();
const today = ref<Today | null>(null);
const balance = ref<Balance | null>(null);
const board = ref<BoardRow[]>([]);
const missing = ref<MissingCheckout[]>([]);
const error = ref('');
const busy = ref(false);

async function load() {
  error.value = '';
  try {
    [today.value, balance.value, board.value, missing.value] =
      await Promise.all([
        api<Today>('GET', '/attendance/today'),
        api<Balance>('GET', '/balances/me'),
        api<BoardRow[]>('GET', '/dashboard/team'),
        api<MissingCheckout[]>('GET', '/dashboard/me/missing'),
      ]);
  } catch (e) {
    if (e instanceof ApiError) error.value = e.message;
  }
}
onMounted(load);
watch(() => clock.version, load);

const att = computed(() => today.value?.attendance ?? null);
const canCheckIn = computed(
  () =>
    !!today.value &&
    !att.value &&
    !['ANNUAL_LEAVE', 'DAY_OFF'].includes(today.value.dayType),
);
const canCheckOut = computed(() => !!att.value && !att.value.checkOutAt);
const pending = computed(() => today.value?.pendingManualCheckouts[0] ?? null);

async function press(path: '/attendance/check-in' | '/attendance/check-out') {
  error.value = '';
  busy.value = true;
  try {
    await api('POST', path);
    await load();
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '요청에 실패했습니다';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <ManualCheckoutModal v-if="pending" :pending="pending" @done="load" />
  <p v-if="error" class="error" role="alert">{{ error }}</p>

  <div class="grid">
    <section class="card">
      <h2>내 카드 · {{ today?.workDate }}</h2>
      <p>
        오늘:
        <strong>{{ DAY_TYPE[today?.dayType ?? ''] ?? today?.dayType }}</strong>
      </p>
      <table>
        <tbody>
          <tr>
            <th>출근</th>
            <td>
              {{ kstTime(att?.checkInAt) }}
              <span v-if="att?.isLate" class="tag bad">지각</span>
            </td>
          </tr>
          <tr>
            <th>퇴근</th>
            <td>
              {{ kstTime(att?.checkOutAt) }}
              <span v-if="att?.checkOutSource === 'MANUAL'" class="tag"
                >직접 입력</span
              >
              <span v-if="att?.isEarlyLeave" class="tag warn">조퇴</span>
            </td>
          </tr>
          <tr>
            <th>근무시간</th>
            <td>{{ minutesText(att?.workedMinutes) }}</td>
          </tr>
          <tr v-if="today?.expectedCheckOutAt">
            <th>정상 퇴근 가능</th>
            <td>{{ kstTime(today.expectedCheckOutAt) }} 이후</td>
          </tr>
        </tbody>
      </table>
      <div class="row" style="margin-top: 12px">
        <button
          class="primary"
          :disabled="!canCheckIn || busy"
          @click="press('/attendance/check-in')"
        >
          출근
        </button>
        <button
          :disabled="!canCheckOut || busy"
          @click="press('/attendance/check-out')"
        >
          퇴근
        </button>
      </div>
    </section>

    <section class="card">
      <h2>잔여</h2>
      <table v-if="balance">
        <tbody>
          <tr>
            <th>연차</th>
            <td>{{ balance.annual.days }}일</td>
          </tr>
          <tr>
            <th>반일 OFF</th>
            <td>
              {{ balance.halfOff.count }}개
              <div
                v-for="g in balance.halfOff.grants"
                :key="g.expiresOn"
                class="muted"
              >
                {{ g.expiresOn }}까지 {{ g.remaining }}개
              </div>
            </td>
          </tr>
          <tr>
            <th>재택 ({{ balance.remote.month }})</th>
            <td>
              {{ balance.remote.used }}/{{ balance.remote.limit }}
              <span v-if="balance.remote.exceptions" class="tag warn">
                + 예외 {{ balance.remote.exceptions }}회
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>

  <section class="card">
    <h2>팀 보드</h2>
    <table>
      <thead>
        <tr>
          <th>이름</th>
          <th>상태</th>
          <template v-if="auth.isLead">
            <th>출근</th>
            <th>퇴근</th>
            <th>근무시간</th>
          </template>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in board" :key="r.userId">
          <td>{{ r.name }}</td>
          <td>
            {{
              r.halfOff
                ? halfOffText(r.halfOff)
                : (BOARD_STATUS[r.status] ?? r.status)
            }}
            <span v-if="auth.isLead && r.pastTen" class="tag bad"
              >10시 경과</span
            >
          </td>
          <template v-if="auth.isLead">
            <td>
              {{ kstTime(r.checkInAt) }}
              <span v-if="r.isLate" class="tag bad">지각</span>
            </td>
            <td>
              {{ kstTime(r.checkOutAt) }}
              <span v-if="r.checkOutSource === 'MANUAL'" class="tag"
                >직접 입력</span
              >
              <span v-if="r.isEarlyLeave" class="tag warn">조퇴</span>
            </td>
            <td>{{ minutesText(r.workedMinutes) }}</td>
          </template>
        </tr>
      </tbody>
    </table>
  </section>

  <section class="card">
    <h2>내 퇴근 미기록·직접 입력</h2>
    <p v-if="missing.length === 0" class="muted">없습니다</p>
    <table v-else>
      <tbody>
        <tr v-for="m in missing" :key="m.attendanceId">
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
</template>
