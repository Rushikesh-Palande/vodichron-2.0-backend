import { initTRPC, inferAsyncReturnType, TRPCError } from '@trpc/server';
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import superjson from 'superjson';
import { logger } from '../utils/logger';
import { extractTokenFromAuthHeader } from '../modules/auth/helpers/extract-token-from-header';
import { verifyToken } from '../modules/auth/helpers/verify-token';
import type { JwtUserPayload } from '../modules/auth/helpers/generate-token';

/**
 * tRPC Context
 * ------------
 * Provides request/response access and logging for procedures.
 */
export function createContext({ req, res }: CreateExpressContextOptions) {
  return { req, res, logger, user: null as JwtUserPayload | null };
}
export type Context = inferAsyncReturnType<typeof createContext>;

/**
 * tRPC Initialization
 * -------------------
 * Configures transformer and base procedure/router.
 */
const t = initTRPC.context<Context>().create({ transformer: superjson });

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Auth middleware and protected procedure
 */
const isAuthed = t.middleware(({ ctx, next }) => {
  const authHeader = ctx.req.headers?.authorization as string | undefined;
  const token = extractTokenFromAuthHeader(authHeader);
  const user = token ? verifyToken(token) : null;
  if (!user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { ...ctx, user } });
});

export const protectedProcedure = t.procedure.use(isAuthed);
