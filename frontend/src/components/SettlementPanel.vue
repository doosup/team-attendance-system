<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { api, ApiError } from '@/api/client';
import type { MonthlySettlement } from '@/api/types';
import { minutesText, remoteText } from '@/format';
import { useClockStore } from '@/stores/clock';

// 리드: 월별 정산 (FR-STL-01)
const clock = useClockStore();
const month = ref(clock.today.slice(0, 7));
const data = ref<MonthlySettlement | null>(null);
const error = ref('');

async function load() {
  error.value = '';
  try {
    data.value = await api<MonthlySettlement>(
      'GET',
      `/lead/settlements?month=${month.value}`,
    );
  } catch (e) {
    error.value =
      e instanceof ApiError ? e.message : '정산을 불러오지 못했습니다';
  }
}
onMounted(load);
watch([month, () => clock.version], load);
</script>

<template>
  <section class="card">
    <div class="row" style="justify-content: space-between">
      <h2>월별 정산</h2>
      <label><input v-model="month" type="month" required /></label>
    </div>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <template v-else-if="data">
      <div style="overflow-x: auto">
        <table>
          <thead>
            <tr>
              <th>이름</th>
              <th>근무일</th>
              <th>근무시간</th>
              <th>지각</th>
              <th>조퇴</th>
              <th>직접 입력</th>
              <th>미기록</th>
              <th>연차 사용</th>
              <th>OFF 사용</th>
              <th>재택</th>
              <th>연차 잔여</th>
              <th>OFF 잔여</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in data.rows" :key="r.userId">
              <td>
                {{ r.name }}
                <span v-if="r.retiredDate" class="tag">
                  퇴사 {{ r.retiredDate }}
                </span>
              </td>
              <td>{{ r.workDays }}일</td>
              <td>{{ minutesText(r.workedMinutes) }}</td>
              <td>{{ r.lateCount }}</td>
              <td>{{ r.earlyLeaveCount }}</td>
              <td>{{ r.manualCount }}</td>
              <td>{{ r.missingCount }}</td>
              <td>{{ r.annualUsedDays }}일</td>
              <td>{{ r.halfOffUsed }}개</td>
              <td>
                {{ remoteText(r.remote).inLimit }}
                <span v-if="remoteText(r.remote).over" class="tag warn">
                  {{ remoteText(r.remote).over }}
                </span>
              </td>
              <td>{{ r.annualBalanceDays }}일</td>
              <td>{{ r.halfOffBalance }}개</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="muted">
        잔여는 {{ data.asOf }} 기준 (지난달은 말일, 이번 달은 오늘). 사용은 그
        달 날짜에 차감된 것(대기 포함, 취소분 제외), 재택은 대기·승인 건.
      </p>
    </template>
  </section>
</template>
