/**
 * List Daily Timesheets tRPC Router
 * ==================================
 * Type-safe tRPC procedure for retrieving employee daily timesheets
 */

import { protectedProcedure } from '../../../../../trpc/trpc';
import { logger, logSecurity, PerformanceTimer } from '../../../../../utils/logger';
import { listDailyTimesheetsSchema } from '../../../schemas/daily/list.schemas';
import { getEmployeeDailyTimesheets } from '../../../services/daily/list-daily-timesheets.service';
import { ApplicationUserRole } from '../../../types/timesheet.types';

/**
 * List Daily Timesheets Procedure
 * ================================
 * tRPC query for fetching paginated daily timesheets
 * 
 * Features:
 * - Protected route (requires authentication)
 * - Zod schema validation
 * - Pagination support
 * - Optional filters (month, year, approvalStatus)
 * - Comprehensive logging
 * 
 * Access Control:
 * - Employees can only view their own timesheets
 * - Admin/HR/Super users can view any employee's timesheets
 * 
 * @input {employeeId, pagination, filters} - Query parameters
 * @returns Array of daily timesheets
 * @throws TRPCError FORBIDDEN if user lacks permission
 * @throws TRPCError INTERNAL_SERVER_ERROR for unexpected errors
 */
export const listDailyTimesheetsProcedure = protectedProcedure
  .input(listDailyTimesheetsSchema)
  .query(async ({ input, ctx }) => {
    const { employeeId, pagination, filters } = input;
    const clientIp = ctx.req.ip || 'unknown';
    
    const timer = new PerformanceTimer('tRPC Daily Timesheet List');
    
    try {
      logger.info('📊 Daily timesheet list fetch initiated via tRPC', {
        type: 'TRPC_DAILY_TIMESHEET_LIST',
        requestedBy: ctx.user?.uuid,
        requestedByRole: ctx.user?.role,
        employeeId,
        pagination,
        filters,
        timestamp: new Date().toISOString()
      });

      logSecurity('DAILY_TIMESHEET_LIST_ACCESS_ATTEMPT', 'low', {
        requestedByRole: ctx.user?.role,
        employeeId,
        pagination
      }, clientIp, ctx.user?.uuid);

      // Extract user context
      const userContext = {
        uuid: ctx.user!.uuid,
        role: ctx.user!.role as ApplicationUserRole,
        email: ctx.user!.email || ''
      };

      // Call service layer
      const timesheets = await getEmployeeDailyTimesheets(
        employeeId,
        pagination || {},
        filters,
        userContext
      );

      // Log success
      const duration = timer.end();

      logger.info('✅ Daily timesheets fetched successfully via tRPC', {
        type: 'TRPC_DAILY_TIMESHEET_LIST_SUCCESS',
        count: timesheets.length,
        employeeId,
        requestedBy: ctx.user?.uuid,
        duration: `${duration}ms`
      });

      logSecurity('DAILY_TIMESHEET_LIST_ACCESS_SUCCESS', 'low', {
        count: timesheets.length,
        employeeId,
        duration
      }, clientIp, ctx.user?.uuid);

      return {
        success: true,
        message: 'Daily timesheets fetched successfully',
        data: timesheets,
        pagination: {
          page: pagination?.page || 0,
          pageLimit: pagination?.pageLimit || 20,
          totalRecords: timesheets.length
        },
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      const duration = timer.end();

      logger.error('❌ Daily timesheets fetch failed via tRPC', {
        type: 'TRPC_DAILY_TIMESHEET_LIST_ERROR',
        requestedBy: ctx.user?.uuid,
        employeeId,
        error: error.message,
        code: error.code,
        duration: `${duration}ms`,
        stack: error.stack
      });

      if (error.code === 'FORBIDDEN') {
        logSecurity('DAILY_TIMESHEET_LIST_ACCESS_DENIED', 'medium', {
          reason: error.message,
          employeeId,
          duration
        }, clientIp, ctx.user?.uuid);
      } else {
        logSecurity('DAILY_TIMESHEET_LIST_ACCESS_ERROR', 'medium', {
          error: error.message,
          employeeId,
          duration
        }, clientIp, ctx.user?.uuid);
      }

      throw error;
    }
  });
