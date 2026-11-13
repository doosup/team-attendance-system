import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { AuthModule } from './app/auth/auth.module';
import { DevModule } from './app/dev/dev.module';
import { DomainExceptionFilter } from './common/filters/domain-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { validationPipe } from './common/pipes/validation.pipe';
import { ClockModule } from './infrastructure/clock/clock.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { RepositoryModule } from './infrastructure/prisma/repository.module';
import { TokenModule } from './infrastructure/token/token.module';

const isDev = process.env.NODE_ENV !== 'production';

@Module({
  imports: [
    PrismaModule,
    RepositoryModule,
    ClockModule,
    TokenModule,
    AuthModule,
    ...(isDev ? [DevModule] : []),
  ],
  providers: [
    { provide: APP_PIPE, useValue: validationPipe },
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    // 등록 순서대로 실행: 로그인 확인 → 역할 확인. (IpGuard는 ATT-14에서 맨 앞에)
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
