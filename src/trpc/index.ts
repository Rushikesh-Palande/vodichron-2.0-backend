import { router } from './trpc';
import { authRouter } from '../modules/auth/trpc';
import { employeeRouter } from '../modules/employee/trpc';
import { employeeLeavesRouter } from '../modules/employee-leaves/trpc';
import { userRouter } from '../modules/users/trpc';
import { masterDataRouter } from '../modules/master-data/trpc';
import { timesheetRouter } from '../modules/timesheet/trpc';

/**
 * App Router (tRPC)
 * =================
 * Aggregates module routers. Extend here as modules grow.
 */
export const appRouter = router({
  auth: authRouter,
  employee: employeeRouter,
  employeeLeaves: employeeLeavesRouter,
  user: userRouter,
  masterData: masterDataRouter,
  timesheet: timesheetRouter,
});

export type AppRouter = typeof appRouter;
