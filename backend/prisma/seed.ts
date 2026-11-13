// 시드: 리드 1명 + 팀원 3명, 연구실 IP. 다시 실행해도 같은 결과(upsert).
// 연차 원장은 넣지 않는다: 적립은 조회 시 Clock 기준으로 동기화된다 (design.md LeaveLedger).
import { PrismaClient, Role } from '@prisma/client';
import { hash } from 'bcrypt';

const PASSWORD = 'password123';
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
const LAB_IP = '127.0.0.1';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hash(PASSWORD, 10);
  for (const u of USERS) {
    await prisma.user.upsert({
      where: { loginId: u.loginId },
      update: {},
      create: { ...u, passwordHash },
    });
  }

  const lead = await prisma.user.findUniqueOrThrow({
    where: { loginId: 'lead' },
  });
  const labIp = await prisma.allowedIp.findFirst({
    where: { ip: LAB_IP, deletedAt: null },
  });
  if (!labIp) {
    await prisma.allowedIp.create({
      data: { ip: LAB_IP, label: '연구실', createdById: lead.id },
    });
  }

  console.log(
    `시드 완료: 사용자 ${USERS.length}명 (비밀번호 ${PASSWORD}), 연구실 IP ${LAB_IP}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
