// 통합 테스트: 실제 API → 가드 → 트랜잭션 → Prisma → 테스트용 SQLite (CLAUDE.md 핵심 흐름 4개)
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';
import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';

// 아래 환경변수는 앱을 조립하는 beforeAll(Prisma 연결·JWT 설정) 전에만 정해지면 된다

process.env.DATABASE_URL = 'file:./e2e.db';
process.env.JWT_SECRET = 'e2e-secret';
const BACKEND = join(__dirname, '..');

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
describe('핵심 흐름 (e2e)', () => {
  let app: NestExpressApplication;
  let http: App;
  let prisma: PrismaClient;
  const tokens: Record<string, string> = {};

  beforeAll(async () => {
    for (const f of ['e2e.db', 'e2e.db-journal']) {
      rmSync(join(BACKEND, 'prisma', f), { force: true });
    }
    // jest 안의 process.env 변경은 자식 프로세스에 자동으로 넘어가지 않아 env를 명시한다
    execSync('npx prisma migrate deploy', {
      cwd: BACKEND,
      env: { ...process.env, DATABASE_URL: 'file:./e2e.db' },
      stdio: 'ignore',
    });

    prisma = new PrismaClient();
    const passwordHash = await hash('password123', 4);
    const lead = await prisma.user.create({
      data: {
        loginId: 'lead',
        name: '이리드',
        role: 'LEAD',
        joinDate: '2025-12-01',
        passwordHash,
      },
    });
    await prisma.user.create({
      data: {
        loginId: 'kim',
        name: '김근태',
        role: 'MEMBER',
        joinDate: '2026-01-01',
        passwordHash,
      },
    });
    await prisma.allowedIp.create({
      data: { ip: '127.0.0.1', label: '연구실', createdById: lead.id },
    });

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
    http = app.getHttpServer();

    for (const id of ['lead', 'kim']) {
      const res = await request(http)
        .post('/auth/login')
        .send({ loginId: id, password: 'password123' });
      tokens[id] = res.body.data.accessToken as string;
    }
  });

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
  });

  const as = (who: string) => ({
    get: (path: string) =>
      request(http).get(path).set('authorization', `Bearer ${tokens[who]}`),
    post: (path: string, body?: object) =>
      request(http)
        .post(path)
        .set('authorization', `Bearer ${tokens[who]}`)
        .send(body ?? {}),
    delete: (path: string) =>
      request(http).delete(path).set('authorization', `Bearer ${tokens[who]}`),
  });
  const setClock = (date: string, time: string) =>
    request(http)
      .put('/dev/clock')
      .set('authorization', `Bearer ${tokens.lead}`)
      .send({ now: `${date}T${time}+09:00` })
      .expect(200);

  it('출근 → 퇴근: 10:00:01 출근은 지각, 18:00 퇴근은 점심 차감 후 8시간이라 조퇴 아님', async () => {
    await setClock('2026-11-09', '10:00:01'); // 월
    const inRes = await as('kim').post('/attendance/check-in').expect(201);
    expect(inRes.body.data.attendance).toMatchObject({
      isLate: true,
      dayType: 'FULL_DAY',
    });

    await setClock('2026-11-09', '19:00:01');
    const outRes = await as('kim').post('/attendance/check-out').expect(200);
    expect(outRes.body.data).toMatchObject({
      workedMinutes: 480,
      isEarlyLeave: false,
    });
  });

  it('미기록 퇴근: 다음 출근은 기록되지만 직접 입력 전 퇴근은 거부, 입력 후엔 퇴근 가능', async () => {
    await setClock('2026-11-10', '09:00:00'); // 화: 퇴근 안 찍음
    await as('kim').post('/attendance/check-in').expect(201);

    await setClock('2026-11-11', '09:00:00');
    const inRes = await as('kim').post('/attendance/check-in').expect(201);
    const [pending] = inRes.body.data.pendingManualCheckouts as {
      id: number;
    }[];
    expect(pending).toBeDefined();

    await setClock('2026-11-11', '18:00:00');
    const blocked = await as('kim').post('/attendance/check-out').expect(409);
    expect(blocked.body.error.code).toBe('PENDING_MANUAL_CHECKOUT');

    await as('kim')
      .post(`/attendance/${pending.id}/manual-check-out`, {
        checkOutAt: '2026-11-10T18:00:00+09:00',
      })
      .expect(200);
    await as('kim').post('/attendance/check-out').expect(200);
  });

  it('신청 → 승인 → 차감 → 본인 취소 → 복원', async () => {
    await setClock('2026-11-11', '10:00:00');
    const before = (await as('kim').get('/balances/me').expect(200)).body.data
      .annual.days as number;

    const created = await as('kim')
      .post('/requests', {
        type: 'ANNUAL',
        startDate: '2026-11-13',
        endDate: '2026-11-16',
      })
      .expect(201);
    const requestId = created.body.data.id as number;
    expect(created.body.data.status).toBe('PENDING');
    expect((await as('kim').get('/balances/me')).body.data.annual.days).toBe(
      before - 2,
    );

    await as('lead').post(`/lead/requests/${requestId}/approve`).expect(200);
    expect((await as('kim').get('/balances/me')).body.data.annual.days).toBe(
      before - 2,
    );

    await as('kim').post(`/requests/${requestId}/cancel`).expect(200);
    expect((await as('kim').get('/balances/me')).body.data.annual.days).toBe(
      before,
    );
  });

  it('신청서 PDF: { data }로 감싸지 않은 파일로 내려가고, 팀원은 남의 신청서를 받을 수 없다', async () => {
    await setClock('2026-11-11', '10:00:00');
    const created = await as('lead')
      .post('/requests', {
        type: 'ANNUAL',
        startDate: '2026-11-18',
        endDate: '2026-11-18',
      })
      .expect(201);
    const requestId = created.body.data.id as number;

    const pdf = await as('lead')
      .get(`/requests/${requestId}/pdf`)
      .responseType('blob')
      .expect(200);
    expect(pdf.headers['content-type']).toBe('application/pdf');
    expect((pdf.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');

    const denied = await as('kim')
      .get(`/requests/${requestId}/pdf`)
      .expect(404);
    expect(denied.body.error.code).toBe('REQUEST_NOT_FOUND');
  });

  it('팀원 등록 → 새 계정 로그인 → 퇴사 처리 → 로그인 거부, 그 달 정산에는 남는다', async () => {
    await setClock('2026-11-11', '10:00:00');
    const created = await as('lead')
      .post('/lead/users', {
        loginId: 'newbie',
        password: 'newbie-pass',
        name: '신입',
        joinDate: '2026-11-02',
      })
      .expect(201);
    const id = created.body.data.id as number;
    await request(http)
      .post('/auth/login')
      .send({ loginId: 'newbie', password: 'newbie-pass' })
      .expect(200);

    await as('lead').delete(`/lead/users/${id}`).expect(200);
    const denied = await request(http)
      .post('/auth/login')
      .send({ loginId: 'newbie', password: 'newbie-pass' })
      .expect(401);
    expect(denied.body.error.code).toBe('INVALID_CREDENTIALS');

    const nov = await as('lead').get('/lead/settlements?month=2026-11');
    expect(
      (
        nov.body.data.rows as { name: string; retiredDate: string | null }[]
      ).filter((r) => r.name === '신입'),
    ).toEqual([expect.objectContaining({ retiredDate: '2026-11-11' })]);
  });

  it('등록되지 않은 IP는 403 IP_NOT_ALLOWED (같은 컴퓨터 프록시가 넘긴 X-Forwarded-For 기준)', async () => {
    const res = await request(http)
      .get('/attendance/today')
      .set('authorization', `Bearer ${tokens.kim}`)
      .set('x-forwarded-for', '203.0.113.9')
      .expect(403);
    expect(res.body.error).toEqual({
      code: 'IP_NOT_ALLOWED',
      message: '등록된 IP가 아닙니다 (현재 IP: 203.0.113.9)',
    });
  });

  it('팀원이 리드 API를 부르면 403 FORBIDDEN_ROLE', async () => {
    const res = await as('kim').get('/lead/requests').expect(403);
    expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
  });
});
