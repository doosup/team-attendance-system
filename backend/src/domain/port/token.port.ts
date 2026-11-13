export abstract class TokenPort {
  abstract issue(userId: number): Promise<string>;
  // 서명이 틀리거나 만료됐으면 null.
  abstract verify(token: string): Promise<{ userId: number } | null>;
}
