import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PasswordHasher } from '../../domain/port/password-hasher.port';
import { TokenPort } from '../../domain/port/token.port';
import { BcryptPasswordHasher } from '../password/bcrypt-password-hasher';
import { JwtTokenService } from './jwt-token.service';

// 인증 기반: 토큰 발급·검증(JWT)과 비밀번호 검증(bcrypt).
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          throw new Error(
            'JWT_SECRET이 없습니다. backend에서 npm run setup을 실행하세요 (.env 생성).',
          );
        }
        return {
          secret,
          signOptions: { expiresIn: '12h', algorithm: 'HS256' },
          verifyOptions: { algorithms: ['HS256'] },
        };
      },
    }),
  ],
  providers: [
    { provide: TokenPort, useClass: JwtTokenService },
    { provide: PasswordHasher, useClass: BcryptPasswordHasher },
  ],
  exports: [TokenPort, PasswordHasher],
})
export class TokenModule {}
