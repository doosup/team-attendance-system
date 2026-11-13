import { NestExpressApplication } from '@nestjs/platform-express';

// main.ts와 e2e 테스트가 같은 설정으로 앱을 띄우게 한 곳에 둔다
export function configureApp(app: NestExpressApplication): void {
  // 같은 컴퓨터의 프록시(Vite dev server)가 넘긴 X-Forwarded-For만 믿는다.
  // 외부에서 직접 붙어 헤더를 위조해도 loopback이 아니라 무시된다 (IP 검사 우회 방지)
  app.set('trust proxy', 'loopback');
}
