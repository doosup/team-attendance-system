import { IsISO8601, IsString, Matches } from 'class-validator';

// 순간(시각) 입력: 오프셋(Z 또는 ±hh:mm)이 있는 ISO 8601만 받는다 (시간대 추측 금지).
export function IsInstant(): PropertyDecorator {
  return (target, key) => {
    IsString()(target, key);
    IsISO8601({ strict: true, strictSeparator: true })(target, key);
    Matches(/(Z|[+-]\d{2}:\d{2})$/, {
      message: `${String(key)}에는 오프셋(Z 또는 ±hh:mm)이 있어야 합니다`,
    })(target, key);
  };
}
