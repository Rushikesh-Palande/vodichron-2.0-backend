import { router } from './trpc';
import { authRouter } from '../modules/auth/trpc/auth.router';
import { employeeRouter } from '../modules/employee/trpc/employee.router';

/**
| * App Router (tRPC)
| * =================
| * Aggregates module routers. Extend here as modules grow.
| */
export const appRouter = router({
  auth: authRouter,
  employee: employeeRouter,
});

export type AppRouter = typeof appRouter;
