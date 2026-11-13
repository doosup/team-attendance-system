import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { AppModule } from './app.module';

// backend/.env (JWT_SECRET). npm run setup이 만든다.
const envFile = join(__dirname, '..', '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // 같은 컴퓨터의 프록시(Vite dev server)가 넘긴 X-Forwarded-For만 믿는다.
  // 외부에서 직접 붙어 헤더를 위조해도 loopback이 아니라 무시된다 (IP 검사 우회 방지)
  app.set('trust proxy', 'loopback');
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
