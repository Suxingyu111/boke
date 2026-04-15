import {
  UnauthorizedException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { User } from '@database/entities';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User => {
    const request = context.switchToHttp().getRequest<{ user: User }>();

    if (!request.user) {
      throw new UnauthorizedException('未登录或登录已过期');
    }

    return request.user;
  },
);