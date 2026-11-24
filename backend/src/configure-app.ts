import { NestExpressApplication } from '@nestjs/platform-express';

// main.ts와 e2e 테스트가 같은 설정으로 앱을 띄우게 한 곳에 둔다
export function configureApp(app: NestExpressApplication): void {
  // 믿을 프록시가 넘긴 X-Forwarded-For만 실제 접속 IP로 쓴다. 기본은 같은 컴퓨터(Vite dev server).
  // 외부에서 직접 붙어 헤더를 위조해도 믿는 프록시가 아니라 무시된다 (IP 검사 우회 방지).
  // Docker에서는 nginx가 같은 내부망에 있어 TRUST_PROXY=uniquelocal (docker-compose.yml)
  app.set('trust proxy', process.env.TRUST_PROXY ?? 'loopback');
}
