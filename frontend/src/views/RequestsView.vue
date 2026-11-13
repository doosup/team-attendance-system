<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { api, ApiError } from '@/api/client';
import type { LeaveRequest, RequestType } from '@/api/types';
import { REQUEST_STATUS, REQUEST_TYPE } from '@/format';
import { useClockStore } from '@/stores/clock';

// 신청서 (FN-REQ-01): 종류·날짜·사유, 재택·주말 근무는 IP와 시간대도
const clock = useClockStore();
const form = reactive({
  type: 'ANNUAL' as RequestType,
  startDate: '',
  endDate: '',
  reason: '',
  ip: '',
  startTime: '09:00',
  endTime: '18:00',
});
const single = computed(
  () => form.type === 'HALF_OFF' || form.type === 'WEEKEND_WORK',
);
const needsIp = computed(
  () => form.type === 'REMOTE' || form.type === 'WEEKEND_WORK',
);
const list = ref<LeaveRequest[]>([]);
const includeCanceled = ref(false);
const error = ref('');
const notice = ref('');

async function load() {
  list.value = await api<LeaveRequest[]>(
    'GET',
    `/requests/me${includeCanceled.value ? '?includeCanceled=true' : ''}`,
  );
}
onMounted(load);
watch([includeCanceled, () => clock.version], load);

async function submit() {
  error.value = notice.value = '';
  try {
    const r = await api<LeaveRequest>('POST', '/requests', {
      type: form.type,
      startDate: form.startDate,
      endDate: single.value ? form.startDate : form.endDate,
      reason: form.reason,
      ...(needsIp.value
        ? { ip: form.ip, startTime: form.startTime, endTime: form.endTime }
        : {}),
    });
    notice.value =
      r.status === 'APPROVED'
        ? '신청이 자동 승인되었습니다'
        : r.isOverLimit
          ? '재택 한도를 넘어 예외 신청으로 접수되었습니다 (리드 승인 필요)'
          : '신청이 접수되었습니다 (리드 승인 대기)';
    await load();
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '신청하지 못했습니다';
  }
}

async function cancel(r: LeaveRequest) {
  if (
    !confirm(
      `${r.startDate}~${r.endDate} ${REQUEST_TYPE[r.type]} 신청 전체를 취소할까요?`,
    )
  )
    return;
  error.value = '';
  try {
    await api('POST', `/requests/${r.id}/cancel`);
    await load();
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '취소하지 못했습니다';
  }
}
</script>

<template>
  <section class="card">
    <h2>신청서</h2>
    <form @submit.prevent="submit">
      <label>
        <span>종류</span>
        <select v-model="form.type">
          <option v-for="(label, key) in REQUEST_TYPE" :key="key" :value="key">
            {{ label }}
          </option>
        </select>
      </label>
      <label>
        <span>{{ single ? '날짜' : '시작일' }}</span>
        <input v-model="form.startDate" type="date" required />
      </label>
      <label v-if="!single">
        <span>종료일</span>
        <input v-model="form.endDate" type="date" required />
        <span class="muted"> 영업일만 차감·적용됩니다</span>
      </label>
      <template v-if="needsIp">
        <label>
          <span>접속 IP</span>
          <input v-model="form.ip" placeholder="예: 203.0.113.10" required />
        </label>
        <label>
          <span>시간대</span>
          <input v-model="form.startTime" type="time" required /> ~
          <input v-model="form.endTime" type="time" required />
        </label>
      </template>
      <label>
        <span>사유</span>
        <input
          v-model="form.reason"
          size="40"
          placeholder="재택 한도 초과 예외 신청은 필수"
        />
      </label>
      <p class="muted">기한: 시작일의 직전 영업일 17:00:00까지</p>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-if="notice" class="tag ok">{{ notice }}</p>
      <div><button class="primary" type="submit">신청</button></div>
    </form>
  </section>

  <section class="card">
    <div class="row" style="justify-content: space-between">
      <h2>내 신청</h2>
      <label
        ><input v-model="includeCanceled" type="checkbox" /> 취소 포함</label
      >
    </div>
    <p v-if="list.length === 0" class="muted">신청이 없습니다</p>
    <table v-else>
      <thead>
        <tr>
          <th>종류</th>
          <th>기간</th>
          <th>상태</th>
          <th>날짜</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in list" :key="r.id">
          <td>
            {{ REQUEST_TYPE[r.type] }}
            <span v-if="r.isOverLimit" class="tag warn">예외</span>
          </td>
          <td>
            {{ r.startDate
            }}<template v-if="r.endDate !== r.startDate">
              ~ {{ r.endDate }}</template
            >
          </td>
          <td>
            {{ REQUEST_STATUS[r.status] }}
            <div v-if="r.rejectReason" class="muted">
              반려 사유: {{ r.rejectReason }}
            </div>
          </td>
          <td>
            <div v-for="d in r.days" :key="d.id">
              {{ d.date }}
              <span v-if="d.status === 'CANCELED'" class="tag">
                {{
                  d.cancelType === 'LEAD_SAME_DAY'
                    ? `당일 취소: ${d.cancelReason}`
                    : '취소'
                }}
              </span>
            </div>
          </td>
          <td>
            <button
              v-if="r.status === 'PENDING' || r.status === 'APPROVED'"
              class="danger"
              @click="cancel(r)"
            >
              취소
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
