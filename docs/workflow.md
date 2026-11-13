# 작업 흐름 (Claude Code용 진행 안내)

> 이 파일은 "지금 어디까지 왔고, 다음에 뭘 하고, 어떤 스킬을 언제 쓰는지"를 정리한다.
> 스펙·설계 기준은 `docs/decisions.md`(제도 규칙 결정 1–20)와 `docs/design.md`(ERD·API 26개·에러 코드·ADR)이다.

## 과제 개요
- 하이컨시 과제 전형, 지정 주제 2: 팀 내부 근태관리 시스템
- 스택: Vue 3 + NestJS (TypeScript), Prisma + SQLite
- 마감: 2026-11-16 23:59:59 (KST)
- 제출물: GitHub 저장소 링크 (README에 실행 방법·스택 선택 이유·아키텍처·DB 설계 이유·제도 해석 규칙)

## 지금까지 끝난 것 (2026-11-13 기준)
- 제도 규칙 해석·결정 20개 → `docs/decisions.md`
- ERD, API 26개, 에러 코드 22개, ADR-001~007 확정 → `docs/design.md`
- 디렉토리 구조·레이어 규칙·티켓 규칙 → `CLAUDE.md`
- 저장소 생성 (doosup/team-attendance-system, Private), 문서 커밋 완료

## 티켓 진행 순서
티켓 = Notion "작업 보드"의 ATT-n. 한 티켓 = 한 브랜치 = 한 PR. 번호는 만든 순서라 작업 순서와 다르다. 아래 순서로 진행한다.

### D1 (11/13) — 기반
1. ATT-7 저장소 초기 세팅 (backend/frontend 스캐폴드, 루트 실행 스크립트)
2. ATT-30 Prisma 스키마·마이그레이션·시드 (팀원/리드 계정, 연구실 IP)

### D2 (11/14) — 백엔드 핵심
3. ATT-2 Clock 주입 + 현재 시각 변경 API
4. ATT-20 로그인·역할(팀원/리드), JWT
5. ATT-24 출근 등록·지각 판정
6. ATT-10 퇴근 등록·근무시간·조퇴 판정
7. ATT-23 미기록 퇴근 직접 입력 (서버 강제)
8. ATT-16 잔여 원장 (연차 적립·재택 월 초기화·OFF 지급/만료)
9. ATT-12 신청 (기한·잔여 검사, Request + RequestDay)
10. ATT-14 IP Guard (연구실 상시 + 신청 IP·시간대)
11. ATT-6 인터랙션 이력 기록
12. ATT-5 정책 단위 테스트 보강 (각 티켓에서 테스트를 같이 쓰고, 여기서는 빠진 경계값만 채운다)

### D3 (11/15) — 백엔드 마무리 + 프론트
13. ATT-19 신청 승인·반려
14. ATT-31 신청 취소 (본인 사전 취소·리드 당일 취소, 기간 전체)
15. ATT-28 연구실 IP 관리 API·화면
16. ATT-29 재택 한도 초과 예외 신청
17. ATT-4 로그인·역할별 화면
18. ATT-22 대시보드 (팀 보드·내 카드·미기록 건)
19. ATT-3 출퇴근 버튼·직접 입력 창
20. ATT-15 신청서 화면
21. ATT-26 현재 시각 변경 패널
22. (선택) ATT-13 월별 정산 테이블

### D4 (11/16) — 검증·문서·제출
23. ATT-8 시나리오 QA·새 환경 실행 점검
24. ATT-17 README·ADR 마무리
25. (선택) ATT-9 신청서 PDF, ATT-27 Electron 메뉴바 위젯 — 필수가 모두 끝났을 때만
26. ATT-1 메일·문자 제출 (사용자가 직접)

## 티켓 하나의 작업 순서
1. 사용자가 GitHub Desktop에서 `<type>/ATT-<n>-<설명>` 브랜치를 만들고 티켓 번호를 알려준다.
2. Claude는 `docs/design.md`에서 해당 API·테이블·에러 코드를, `docs/decisions.md`에서 관련 규칙을 먼저 확인한다.
3. 정책·엔티티는 테스트 먼저 (실패하는 테스트 → 구현 → 통과).
4. `npm test`(해당 범위)와 lint가 통과하는지 확인한다.
5. 커밋 메시지·PR 제목/본문 제안을 남긴다. 커밋·푸시·PR은 사용자가 한다.
6. 설계와 다르게 구현해야 할 일이 생기면 코드를 바꾸기 전에 사용자에게 먼저 묻는다. 결정되면 `docs/decisions.md` 또는 `docs/design.md`도 함께 고친다.

## 스킬 사용 시점
| 스킬 | 언제 | 왜 |
|---|---|---|
| `/ponytail:ponytail` | 항상 (자동) | 필요한 만큼만 짓도록. 과한 추상화·불필요한 파일을 만들지 않는다 |
| `/agent-skills:test-driven-development` | D2 정책·도메인 티켓 (ATT-24, 10, 23, 16, 12, 14) | 판정 규칙은 경계값이 많아 테스트 먼저가 안전하다 |
| `/agent-skills:incremental-implementation` | 여러 파일을 건드리는 D2 티켓 (ATT-12, 16, 14) | 테스트가 통과하는 작은 단위로 나눠 짓는다 (커밋 하나 = 통과 단위) |
| `/agent-skills:debugging-and-error-recovery` | 테스트·빌드가 깨질 때 | 원인을 찾고 나서 고친다 |
| `/agent-skills:security-and-hardening` | ATT-20 로그인, ATT-14 IP Guard, ATT-28 IP 관리 | 인증·IP 입력 검증·권한 분리 점검 |
| `/agent-skills:code-review-and-quality`, `/security-review` | 각 PR 올리기 직전 | 레이어 규칙 위반(domain이 Nest·Prisma import), `new Date()` 직접 사용 확인. ATT-7 PR 전에 `/code-review`와 비교해 바꿀 수 있음 |
| `/agent-skills:git-workflow-and-versioning` | 각 티켓 끝 | 커밋 메시지·PR 제목/본문 제안을 규칙 형식에 맞춘다 |
| `/impeccable:impeccable` | D3 프론트 시작 전(방향 잡기), D4 QA 때(화면 점검) | 화면이 템플릿처럼 보이지 않게 |
| `/agent-skills:frontend-ui-engineering` | D3 프론트 (ATT-4, 22, 3, 15, 26) | 컴포넌트·상태·접근성 구현 (Impeccable은 방향, 이건 구현) |
| `/graphify` | D3 백엔드가 끝난 뒤 한 번 | 코드 구조 그래프 → README 아키텍처 설명·면접 자료 |
| `/run` | ATT-8 시나리오 QA·새 환경 실행 점검 | 앱을 실제로 띄워 동작을 확인한다 |
| `/ponytail:ponytail-debt` | ATT-17 직전 | 코드의 `shortcut:` 주석을 모아 README "확장 방안" 소재로 쓴다 |
| `/agent-skills:documentation-and-adrs` | ATT-17 README·ADR | 설계 의도·고민 기록이 평가 기준이다 |

쓰지 않는 것: `/agent-skills:spec-driven-development`, `/agent-skills:planning-and-task-breakdown`, `/agent-skills:interview-me` — 스펙·설계·티켓 분해는 이미 끝났다. `/agent-skills:shipping-and-launch` — 운영 배포용이라 ATT-8의 `/run` 점검으로 대신한다.

## 변하지 않는 원칙
- Claude는 git commit·push를 하지 않는다.
- 업무 시각은 반드시 Clock에서 가져온다 (`new Date()` 금지). createdAt/updatedAt만 실제 시각.
- domain 계층은 Nest·Prisma를 import하지 않는다.
- 마감 우선: 필수(구분=필수) 티켓이 다 끝나기 전에는 선택 티켓에 손대지 않는다.
