import { SetMetadata } from '@nestjs/common';
import { User } from '@database/entities';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: Array<User['role']>) => SetMetadata(ROLES_KEY, roles);
