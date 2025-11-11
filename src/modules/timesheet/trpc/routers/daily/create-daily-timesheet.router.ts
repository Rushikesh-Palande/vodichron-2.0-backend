/**
 * Create Daily Timesheet tRPC Router
 * ===================================
 * Type-safe tRPC procedure for creating daily timesheets
 * Provides end-to-end type safety from frontend to backend
 */

import { protectedProcedure } from '../../../../../trpc/trpc';
import { logger } from '../../../../../utils/logger';
import { createDailyTimesheetSchema } from '../../../schemas/daily/create.schemas';
import { createDailyTimesheet } from '../../../services/daily/create-daily-timesheet.service';
import { ApplicationUserRole } from '../../../types/timesheet.types';

/**
 * Create Daily Timesheet Procedure
 * =================================
 * tRPC mutation for creating a new daily timesheet
 * 
 * Features:
 * - Protected route (requires authentication)
 * - Zod schema validation
 * - Type-safe input/output
 * - Comprehensive logging
 * - Error handling
 * 
 * Access Control:
 * - Employees can only create their own timesheets
 * - Admin/HR/Super users can create timesheets for any employee
 * 
 * @input CreateDailyTimesheetInput - Validated timesheet data
 * @output { timesheetUuid: string } - UUID of created timesheet
 * @throws TRPCError FORBIDDEN if user lacks permission
 * @throws TRPCError BAD_REQUEST if validation fails or duplicate exists
 * @throws TRPCError INTERNAL_SERVER_ERROR for unexpected errors
 */
export const createDailyTimesheetProcedure = protectedProcedure
  .input(createDailyTimesheetSchema)
  .mutation(async ({ input, ctx }) => {
    logger.info('📥 Create daily timesheet request received (tRPC)', {
      userId: ctx.user.uuid,
      userRole: ctx.user.role,
      employeeId: input.employeeId,
      timesheetDate: input.timesheetDate,
      operation: 'createDailyTimesheet_trpc'
    });

    // Extract user context from tRPC context
    const userContext = {
      uuid: ctx.user.uuid,
      role: ctx.user.role as ApplicationUserRole,
      email: ctx.user.email || ''
    };

    // Call service layer
    const result = await createDailyTimesheet(input, userContext);

    logger.info('✅ Daily timesheet created successfully (tRPC)', {
      timesheetUuid: result.timesheetUuid,
      employeeId: input.employeeId,
      userId: ctx.user.uuid
    });

    return result;
  });
