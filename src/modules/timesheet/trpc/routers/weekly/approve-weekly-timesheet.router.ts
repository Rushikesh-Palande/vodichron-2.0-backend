/**
 * Approve Weekly Timesheet tRPC Router
 * =====================================
 * Type-safe tRPC procedure for approving/rejecting weekly timesheets
 */

import { protectedProcedure } from '../../../../../trpc/trpc';
import { logger } from '../../../../../utils/logger';
import { 
  approveWeeklyTimesheet,
  ApprovalStatus 
} from '../../../services/weekly/approve-weekly-timesheet.service';
import { ApplicationUserRole } from '../../../types/timesheet.types';
import { approveWeeklyTimesheetSchema } from '../../../schemas/weekly/list.schemas';

/**
 * Approve Weekly Timesheet Procedure
 * ===================================
 * tRPC mutation for approving or rejecting weekly timesheets
 * 
 * Access Control:
 * - Admin/HR/Super users can approve any timesheet
 * - Managers/Directors can approve reportee timesheets
 * - Customers can approve allocated employee timesheets
 * - Employees cannot approve timesheets
 */
export const approveWeeklyTimesheetProcedure = protectedProcedure
  .input(approveWeeklyTimesheetSchema)
  .mutation(async ({ input, ctx }) => {
    logger.info('📥 Approve weekly timesheet request received (tRPC)', {
      userId: ctx.user.uuid,
      userRole: ctx.user.role,
      timesheetId: input.timesheetId,
      approvalStatus: input.approvalStatus,
      operation: 'approveWeeklyTimesheet_trpc'
    });

    const userContext = {
      uuid: ctx.user.uuid,
      role: ctx.user.role as ApplicationUserRole,
      email: ctx.user.email || '',
      name: ctx.user.email // Use email as fallback for name
    };

    const result = await approveWeeklyTimesheet(
      {
        timesheetId: input.timesheetId,
        approvalStatus: input.approvalStatus as ApprovalStatus,
        comment: input.comment
      },
      input.employeeDetails,
      userContext
    );

    logger.info('✅ Weekly timesheet approval updated successfully (tRPC)', {
      timesheetId: input.timesheetId,
      approvalStatus: input.approvalStatus,
      userId: ctx.user.uuid
    });

    return result;
  });
