import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsISO8601,
  IsOptional,
  Matches,
  Min,
} from 'class-validator';
import { AuditLogView } from '../../../../domain/entity/audit-log.entity';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// GET /lead/audit-logs?userId=&from=&to=&includeLogin= (from·to는 KST 날짜, 끝 날짜 포함)
export class GetAuditLogsQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;

  @IsOptional()
  @Matches(DATE)
  @IsISO8601({ strict: true })
  from?: string;

  @IsOptional()
  @Matches(DATE)
  @IsISO8601({ strict: true })
  to?: string;

  // 로그인 성공은 기록은 하되 기본 화면에서는 뺀다: 주요 이력이 묻히지 않게 (ATT-38)
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  includeLogin?: boolean;
}

export class AuditLogResult {
  constructor(
    readonly id: number,
    readonly actor: { id: number; name: string | null } | null,
    readonly action: string,
    readonly targetType: string | null,
    readonly targetId: number | null,
    readonly payload: Record<string, unknown>,
    readonly ip: string,
    readonly occurredAt: string,
    readonly createdAt: string,
  ) {}

  static from(v: AuditLogView): AuditLogResult {
    return new AuditLogResult(
      v.id,
      v.actorId === null ? null : { id: v.actorId, name: v.actorName },
      v.action,
      v.targetType,
      v.targetId,
      v.payload,
      v.ip,
      v.occurredAt.toISOString(),
      v.createdAt.toISOString(),
    );
  }
}
