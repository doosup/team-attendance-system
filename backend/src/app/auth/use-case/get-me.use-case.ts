import { Injectable } from '@nestjs/common';
import { User } from '../../../domain/entity/user.entity';
import { UseCase } from '../../use-case.interface';
import { UserResult } from '../dto/get-me.dto';

// 사용자는 JwtAuthGuard가 이미 DB에서 다시 읽어 붙였다.
@Injectable()
export class GetMeUseCase implements UseCase<User, UserResult> {
  execute(user: User): UserResult {
    return UserResult.from(user);
  }
}
