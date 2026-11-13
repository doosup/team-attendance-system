// 잔여는 반일 단위로 계산하고 일 단위로 보여 준다 (1일 = 2).
export class BalanceResult {
  constructor(
    readonly annual: { days: number },
    readonly halfOff: {
      count: number;
      grants: { expiresOn: string; remaining: number }[];
    },
    readonly remote: {
      month: string;
      used: number;
      limit: number;
      exceptions: number;
    },
  ) {}
}
