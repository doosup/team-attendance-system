import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { AttendanceModule } from './app/attendance/attendance.module';
import { AuthModule } from './app/auth/auth.module';
import { BalanceModule } from './app/balance/balance.module';
import { LeadModule } from './app/lead/lead.module';
import { DevModule } from './app/dev/dev.module';
import { DomainExceptionFilter } from './common/filters/domain-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { validationPipe } from './common/pipes/validation.pipe';
import { ClockModule } from './infrastructure/clock/clock.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { PrismaService } from './infrastructure/prisma/prisma.service';
import { RepositoryModule } from './infrastructure/prisma/repository.module';
import { TokenModule } from './infrastructure/token/token.module';

const isDev = process.env.NODE_ENV !== 'production';

@Module({
  imports: [
    PrismaModule,
    // use-case의 @Transactional(): 한 요청의 여러 저장소가 같은 Prisma 트랜잭션을 쓴다
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
      plugins: [
        new ClsPluginTransactional({
          imports: [PrismaModule],
          adapter: new TransactionalAdapterPrisma({
            prismaInjectionToken: PrismaService,
          }),
        }),
      ],
    }),
    RepositoryModule,
    ClockModule,
    TokenModule,
    AuthModule,
    AttendanceModule,
    BalanceModule,
    LeadModule,
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
