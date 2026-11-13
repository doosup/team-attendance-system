# CLAUDE.md — 하이컨시 과제: 팀 근태관리 시스템 (지정 주제 2)

팀 내부 근태관리 웹앱. 리드 1명 + 팀원 3명. 평가자가 **로컬에서 clone → 설치 → 실행**만으로 동작해야 한다.
평가 기준: 구현한 부분의 품질, 설계 의도와 고민(README에 기록). UI는 단순하게.

## 기술 스택
- backend/: NestJS (TypeScript), Prisma(6.2+), SQLite (`backend/prisma/dev.db`, gitignore)
- frontend/: Vue 3 (TypeScript, Vite, Pinia, Vue Router)
- 테스트: Jest (backend). 정책 로직은 반드시 단위 테스트
- 날짜: dayjs + utc/timezone 플러그인. 날짜는 `YYYY-MM-DD`(KST) 문자열, 순간은 UTC DateTime, 판정·표시 Asia/Seoul
- 비밀번호: bcrypt 해시만 저장

## 실행 (목표 형태)
```
cd backend && npm i && npm run setup   # prisma migrate + seed
npm run start:dev                      # http://localhost:3000
cd frontend && npm i && npm run dev    # http://localhost:5173
```

## 디렉토리 구조 (backend/src) — 헥사고날, 레이어 먼저 (gguniverse 방식)
```
main.ts, app.module.ts
app/                         Application 계층
  use-case.interface.ts
  <feature>/                 auth, attendance, request, balance, dashboard, dev
    controller/              <action>.controller.ts   ← 1:1:1 (Controller = API = UseCase)
    dto/                     <action>.dto.ts           ← Request·Result, class-validator, static from(entity)
    use-case/                <action>.use-case.ts      ← 흐름 조립, @Transactional()
    <feature>.module.ts
  lead/                      리드 전용 (@Roles('LEAD'), 경로 /lead/...)
    approval/ allowed-ip/ attendance/ balance/ audit-log/ settlement/   (각각 controller/ dto/ use-case/)
domain/                      Domain 계층 — Nest·Prisma import 금지
  entity/                    user, attendance, request, request-day, ledger-entry, allowed-ip, audit-log
  repository/                *.repository.ts  ← abstract class (인터페이스만)
  policy/                    attendance.policy.ts, request.policy.ts, balance.policy.ts (순수 함수)
  port/                      clock.port.ts
  value/                     work-date.ts, half-days.ts, paging.ts
  exception/                 custom.exception.ts, error-code.ts, <domain>.exception.ts
infrastructure/
  prisma/                    prisma.service.ts, prisma.module.ts, repository.module.ts
    repository/              prisma-<name>.repository.ts  ← domain/repository 구현
    mapper/                  <name>.mapper.ts  (Prisma 모델 ↔ 엔티티)
  query/                     team-board.query.ts, settlement.query.ts (조회 전용)
  clock/                     system.clock.ts, overridable.clock.ts
  token/                     jwt-token.service.ts
common/
  decorators/ filters/(→ { error }) guards/(ip, jwt-auth, roles) interceptors/(→ { data }) pipes/
  utils/                     ip.util.ts, business-day.util.ts, holidays/2026.json
config/
```
- 파일명 = 기능명(kebab-case) + 역할 접미사. 예: `approve-request.controller.ts` / `.dto.ts` / `.use-case.ts`
- 상세 표와 근거: `docs/design.md` 디렉토리 구조, ADR-006·007

## 레이어 규칙
- 의존 방향: app → domain ← infrastructure. domain은 아무것도 import하지 않음
- 저장소: use-case는 `domain/repository`의 abstract class만 주입받음. 구현 연결은 `repository.module.ts`에서 `{ provide: XRepository, useClass: PrismaXRepository }`
- 트랜잭션: use-case에 `@Transactional()` (nestjs-cls + Prisma 어댑터). 한 요청의 여러 저장소가 같은 트랜잭션 사용
- 조회 예외: 팀 보드·미기록 목록·정산은 entity 없이 `infrastructure/query`에서 바로 조회
- 테스트 3층: ① policy·entity 순수 단위 테스트(약 70%) ② use-case는 `InMemoryXRepository` 가짜 저장소로(약 20%) ③ 통합(e2e)은 테스트용 SQLite로 핵심 흐름만(약 10%: 출근→퇴근 판정, 신청→승인→차감→취소→복원, IP 403, 미기록 퇴근 시 퇴근 거부). `*.spec.ts`는 대상 파일 옆, e2e는 `test/`

## 데이터 모델 (상세·근거는 `docs/design.md`)
- User / Attendance / Request / RequestDay / LeaveLedger / AuditLog / AllowedIp
- **Attendance:** 사람·근무일당 1행 `@@unique([userId, workDate])`. 판정 결과(isLate, isEarlyLeave, workedMinutes)는 기록 시점에 저장. `isEarlyLeave` null = 퇴근 전. `checkOutSource` BUTTON / MANUAL
- **Request + RequestDay:** 신청은 기간(startDate~endDate), 내부는 날짜별 RequestDay. 연차·재택은 기간 안의 영업일만 행 생성, 반일 OFF·주말 근무는 하루 1행. 잔여·한도·팀 보드·당일 취소는 RequestDay 기준
- **LeaveLedger:** `halfDays` 정수(1일 = 2, 반일 = 1, 부호 포함), 사용·복원은 RequestDay 단위로 한 줄씩. 반일 OFF는 `grantId`로 지급분 연결. 적립·만료는 조회 시 동기화하며 `dedupKey` 유일로 중복 방지
- **AuditLog:** `occurredAt`(Clock 기준) + `createdAt`(실제 시각), payload Json, actorId null 허용
- **시각 컬럼:** User·AllowedIp = createdAt·updatedAt·deletedAt(소프트 삭제) / Attendance·Request·RequestDay = createdAt·updatedAt / LeaveLedger·AuditLog = createdAt만(추가 전용, 수정·삭제 금지). 기술 시각은 Prisma `@default(now())`·`@updatedAt`(실제 시각), 업무 시각은 Clock
- **취소는 상태, 삭제는 소프트 삭제:** 취소된 신청·날짜는 CANCELED 상태로 남김(통계·원장 참조). 소프트 삭제는 User·AllowedIp만. 목록 화면은 기본 `status != CANCELED` 필터 + "취소 포함" 옵션. 소프트 삭제 대상 조회는 항상 `deletedAt: null`
- **AllowedIp:** `ip` 유일 제약 없음 → 살아 있는 것 중 중복은 use-case에서 확인
- **인덱스:** Request (userId, status), (status, startDate) / RequestDay (userId, date, status), (date, status) / Attendance (workDate) / LeaveLedger (userId, kind) / AuditLog (actorId, occurredAt), (occurredAt)
- 중복 신청(같은 사람·같은 날·ACTIVE 행)은 use-case에서 트랜잭션 안에 확인 (조건부 유일 제약 불가)
- Enum: Role, DayType, CheckOutSource, RequestType, RequestStatus, DayStatus, CancelType, LeaveKind, LedgerEvent, AuditAction. 입력은 DTO `@IsEnum()`으로 검증

## 아키텍처 규칙
- **정책과 엔티티는 순수.** `*.policy.ts`, `*.entity.ts`는 DB·Clock·Nest에 의존하지 않고 값만 받아 결과를 반환한다. usecase가 Clock에서 now를 받아 넘긴다.
- **`new Date()` / `Date.now()` 직접 호출 금지.** 항상 주입된 `Clock.now()` 사용.
- **잔여는 저장하지 않고 원장 합산으로 계산한다.** 연차 반차는 제도에 없어 미구현(확장 지점)
- **이력은 지우지 않는다.** 모든 변경(출퇴근, 직접 입력, 신청, 취소, 승인, 로그인, IP 차단, 시각 변경)을 AuditLog에 추가.
- 컨트롤러는 얇게: DTO 검증(class-validator) → usecase 호출. 비즈니스 규칙 위반은 도메인 에러 코드로 반환 (예: `REQUEST_DEADLINE_PASSED`, `REMOTE_MONTHLY_LIMIT`).
- 응답: 성공 `{ data }`, 실패 `{ error: { code, message } }`
- 리드 전용 API는 `/lead/...` (approve·reject·당일 취소·대기 목록·IP 관리·이력·팀 미기록·팀원 원장·정산). 팀원이 호출하면 403 `FORBIDDEN_ROLE`

## 근태 제도 (확정 해석 — 근거는 `docs/decisions.md`)
- 출근: 07:00:00부터 등록. 10:00:00까지 정상, 10:00:01부터 지각. 반일 OFF 사용일은 지각 판정 없음
- 퇴근: 16:00:00부터 등록 (반일 OFF 사용일은 제한 없음). 출근일 23:59:59까지. 자정 넘김 미지원
- 근무시간 = 퇴근 − 출근 − (11:30~12:30 **전체**가 구간에 포함되면 1시간). 점심은 고정 시간대이며 일부만 겹치면 차감 없음 (12:11 출근 → 차감 없음)
- 조퇴: 일반일 8시간 미만, 반일 OFF 사용일 4시간 미만
- 근무일 유형(Attendance.dayType): `FULL_DAY` / `HALF_DAY_OFF` / `EMERGENCY_WORK`(리드 당일 취소) / `WEEKEND_WORK`. 연차일은 출퇴근 기록 없음. 반나절 판정(지각 제외, 4시간 기준, 16:00 제한 없음)은 함수 하나로 처리. 근무시간 계산은 일반일과 동일
  - 예) 반일 OFF 07:00→11:00 정상, 12:30→16:30 정상, 11:00→16:00 정상(점심 차감 후 4h), 10:00→14:00 조퇴(3h)
- 정상 퇴근 가능 시각(내 카드 표시): 출근 + 8h(반일 OFF는 4h), 점심 구간이 포함되면 +1h. 일반일은 16:00보다 이르면 16:00
- 퇴근 미기록: 출근은 **항상 즉시 기록**(서버 시각), 응답·`GET /attendance/today`에 `pendingManualCheckouts` 포함 → 화면은 닫기 없는 입력 창(이름·날짜, 로그아웃 링크). 입력 전 퇴근은 서버가 `PENDING_MANUAL_CHECKOUT`으로 거부. 입력 범위: 그날 출근 시각 ~ 23:59:59, `checkOutSource = MANUAL`. "남음" 여부는 직전 근무일 checkOutAt null로 판단
- 팀 보드: 팀원·리드 모두 조회. 팀원은 상태만, 리드는 시각·지각·조퇴까지. 출근 전은 "미출근"(리드에게만 10:00 경과 강조). 지각은 출근 시점에만 판정
- 연차: 입사 1개월 뒤부터 매월 입사일과 같은 날(없으면 말일)에 +1. 입사 당일 적립 없음
- 재택: 대상 날짜가 속한 달 기준 2회 (PENDING·APPROVED의 ACTIVE 행), 이월 없음. 한도를 넘는 신청은 거부하지 않고 **신청서 전체를 예외 신청**(`isOverLimit = true`, 사유 필수, 리드 승인 필수, 리드 본인은 자동 승인+이력). 월을 넘는 기간은 달마다 따로 세고 하나라도 넘으면 예외. 화면 표시 "2/2 + 예외 n회"
- OFF: 승인된 주말·공휴일 근무에서 출퇴근 모두 기록되면 퇴근 시점에 반일 OFF 1개 지급. 지급 +30일 만료. 만료 임박 순 사용
- 기간 신청: 연차·재택은 startDate~endDate로 한 번에 신청·승인. 영업일만 차감. 반일 OFF·주말 근무는 하루만
- 신청 기한: **시작일**의 직전 영업일 17:00:00까지 (17:00:01부터 거부)
- 취소: 본인은 **기간 전체만**, 시작일의 직전 영업일 17:00:00까지 (`SELF_BEFORE_DEADLINE`). 기간 변경은 전체 취소 후 재신청. 당일(23:59:59까지)은 **리드만**, **그날 하루만**, 사유 필수 (`LEAD_SAME_DAY`) → 그날 `EMERGENCY_WORK`(지각·조퇴 판정 없음, 근무시간만 기록). 취소된 날짜만 원장 RESTORE (원래 만료일 유지). 지난 날짜 취소 불가
- 영업일: 월~금 중 공휴일 제외. 공휴일은 `holidays/2026.json`
- 접속: 연구실 IP(AllowedIp, 시드 127.0.0.1) 상시 허용. 재택·주말/공휴일 근무는 승인된 신청의 IP·시간대에서만. 차단 시 403 `IP_NOT_ALLOWED` → 화면 "등록된 IP가 아닙니다 (현재 IP: x.x.x.x)"
- IP: `net.isIP()`로 최소 형식 검사(연구실 IP·재택/주말 신청 IP 공통). `::ffff:` 접두어 제거, `::1`은 localhost로 정규화(평가자 환경 차단 방지). 연구실 IP는 리드 전용 API로 관리, 현재 접속 IP·마지막 IP 삭제 불가. CIDR 미지원
- 로그인: JWT 12시간, localStorage. 401이면 로그인 화면. 비밀번호 재설정은 미구현(확장 방안)
- 승인: Request 상태 PENDING / APPROVED / REJECTED / CANCELED. 리드가 기간 전체를 승인·반려(반려 사유 필수). 잔여는 신청 시 USE, 반려·취소 시 RESTORE. 리드 본인 신청은 자동 APPROVED. 대상일에 PENDING이면 미승인 처리(재택·주말 IP 불허, 팀 보드 "승인 대기"). 리드 대기 목록은 시작일 가까운 순
- 시드: 리드 1명, 김근태(2026-01-01), 연차원(2026-01-15), 임자율(2026-02-12), 연구실 IP 127.0.0.1

## 컨벤션
- 파일 kebab-case, 클래스 PascalCase, 변수·함수 camelCase, 상수 UPPER_SNAKE
- 커밋: Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`), 한 커밋 한 목적
- 테스트 이름은 한국어로 규칙을 그대로 쓴다. 예: `it('10:00:01 출근은 지각이다')`
- 경계값 테스트 필수: 06:59:59/07:00:00, 10:00:00/10:00:01, 15:59:59/16:00:00, 17:00:00/17:00:01

## 작업 티켓 (Notion 작업 보드 ↔ GitHub)
- 모든 작업은 Notion "작업 보드"의 티켓 하나에서 시작한다. 티켓 번호는 `ATT-<n>` (보드의 "티켓" 속성).
- 한 티켓 = 한 브랜치 = 한 PR. 작업 중 범위가 커지면 티켓을 새로 나누고, 한 브랜치에 여러 티켓을 섞지 않는다.
- 브랜치: `<type>/ATT-<n>-<짧은-영문-설명>` (예: `feat/ATT-24-check-in`, `fix/ATT-14-ip-normalize`). type은 feat / fix / refactor / test / docs / chore.
- 커밋: `<type>(ATT-<n>): <한국어 요약>` (예: `feat(ATT-24): 출근 등록과 지각 판정 추가`). 커밋 하나는 테스트가 통과하는 한 단위.
- PR 제목: `[ATT-<n>] <요약>`. PR 본문 첫 줄에 Notion 티켓 링크를 적는다. 머지 후 Notion 티켓의 "PR" 칸에 PR 링크를 붙이고 상태를 "완료"로 바꾼다 (Notion 무료 요금제라 자동 연동 없음).
- 작업 시작 시 Claude는 해당 티켓 번호를 확인하고, 끝나면 브랜치 이름·커밋 메시지·PR 제목/본문 제안을 위 형식으로 남긴다. 브랜치 생성·커밋·푸시·PR 생성은 사용자가 GitHub Desktop에서 직접 한다.

## Claude 작업 규칙
- **git commit·push는 하지 않는다.** 커밋과 푸시는 사용자가 GitHub Desktop에서 변경 내용을 직접 확인하고 한다. 작업이 끝나면 커밋 메시지 제안(Conventional Commits)만 남긴다.
- **API 구조는 `docs/design.md`가 기준(2026-11-12 확정).** 경로·요청·응답·에러 코드를 바꿔야 하면 코드보다 문서를 먼저 고치고, 임의로 바꾸지 말고 질문한다.
- 한 번에 한 기능. 요청받은 범위 밖의 파일은 수정하지 않는다.
- 정책 변경은 테스트 먼저 (test-driven-development).
- 제도 해석이 위 목록으로 결정되지 않으면 임의로 정하지 말고 질문한다.
- 작업이 끝나면 변경 파일과 실행한 테스트 결과만 짧게 보고한다.
- 승인·반려(D3 오전)와 연구실 IP 관리 API(D3)는 필수로 취급. 나머지 선택 기능(월별 정산, PDF, 메뉴바 위젯)은 필수 기능과 테스트가 끝난 뒤에만.
