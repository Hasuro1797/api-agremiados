import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * ThrottlerGuard que entiende tanto el contexto GraphQL (donde `req`/`res` viven
 * en el context de Apollo) como el HTTP normal (controllers REST, ej. el IPN de
 * Izipay). Sin esto, el rate limiting no encuentra el request en resolvers.
 */
@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  getRequestResponse(context: ExecutionContext): {
    req: Record<string, unknown>;
    res: Record<string, unknown>;
  } {
    const gqlCtx = GqlExecutionContext.create(context);
    const ctx = gqlCtx.getContext<{
      req?: Record<string, unknown>;
      res?: Record<string, unknown>;
    }>();
    if (ctx?.req) {
      return { req: ctx.req, res: ctx.res ?? {} };
    }
    const http = context.switchToHttp();
    return {
      req: http.getRequest<Record<string, unknown>>(),
      res: http.getResponse<Record<string, unknown>>(),
    };
  }
}
