// npm run setup 첫 단계: backend/.env에 빠진 키만 채운다 (이미 있는 값은 건드리지 않음).
// - JWT_SECRET: 무작위 (저장소에 비밀키를 두지 않음)
// - DATABASE_URL: 로컬 Docker Postgres (docker-compose.yml의 db 서비스)
const { existsSync, readFileSync, writeFileSync } = require('node:fs');
const { randomBytes } = require('node:crypto');
const { join } = require('node:path');

const envFile = join(__dirname, '..', '.env');
// SQLite 시절(submission 태그)의 file: 주소는 더 이상 쓸 수 없어 지우고 새로 채운다
const current = (existsSync(envFile) ? readFileSync(envFile, 'utf8') : '')
  .replace(/^DATABASE_URL="?file:.*\n?/m, '');
const defaults = {
  JWT_SECRET: () => randomBytes(32).toString('hex'),
  DATABASE_URL: () =>
    '"postgresql://attendance:attendance@localhost:5432/attendance"',
};
const missing = Object.keys(defaults).filter(
  (k) => !new RegExp(`^${k}=`, 'm').test(current),
);
if (missing.length === 0) {
  console.log('.env 있음 - 그대로 사용');
} else {
  const add = missing.map((k) => `${k}=${defaults[k]()}`).join('\n') + '\n';
  const sep = current && !current.endsWith('\n') ? '\n' : '';
  writeFileSync(envFile, current + sep + add, { mode: 0o600 });
  console.log(`.env에 추가: ${missing.join(', ')}`);
}
