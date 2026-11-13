import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenPort } from '../../domain/port/token.port';

@Injectable()
export class JwtTokenService extends TokenPort {
  constructor(private readonly jwt: JwtService) {
    super();
  }

  issue(userId: number): Promise<string> {
    return this.jwt.signAsync({ sub: userId });
  }

  async verify(token: string): Promise<{ userId: number } | null> {
    try {
      const { sub } = await this.jwt.verifyAsync<{ sub: number }>(token);
      return { userId: sub };
    } catch {
      return null;
    }
  }
}
