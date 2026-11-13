import { Global, Module } from '@nestjs/common';
import { Clock, ClockControl } from '../../domain/port/clock.port';
import { OverridableClock } from './overridable.clock';
import { SystemClock } from './system.clock';

@Global()
@Module({
  providers: [
    {
      provide: OverridableClock,
      useValue: new OverridableClock(new SystemClock()),
    },
    { provide: Clock, useExisting: OverridableClock },
    { provide: ClockControl, useExisting: OverridableClock },
  ],
  exports: [Clock, ClockControl],
})
export class ClockModule {}
