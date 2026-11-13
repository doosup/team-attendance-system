import { SetMetadata } from '@nestjs/common';
import { Role } from '../../domain/entity/user.entity';

export const ROLES = 'roles';

export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);
