/**
 * List Weekly Timesheets tRPC Router
 * ===================================
 * Type-safe tRPC procedure for retrieving employee weekly timesheets
 */

import { protectedProcedure } from '../../../../../trpc/trpc';
import { logger, logSecurity, PerformanceTimer } from '../../../../../utils/logger';
import { getEmployeeWeeklyTimesheets } from '../../../services/weekly/list-weekly-timesheets.service';
import { ApplicationUserRole } from '../../../types/timesheet.types';
import { listWeeklyTimesheetsSchema } from '../../../schemas/weekly/list.schemas';

/**
 * List Weekly Timesheets Procedure
 * =================================
 * tRPC query for fetching paginated weekly timesheets
 * 
 * Access Control:
 * - Employees can only view their own timesheets
 * - Admin/HR/Super users can view any employee's timesheets
 */
export const listWeeklyTimesheetsProcedure = protectedProcedure
  .input(listWeeklyTimesheetsSchema)
  .query(async ({ input, ctx }) => {
    const { employeeId, pagination, filters } = input;
    const clientIp = ctx.req.ip || 'unknown';
    
    const timer = new PerformanceTimer('tRPC Weekly Timesheet List');
    
    try {
      logger.info('📊 Weekly timesheet list fetch initiated via tRPC', {
        type: 'TRPC_WEEKLY_TIMESHEET_LIST',
        requestedBy: ctx.user?.uuid,
        requestedByRole: ctx.user?.role,
        employeeId,
        pagination,
        filters
      });

      logSecurity('WEEKLY_TIMESHEET_LIST_ACCESS_ATTEMPT', 'low', {
        requestedByRole: ctx.user?.role,
        employeeId
      }, clientIp, ctx.user?.uuid);

      const userContext = {
        uuid: ctx.user!.uuid,
        role: ctx.user!.role as ApplicationUserRole,
        email: ctx.user!.email || ''
      };

      const result = await getEmployeeWeeklyTimesheets(
        employeeId,
        pagination || {},
        filters,
        userContext
      );

      const duration = timer.end();

      logger.info('✅ Weekly timesheets fetched successfully via tRPC', {
        count: result.data.length,
        employeeId,
        duration: `${duration}ms`
      });

      logSecurity('WEEKLY_TIMESHEET_LIST_ACCESS_SUCCESS', 'low', {
        count: result.data.length,
        duration
      }, clientIp, ctx.user?.uuid);

      return {
        success: true,
        message: 'Weekly timesheets fetched successfully',
        data: result.data,
        pagination: {
          page: pagination?.page || 0,
          pageLimit: pagination?.pageLimit || 20,
          totalRecords: result.data.length
        },
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      const duration = timer.end();

      logger.error('❌ Weekly timesheets fetch failed via tRPC', {
        employeeId,
        error: error.message,
        duration: `${duration}ms`
      });

      logSecurity('WEEKLY_TIMESHEET_LIST_ACCESS_ERROR', 'medium', {
        error: error.message
      }, clientIp, ctx.user?.uuid);

      throw error;
    }
  });
