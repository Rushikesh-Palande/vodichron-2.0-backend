import { router } from './trpc';
import { authRouter } from '../modules/auth/trpc';
import { employeeRouter } from '../modules/employee/trpc';
import { userRouter } from '../modules/users/trpc';
import { masterDataRouter } from '../modules/master-data/trpc';

/**
| * App Router (tRPC)
| * =================
| * Aggregates module routers. Extend here as modules grow.
| */
export const appRouter = router({
  auth: authRouter,
  employee: employeeRouter,
  user: userRouter,
  masterData: masterDataRouter,
});

export type AppRouter = typeof appRouter;
