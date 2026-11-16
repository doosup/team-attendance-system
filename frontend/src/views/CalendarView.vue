<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { api, ApiError } from '@/api/client';
import type { CalendarEntry, Holiday, RequestType } from '@/api/types';
import { useClockStore } from '@/stores/clock';

// 팀 일정 달력 (ATT-47): 확정된 일정(승인·취소 안 됨)만. 칸마다 "종류 한 글자 + 이름" 한 줄씩
const clock = useClockStore();
const BADGE: Record<RequestType, { short: string; label: string }> = {
  ANNUAL: { short: '연', label: '연차' },
  HALF_OFF: { short: '반', label: '반일 OFF' },
  REMOTE: { short: '재', label: '재택' },
  WEEKEND_WORK: { short: '주', label: '주말·공휴일 근무' },
};
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

const month = ref(clock.today.slice(0, 7));
const entries = ref<CalendarEntry[]>([]);
const holidays = ref<Holiday[]>([]);
const error = ref('');

async function load() {
  error.value = '';
  try {
    entries.value = await api<CalendarEntry[]>(
      'GET',
      `/dashboard/calendar?month=${month.value}`,
    );
  } catch (e) {
    entries.value = [];
    error.value =
      e instanceof ApiError ? e.message : '일정을 불러오지 못했습니다';
  }
}
onMounted(() => {
  load();
  // 공휴일은 표시용이라 실패해도 달력은 그대로
  api<Holiday[]>('GET', '/holidays').then(
    (h) => (holidays.value = h),
    () => {},
  );
});
watch(month, load);
watch(
  () => clock.version,
  () => {
    month.value = clock.today.slice(0, 7);
    load();
  },
);

const [y, m] = [
  computed(() => +month.value.slice(0, 4)),
  computed(() => +month.value.slice(5, 7)),
];
const title = computed(() => `${y.value}년 ${m.value}월`);
function shift(delta: number) {
  const d = new Date(Date.UTC(y.value, m.value - 1 + delta, 1));
  month.value = d.toISOString().slice(0, 7);
}

const pad = (n: number) => String(n).padStart(2, '0');
type Day = {
  date: string;
  day: number;
  weekday: number;
  holiday?: string;
  items: CalendarEntry[];
};
const days = computed<Day[]>(() => {
  const count = new Date(Date.UTC(y.value, m.value, 0)).getUTCDate();
  const first = new Date(Date.UTC(y.value, m.value - 1, 1)).getUTCDay();
  return Array.from({ length: count }, (_, i) => {
    const date = `${month.value}-${pad(i + 1)}`;
    return {
      date,
      day: i + 1,
      weekday: (first + i) % 7,
      holiday: holidays.value.find((h) => h.date === date)?.name,
      items: entries.value.filter((e) => e.date === date),
    };
  });
});
// 일요일 시작: 1일 앞을 빈 칸으로 채우고 마지막 주도 7칸으로
const cells = computed<(Day | null)[]>(() => {
  const lead = days.value[0]?.weekday ?? 0;
  const list: (Day | null)[] = [...Array(lead).fill(null), ...days.value];
  while (list.length % 7) list.push(null);
  return list;
});
const busyDays = computed(() =>
  days.value.filter((d) => d.items.length || d.holiday),
);

const partText = (e: CalendarEntry) =>
  e.halfOffPart === 'AM' ? '오전' : e.halfOffPart === 'PM' ? '오후' : '';
</script>

<template>
  <section class="card">
    <div class="head">
      <h2>팀 일정</h2>
      <div class="row month-nav">
        <button aria-label="이전 달" @click="shift(-1)">‹</button>
        <strong class="month">{{ title }}</strong>
        <button aria-label="다음 달" @click="shift(1)">›</button>
        <button
          v-if="month !== clock.today.slice(0, 7)"
          @click="month = clock.today.slice(0, 7)"
        >
          이번 달
        </button>
      </div>
    </div>
    <p class="muted legend">
      승인된 일정만 보입니다 ·
      <span v-for="(b, t) in BADGE" :key="t" class="legend-item">
        <span class="badge" :class="t">{{ b.short }}</span> {{ b.label }}
      </span>
    </p>
    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <div class="grid-cal" role="group" :aria-label="`${title} 팀 일정`">
      <div class="week" aria-hidden="true">
        <div
          v-for="(w, i) in WEEK"
          :key="w"
          :class="{ sun: i === 0, sat: i === 6 }"
        >
          {{ w }}
        </div>
      </div>
      <div class="cells">
        <template v-for="(c, i) in cells" :key="i">
          <div v-if="!c" class="cell empty" />
          <div
            v-else
            class="cell"
            :class="{ today: c.date === clock.today }"
          >
            <div class="date">
              <span
                class="num"
                :class="{
                  sun: c.weekday === 0 || c.holiday,
                  sat: c.weekday === 6 && !c.holiday,
                }"
                >{{ c.day }}</span
              >
              <span v-if="c.holiday" class="holiday">{{ c.holiday }}</span>
            </div>
            <ul>
              <li v-for="e in c.items" :key="e.userId + e.type">
                <span
                  class="badge"
                  :class="e.type"
                  :title="BADGE[e.type].label"
                  >{{ BADGE[e.type].short }}</span
                >
                <span class="name">{{ e.name }}</span>
                <span v-if="partText(e)" class="muted part">{{
                  partText(e)
                }}</span>
              </li>
            </ul>
          </div>
        </template>
      </div>
    </div>

    <!-- 좁은 화면: 7칸 달력 대신 일정 있는 날만 목록으로 -->
    <ul class="list-cal">
      <li v-if="busyDays.length === 0" class="muted">
        이 달에는 확정된 일정이 없습니다
      </li>
      <li
        v-for="d in busyDays"
        :key="d.date"
        :class="{ today: d.date === clock.today }"
      >
        <div class="date">
          <span :class="{ sun: d.weekday === 0 || d.holiday }"
            >{{ m }}/{{ d.day }} ({{ WEEK[d.weekday] }})</span
          >
          <span v-if="d.holiday" class="holiday">{{ d.holiday }}</span>
        </div>
        <div class="items">
          <span v-for="e in d.items" :key="e.userId + e.type" class="item">
            <span class="badge" :class="e.type">{{ BADGE[e.type].short }}</span>
            {{ e.name }}
            <span v-if="partText(e)" class="muted">{{ partText(e) }}</span>
          </span>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.head h2 {
  margin: 0;
}
.month {
  min-width: 96px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  align-items: center;
}
.legend-item {
  white-space: nowrap;
}

.badge {
  display: inline-grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  flex: none;
}
.badge.ANNUAL {
  background: var(--accent-soft);
  color: var(--accent);
}
.badge.HALF_OFF {
  background: var(--warn-soft);
  color: var(--warn);
}
.badge.REMOTE {
  background: var(--ok-soft);
  color: var(--ok);
}
.badge.WEEKEND_WORK {
  background: var(--line-soft);
  color: var(--ink);
}

.sun {
  color: var(--danger);
}
.sat {
  color: var(--accent);
}

.grid-cal {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  overflow: hidden;
}
.week,
.cells {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}
.week > div {
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 600;
  border-bottom: 1px solid var(--line);
  background: var(--bg);
}
.cell {
  min-height: 104px;
  padding: 8px 10px;
  border-right: 1px solid var(--line-soft);
  border-bottom: 1px solid var(--line-soft);
  min-width: 0;
}
.cells > :nth-child(7n) {
  border-right: none;
}
.cell.today {
  box-shadow: inset 0 0 0 2px var(--accent);
  background: var(--accent-soft);
}
.cell.today .num {
  color: var(--accent);
  font-weight: 700;
}
.date {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
  margin-bottom: 6px;
}
.num {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}
.holiday {
  font-size: 11px;
  color: var(--danger);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cell ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 4px;
}
.cell li {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  min-width: 0;
}
.name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.part {
  font-size: 12px;
}

.list-cal {
  display: none;
  list-style: none;
  margin: 0;
  padding: 0;
}
.list-cal > li {
  padding: 10px 0;
  border-bottom: 1px solid var(--line-soft);
}
.list-cal > li.today {
  background: var(--accent-soft);
  padding-inline: 8px;
  border-radius: 6px;
}
.list-cal .date {
  margin-bottom: 4px;
  font-size: 13px;
  font-weight: 600;
}
.items {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
}
.item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

@media (max-width: 640px) {
  .grid-cal {
    display: none;
  }
  .list-cal {
    display: block;
  }
}
</style>
