import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * GetJti decorator - Extracts the JTI (session ID) from the authenticated user's token
 * Usage: @GetJti() jti: string
 *
 * The JTI is attached to the request by JWT strategy validation
 * Use this to get the current session ID for logout operations
 */
export const GetJti = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.jti;
  },
);
