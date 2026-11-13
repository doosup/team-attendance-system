import { CustomException } from '../../../domain/exception/custom.exception';
import { kstAt } from '../../../domain/value/work-date';
import { FixedClock } from '../../../../test/fakes/fixed-clock';
import { InMemoryAttendanceRepository } from '../../../../test/fakes/in-memory-attendance.repository';
import { InMemoryLedgerRepository } from '../../../../test/fakes/in-memory-ledger.repository';
import { InMemoryRequestDayRepository } from '../../../../test/fakes/in-memory-request-day.repository';
import { KIM, LEAD } from '../../../../test/fakes/users';
import { CheckInUseCase } from './check-in.use-case';
import { CheckOutUseCase } from './check-out.use-case';
import { ManualCheckOutUseCase } from './manual-check-out.use-case';

describe('ManualCheckOutUseCase', () => {
  let clock: FixedClock;
  let attendances: InMemoryAttendanceRepository;
  let checkIn: CheckInUseCase;
  let manual: ManualCheckOutUseCase;
  let ledger: InMemoryLedgerRepository;

  // 목요일 09:00 출근 후 퇴근 안 찍음 → 금요일 09:00 출근
  beforeEach(async () => {
    clock = new FixedClock('2026-11-12', '09:00:00');
    attendances = new InMemoryAttendanceRepository();
    checkIn = new CheckInUseCase(
      clock,
      attendances,
      new InMemoryRequestDayRepository(),
    );
    ledger = new InMemoryLedgerRepository();
    manual = new ManualCheckOutUseCase(clock, attendances, ledger);
    await checkIn.execute({ user: KIM, ip: '127.0.0.1' });
    clock.at('2026-11-13', '09:00:00');
    await checkIn.execute({ user: KIM, ip: '127.0.0.1' });
  });

  const input = (time: string, date = '2026-11-12', id = 1, user = KIM) => ({
    user,
    attendanceId: id,
    checkOutAt: kstAt(date, time),
    ip: '127.0.0.1',
  });
  const codeOf = (p: Promise<unknown>) =>
    p.then(
      () => 'OK',
      (e: CustomException) => e.code,
    );

  it("입력한 시각으로 퇴근을 기록하고 '직접 입력'으로 표시한다", async () => {
    const result = await manual.execute(input('18:00:00'));
    expect(result).toMatchObject({
      workDate: '2026-11-12',
      checkOutAt: kstAt('2026-11-12', '18:00:00').toISOString(),
      checkOutSource: 'MANUAL',
      workedMinutes: 480,
      isEarlyLeave: false,
    });
  });

  it('16:00 제한은 없지만 조퇴 판정은 그대로 한다 (15:00 입력 → 조퇴)', async () => {
    const result = await manual.execute(input('15:00:00'));
    expect(result).toMatchObject({ workedMinutes: 300, isEarlyLeave: true });
  });

  it('그날 23:59:59까지는 입력할 수 있다', async () => {
    expect(await codeOf(manual.execute(input('23:59:59')))).toBe('OK');
  });

  it('다음 날 00:00:00은 범위 밖이다 (MANUAL_CHECKOUT_OUT_OF_RANGE)', async () => {
    expect(await codeOf(manual.execute(input('00:00:00', '2026-11-13')))).toBe(
      'MANUAL_CHECKOUT_OUT_OF_RANGE',
    );
  });

  it('출근 시각보다 이르면 범위 밖이다', async () => {
    expect(await codeOf(manual.execute(input('08:59:59')))).toBe(
      'MANUAL_CHECKOUT_OUT_OF_RANGE',
    );
  });

  it('출근 시각과 같으면 범위 밖이다 (출근 시각 이후만)', async () => {
    expect(await codeOf(manual.execute(input('09:00:00')))).toBe(
      'MANUAL_CHECKOUT_OUT_OF_RANGE',
    );
  });

  it('입력하고 나면 퇴근 버튼이 다시 동작한다', async () => {
    await manual.execute(input('18:00:00'));
    clock.at('2026-11-13', '18:00:00');
    const out = await new CheckOutUseCase(clock, attendances, ledger).execute({
      user: KIM,
      ip: '127.0.0.1',
    });
    expect(out.checkOutSource).toBe('BUTTON');
  });

  it('두 번 입력할 수 없다 (MANUAL_CHECKOUT_NOT_PENDING)', async () => {
    await manual.execute(input('18:00:00'));
    expect(await codeOf(manual.execute(input('19:00:00')))).toBe(
      'MANUAL_CHECKOUT_NOT_PENDING',
    );
  });

  it('오늘 기록은 직접 입력 대상이 아니다 (버튼을 쓴다)', async () => {
    expect(
      await codeOf(manual.execute(input('18:00:00', '2026-11-13', 2))),
    ).toBe('MANUAL_CHECKOUT_NOT_PENDING');
  });

  it('다른 사람의 기록은 대상이 아니다 (존재 여부도 드러내지 않음)', async () => {
    expect(
      await codeOf(manual.execute(input('18:00:00', '2026-11-12', 1, LEAD))),
    ).toBe('MANUAL_CHECKOUT_NOT_PENDING');
  });
});
