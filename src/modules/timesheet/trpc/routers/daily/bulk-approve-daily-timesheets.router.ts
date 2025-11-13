/**
 * Bulk Approve Daily Timesheets tRPC Router
 * ==========================================
 * Type-safe tRPC procedure for bulk approving/rejecting daily timesheets
 */

import { protectedProcedure } from '../../../../../trpc/trpc';
import { logger } from '../../../../../utils/logger';
import { bulkApproveDailyTimesheets, ApprovalStatus } from '../../../services/daily/bulk-approve-daily-timesheets.service';
import { ApplicationUserRole } from '../../../types/timesheet.types';
import { bulkApproveDailyTimesheetsSchema } from '../../../schemas/daily/bulk-approval.schemas';

/**
 * Bulk Approve Daily Timesheets Procedure
 * ========================================
 * tRPC mutation for bulk approving or rejecting multiple daily timesheets
 * Sends ONE email with all task details
 * 
 * @input {timesheetUuids[], approvalStatus, comment, employee details, taskIds[]}
 * @output { success: boolean, approvedCount: number }
 */
export const bulkApproveDailyTimesheetsProcedure = protectedProcedure
  .input(bulkApproveDailyTimesheetsSchema)
  .mutation(async ({ input, ctx }) => {
    logger.info('📥 Bulk approve daily timesheets request received (tRPC)', {
      userId: ctx.user.uuid,
      userRole: ctx.user.role,
      timesheetCount: input.timesheetUuids.length,
      approvalStatus: input.approvalStatus,
      operation: 'bulkApproveDailyTimesheets_trpc'
    });

    const userContext = {
      uuid: ctx.user.uuid,
      role: ctx.user.role as ApplicationUserRole,
      email: ctx.user.email || '',
      name: ctx.user.email
    };

    const result = await bulkApproveDailyTimesheets({
      ...input,
      approvalStatus: input.approvalStatus as ApprovalStatus
    }, userContext);

    logger.info('✅ Bulk daily timesheet approval completed successfully (tRPC)', {
      approvedCount: result.approvedCount,
      approvalStatus: input.approvalStatus,
      userId: ctx.user.uuid
    });

    return result;
  });
