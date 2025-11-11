/**
 * Update Daily Timesheet tRPC Router
 * ===================================
 * Type-safe tRPC procedure for updating daily timesheets
 */

import { protectedProcedure } from '../../../../../trpc/trpc';
import { logger } from '../../../../../utils/logger';
import { updateDailyTimesheet } from '../../../services/daily/update-daily-timesheet.service';
import { ApplicationUserRole } from '../../../types/timesheet.types';
import { updateDailyTimesheetSchema } from '../../../schemas/daily/update.schemas';

/**
 * Update Daily Timesheet Procedure
 * =================================
 * tRPC mutation for updating daily timesheet task details
 * 
 * Features:
 * - Protected route (requires authentication)
 * - Zod schema validation
 * - Same-day validation (employees can only update today's timesheets)
 * - Authorization checks (employees can only update their own)
 * - Status validation (can't update approved timesheets)
 * - Comprehensive logging
 * 
 * Access Control:
 * - Employees can only update their own timesheets on the same day
 * - Admin/HR/Super users can update any timesheet
 * 
 * @input {timesheetUuid, task fields}
 * @output { success: boolean }
 * @throws TRPCError FORBIDDEN if user lacks permission
 * @throws TRPCError BAD_REQUEST if trying to update old/approved timesheet
 * @throws TRPCError NOT_FOUND if timesheet doesn't exist
 * @throws TRPCError INTERNAL_SERVER_ERROR for unexpected errors
 */
export const updateDailyTimesheetProcedure = protectedProcedure
  .input(updateDailyTimesheetSchema)
  .mutation(async ({ input, ctx }) => {
    logger.info('📥 Update daily timesheet request received (tRPC)', {
      userId: ctx.user.uuid,
      userRole: ctx.user.role,
      timesheetUuid: input.timesheetUuid,
      operation: 'updateDailyTimesheet_trpc'
    });

    // Extract user context from tRPC context
    const userContext = {
      uuid: ctx.user.uuid,
      role: ctx.user.role as ApplicationUserRole,
      email: ctx.user.email || '',
    };

    // Call service layer
    const result = await updateDailyTimesheet(input, userContext);

    logger.info('✅ Daily timesheet updated successfully (tRPC)', {
      timesheetUuid: input.timesheetUuid,
      userId: ctx.user.uuid
    });

    return result;
  });
