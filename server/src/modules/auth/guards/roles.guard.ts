import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { User } from '@database/entities';
import { ROLES_KEY } from '../decorators/roles.decorator';

const ROLE_WEIGHTS: Record<User['role'], number> = {
  user: 1,
  author: 2,
  admin: 3,
  super_admin: 4,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Array<User['role']>>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: User }>();
    const currentUser = request.user;

    if (!currentUser) {
      throw new UnauthorizedException('未登录或登录已过期');
    }

    const currentUserWeight = ROLE_WEIGHTS[currentUser.role] ?? 0;
    const isAllowed = requiredRoles.some(role => currentUserWeight >= ROLE_WEIGHTS[role]);

    if (!isAllowed) {
      throw new ForbiddenException('无权访问后台资源');
    }

    return true;
  }
}
