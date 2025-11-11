/**
 * Get Weekly Timesheet Detail tRPC Router
 * ========================================
 * Type-safe tRPC procedure for retrieving single weekly timesheet details
 */

import { protectedProcedure } from '../../../../../trpc/trpc';
import { logger } from '../../../../../utils/logger';
import { getWeeklyTimesheetDetail } from '../../../services/weekly/get-weekly-timesheet-detail.service';
import { ApplicationUserRole } from '../../../types/timesheet.types';
import { getWeeklyTimesheetDetailSchema } from '../../../schemas/weekly/list.schemas';

/**
 * Get Weekly Timesheet Detail Procedure
 * ======================================
 * tRPC query for fetching single timesheet details
 * 
 * Access Control:
 * - Employees can only view their own timesheets
 * - Admin/HR/Super users/Manager/Director can view any timesheet
 */
export const getWeeklyTimesheetDetailProcedure = protectedProcedure
  .input(getWeeklyTimesheetDetailSchema)
  .query(async ({ input, ctx }) => {
    logger.info('📄 Get weekly timesheet detail request received (tRPC)', {
      userId: ctx.user.uuid,
      userRole: ctx.user.role,
      timesheetId: input.timesheetId,
      employeeId: input.employeeId,
      operation: 'getWeeklyTimesheetDetail_trpc'
    });

    const userContext = {
      uuid: ctx.user.uuid,
      role: ctx.user.role as ApplicationUserRole,
      email: ctx.user.email || ''
    };

    const result = await getWeeklyTimesheetDetail(
      input.timesheetId,
      input.employeeId,
      userContext
    );

    logger.info('✅ Weekly timesheet detail fetched successfully (tRPC)', {
      timesheetId: input.timesheetId,
      userId: ctx.user.uuid
    });

    return result;
  });
