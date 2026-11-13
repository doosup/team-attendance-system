import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';

// 로그인 없이 부를 수 있는 경로 (POST /auth/login만).
export const Public = () => SetMetadata(IS_PUBLIC, true);
