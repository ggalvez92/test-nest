import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@prisma/client';

/**
 * GetUser decorator - Extracts the authenticated user from the request
 * Usage: @GetUser() user: User
 *
 * The user is attached to the request by JWT strategy validation
 */
export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
