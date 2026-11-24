// npm run setup 첫 단계: 설정 메모(.env) 두 개에 빠진 키만 채운다 (이미 있는 값은 건드리지 않음).
// - backend/.env : 맥에서 직접 실행(npm run dev)용. JWT_SECRET 무작위, DATABASE_URL은 로컬 Docker Postgres
// - .env (루트)  : Docker로 한 번에 실행(docker compose up)용. 내 맥 시험값.
//                  서버(EC2)에서는 이 파일을 Secrets Manager 값으로 직접 만든다 (ATT-57)
const { existsSync, readFileSync, writeFileSync } = require('node:fs');
const { randomBytes } = require('node:crypto');
const { join } = require('node:path');

const secret = () => randomBytes(32).toString('hex');

function ensure(envFile, defaults) {
  // SQLite 시절(submission 태그)의 file: 주소는 더 이상 쓸 수 없어 지우고 새로 채운다
  const current = (
    existsSync(envFile) ? readFileSync(envFile, 'utf8') : ''
  ).replace(/^DATABASE_URL="?file:.*\n?/m, '');
  const missing = Object.keys(defaults).filter(
    (k) => !new RegExp(`^${k}=`, 'm').test(current),
  );
  if (missing.length === 0) {
    console.log(`${envFile} 있음 - 그대로 사용`);
    return;
  }
  const add = missing.map((k) => `${k}=${defaults[k]()}`).join('\n') + '\n';
  const sep = current && !current.endsWith('\n') ? '\n' : '';
  writeFileSync(envFile, current + sep + add, { mode: 0o600 });
  console.log(`${envFile}에 추가: ${missing.join(', ')}`);
}

const backend = join(__dirname, '..');
ensure(join(backend, '.env'), {
  JWT_SECRET: secret,
  DATABASE_URL: () =>
    '"postgresql://attendance:attendance@localhost:5432/attendance"',
});
ensure(join(backend, '..', '.env'), {
  JWT_SECRET: secret,
  // 맥에서 Docker로 접속하면 서버는 내부망 관문 주소로 본다 (docker-compose.yml의 networks)
  LAB_IP: () => '172.30.0.1',
  SEED_PASSWORD: () => 'password123',
});
