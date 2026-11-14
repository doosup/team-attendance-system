import { User as UserModel } from '@prisma/client';
import { User } from '../../../domain/entity/user.entity';

export const UserMapper = {
  toEntity(m: UserModel): User {
    return new User(
      m.id,
      m.loginId,
      m.passwordHash,
      m.name,
      m.role,
      m.joinDate,
      m.deletedAt,
    );
  },
};
