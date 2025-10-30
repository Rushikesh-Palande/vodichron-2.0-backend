import { router } from './trpc';
import { authRouter } from '../modules/auth/trpc';
import { employeeRouter } from '../modules/employee/trpc';
import { userRouter } from '../modules/users/trpc';

/**
| * App Router (tRPC)
| * =================
| * Aggregates module routers. Extend here as modules grow.
| */
export const appRouter = router({
  auth: authRouter,
  employee: employeeRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
