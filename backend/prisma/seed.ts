// 시드: 리드 1명 + 팀원 3명, 연구실 IP. 서버를 켤 때마다 실행되어도 이미 있는 것은 건드리지 않는다.
// 연차 원장은 넣지 않는다: 적립은 조회 시 Clock 기준으로 동기화된다 (design.md LeaveLedger).
import { PrismaClient, Role } from '@prisma/client';
import { hash } from 'bcrypt';
import { isValidIp } from '../src/common/utils/ip.util';

const USERS = [
  { loginId: 'lead', name: '이리드', role: Role.LEAD, joinDate: '2025-12-01' },
  { loginId: 'kim', name: '김근태', role: Role.MEMBER, joinDate: '2026-01-01' },
  {
    loginId: 'yeon',
    name: '연차원',
    role: Role.MEMBER,
    joinDate: '2026-01-15',
  },
  { loginId: 'lim', name: '임자율', role: Role.MEMBER, joinDate: '2026-02-12' },
];

// 서버(운영 모드)는 시험용 값으로 조용히 켜지지 않게 .env에 값이 없으면 멈춘다
const isProd = process.env.NODE_ENV === 'production';
function setting(name: string, devDefault: string): string {
  const value = process.env[name];
  if (value) return value;
  if (isProd) throw new Error(`${name}가 필요합니다 (.env에 적어 주세요)`);
  return devDefault;
}

// 첫 비밀번호: 직원에게 알려 주고 각자 변경한다. 서버에서는 공개되지 않은 값
const PASSWORD = setting('SEED_PASSWORD', 'password123');
// 서버가 본 연구실 접속 IP(쉼표로 여러 개). 맥에서 직접 실행(127.0.0.1)과 Docker 실행(172.30.0.1)이
// 같은 DB를 쓰므로 개발 기본값은 둘 다. 서버는 실제 연구실 공인 IP
const LAB_IPS = setting('LAB_IP', '127.0.0.1,172.30.0.1')
  .split(',')
  .map((ip) => ip.trim());
const invalid = LAB_IPS.filter((ip) => !isValidIp(ip));
if (invalid.length > 0) {
  throw new Error(`LAB_IP 형식이 잘못되었습니다: ${invalid.join(', ')}`);
}

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hash(PASSWORD, 12);
  for (const u of USERS) {
    // 이미 있으면 그대로 둔다: 직원이 바꾼 비밀번호를 되돌리지 않음
    await prisma.user.upsert({
      where: { loginId: u.loginId },
      update: {},
      create: { ...u, passwordHash },
    });
  }

  // 연구실 IP는 처음 세울 때(허용 목록이 비었을 때)만 넣는다.
  // 그 뒤로는 리드가 화면에서 바꾼 목록이 기준이라, 재시작해도 지운 IP가 되살아나지 않는다
  const lead = await prisma.user.findUniqueOrThrow({
    where: { loginId: 'lead' },
  });
  const active = await prisma.allowedIp.count({ where: { deletedAt: null } });
  if (active === 0) {
    await prisma.allowedIp.createMany({
      data: LAB_IPS.map((ip) => ({
        ip,
        label: '연구실',
        createdById: lead.id,
      })),
    });
  }

  console.log(
    `시드 완료: 사용자 ${USERS.length}명` +
      (isProd ? '' : ` (비밀번호 ${PASSWORD})`) +
      (active === 0
        ? `, 연구실 IP ${LAB_IPS.join(', ')}`
        : ', 연구실 IP는 기존 목록 유지'),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
