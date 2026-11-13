// npm run setup 첫 단계: backend/.env가 없으면 무작위 JWT_SECRET으로 만든다. 이미 있으면 건드리지 않는다.
const { existsSync, writeFileSync } = require('node:fs');
const { randomBytes } = require('node:crypto');
const { join } = require('node:path');

const envFile = join(__dirname, '..', '.env');
if (existsSync(envFile)) {
  console.log('.env 있음 - 그대로 사용');
} else {
  writeFileSync(envFile, `JWT_SECRET=${randomBytes(32).toString('hex')}\n`, {
    mode: 0o600,
  });
  console.log('.env 생성 (JWT_SECRET 무작위)');
}
