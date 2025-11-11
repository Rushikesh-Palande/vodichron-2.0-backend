/**
 * Update Daily Timesheet Approval tRPC Router
 * ============================================
 * Type-safe tRPC procedure for approving/rejecting daily timesheets
 */

import { protectedProcedure } from '../../../../../trpc/trpc';
import { logger } from '../../../../../utils/logger';
import { 
  updateDailyTimesheetApproval,
  ApprovalStatus 
} from '../../../services/daily/update-daily-timesheet-approval.service';
import { ApplicationUserRole } from '../../../types/timesheet.types';
import { updateDailyTimesheetApprovalSchema } from '../../../schemas/daily/update-approval.schemas';

/**
 * Update Daily Timesheet Approval Procedure
 * ==========================================
 * tRPC mutation for approving or rejecting daily timesheets
 * 
 * Features:
 * - Protected route (requires authentication)
 * - Zod schema validation
 * - Email notifications on approval/rejection
 * - Comprehensive logging
 * 
 * Access Control:
 * - Admin/HR/Super users can approve any timesheet
 * - Managers/Directors can approve reportee timesheets
 * - Customers can approve allocated employee timesheets
 * - Employees cannot approve timesheets
 * 
 * @input {timesheetUuid, approvalStatus, comment, employee details}
 * @output { success: boolean }
 * @throws TRPCError FORBIDDEN if user lacks permission
 * @throws TRPCError BAD_REQUEST if validation fails
 * @throws TRPCError INTERNAL_SERVER_ERROR for unexpected errors
 */
export const updateDailyTimesheetApprovalProcedure = protectedProcedure
  .input(updateDailyTimesheetApprovalSchema)
  .mutation(async ({ input, ctx }) => {
    logger.info('📥 Update daily timesheet approval request received (tRPC)', {
      userId: ctx.user.uuid,
      userRole: ctx.user.role,
      timesheetUuid: input.timesheetUuid,
      approvalStatus: input.approvalStatus,
      operation: 'updateDailyTimesheetApproval_trpc'
    });

    // Extract user context from tRPC context
    const userContext = {
      uuid: ctx.user.uuid,
      role: ctx.user.role as ApplicationUserRole,
      email: ctx.user.email || '',
      name: ctx.user.email // Use email as fallback for name
    };

    // Call service layer
    const result = await updateDailyTimesheetApproval(
      {
        timesheetUuid: input.timesheetUuid,
        approvalStatus: input.approvalStatus as ApprovalStatus,
        comment: input.comment,
        employeeName: input.employeeName,
        employeeEmail: input.employeeEmail,
        requestNumber: input.requestNumber,
        totalHours: input.totalHours,
        timesheetDate: input.timesheetDate
      },
      userContext
    );

    logger.info('✅ Daily timesheet approval updated successfully (tRPC)', {
      timesheetUuid: input.timesheetUuid,
      approvalStatus: input.approvalStatus,
      userId: ctx.user.uuid
    });

    return result;
  });
