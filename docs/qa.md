# 시나리오 QA·새 환경 실행 점검 (ATT-8)

> 2026-11-14, main `26a4252` 기준. 평가자처럼 **깨끗한 폴더에 clone → 설치 → 실행**한 뒤 과제 제도의 핵심 흐름을 API로 끝까지 돌렸다.
> 자동 테스트(단위 344 · e2e 7)와 별개로, 실제 서버·실제 SQLite·실제 가드를 거친 결과다.

## 1. 새 환경 실행

| 단계 | 명령 | 결과 |
|---|---|---|
| clone | `git clone …` | 통과 |
| 설치 | `npm i` (루트 postinstall이 backend·frontend까지 설치) | 통과, 약 15초, 취약점 0 |
| 초기화 | `npm run setup` (`.env` 자동 생성 → prisma generate → migrate deploy → seed) | 통과, `backend/.env`·`dev.db` 생성 |
| 백엔드 | `npm run start:dev` | 통과, 라우트 33개 등록 |
| 프런트 | `npm run build` (vue-tsc + vite) | 통과 |

- `.env`는 저장소에 없다(gitignore). `npm run setup`의 `scripts/ensure-env.js`가 없을 때만 만들어 준다.
- Node 22.12 이상 필요(루트 `engines`). 점검 환경은 Node 24.11 / npm 11.6.

## 2. 시나리오 (44개 확인, 모두 통과)

시각은 리드의 "현재 시각 변경"(`PUT /dev/clock`)으로 옮겨 가며 확인했다. 다른 IP는 Vite 프록시처럼 `X-Forwarded-For`로 흉내 냈다(`trust proxy`는 loopback만).

| 영역 | 확인한 것 |
|---|---|
| 로그인·역할 | 틀린 비밀번호 401 `INVALID_CREDENTIALS` · 토큰 없음 401 · 팀원이 리드 API 호출 403 `FORBIDDEN_ROLE` |
| 출근 경계 | 06:59:59 `CHECK_IN_TOO_EARLY` · 10:00:00 정상 · 10:00:01 지각 · 두 번 출근 `ALREADY_CHECKED_IN` |
| 퇴근·근무시간 | 15:59:59 `CHECK_OUT_TOO_EARLY` · 10:00→18:00 = 점심 빼고 420분 → 조퇴 |
| 팀 보드 | 팀원에게는 상태만(출근 시각 없음), 리드에게는 시각·지각까지 |
| 미기록 퇴근 | 다음 출근 응답에 `pendingManualCheckouts` · 입력 전 퇴근 `PENDING_MANUAL_CHECKOUT` · 직접 입력은 `MANUAL` · 리드 미기록 목록에 표시 |
| 신청·승인·취소 | 연차 신청 즉시 차감·승인 대기 · 리드 대기 목록 · 승인 · PDF(`application/pdf`) · 남의 PDF 404 · 기한 전 본인 취소 시 잔여 복원 |
| 기한 후 예외 신청 | 사유 없으면 `LATE_REASON_REQUIRED` · 사유 있으면 `isAfterDeadline` 접수 · 오늘 날짜 `PAST_DATE_REQUEST` · 대기 중이면 본인 철회 |
| IP 제한 | 등록 안 된 IP 403 `IP_NOT_ALLOWED` · 승인된 재택 IP·시간대 출근 가능 · 시간대 밖(18:30) 403 |
| 주말 근무·OFF | 토요일 주말 근무 신청 · 평일이면 `WEEKEND_WORK_NOT_HOLIDAY` · 승인 없는 주말 출근 `WEEKEND_WORK_NOT_APPROVED` · 신청 IP로 출근 · 퇴근 시 반일 OFF 1개 지급(만료 +30일) |
| 반일 OFF 사용 | 팀 보드에 "오전 OFF 09:00~13:00" · 13:00→17:00(4시간) 정상 |
| 리드 당일 취소 | 진행 중 본인 취소 `SAME_DAY_CANCEL_LEAD_ONLY` · 리드가 하루만 취소 · 그날 11시 출근은 긴급 출근(지각 아님) |
| 공휴일 | `GET /holidays`에 2027 대체공휴일 · 2027년 연차 신청 가능 |
| 정산·이력 | 월별 정산 4명 · 이력 기본 조회에 로그인 성공 없음 · `includeLogin=true`면 포함 |

## 3. 발견한 것

| 내용 | 판단 |
|---|---|
| 주말 근무 퇴근 시 OFF가 지급되지만 화면에 "지급됨" 안내는 없다(잔여 칸이 1개로 바뀌는 것으로만 보임). 퇴근 API 응답에도 지급 여부가 없고 이력 payload에만 있다 | 기능은 정상. 개선 후보로 남김 |
| QA 스크립트가 처음에 퇴근 응답의 `offGranted`를 기대했다 → 위 항목과 같은 이유로 실패, 잔여 조회로 지급을 확인 | 스크립트 가정 오류 |

## 4. 화면으로 다시 해 보기

시드 계정은 모두 비밀번호 `password123`: `lead`(리드) · `kim`(김근태) · `yeon`(연차원) · `lim`(임자율).

1. 로그인 후 상단 시계 버튼("현재 시각 변경", 개발 모드)에서 2026-11-16 10:00:01로 바꾼다 (서버 시각이라 모든 계정에 적용)
2. `yeon`으로 로그인해 출근 → 지각 표시, `lead`의 팀 보드에서 지각 확인
3. 다음 날로 시각을 옮기고 `yeon`으로 출근 → 퇴근 시각 입력 창(닫기 없음)
4. `kim`으로 연차 신청 → `lead`의 승인 대기에서 승인 → `kim`의 잔여 확인 → 기한 전 취소로 복원
5. `lead`의 인터랙션 이력에서 위 동작들이 문장으로 남았는지 확인
