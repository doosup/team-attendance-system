import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { DevModule } from './app/dev/dev.module';
import { DomainExceptionFilter } from './common/filters/domain-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { validationPipe } from './common/pipes/validation.pipe';
import { ClockModule } from './infrastructure/clock/clock.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';

const isDev = process.env.NODE_ENV !== 'production';

@Module({
  imports: [PrismaModule, ClockModule, ...(isDev ? [DevModule] : [])],
  providers: [
    { provide: APP_PIPE, useValue: validationPipe },
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class AppModule {}
