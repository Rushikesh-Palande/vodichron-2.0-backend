/**
 * List Reportee Daily Timesheets tRPC Router
 * ===========================================
 * Type-safe tRPC procedure for managers/HR to view reportee daily timesheets
 */

import { protectedProcedure } from '../../../../../trpc/trpc';
import { logger, logSecurity, PerformanceTimer } from '../../../../../utils/logger';
import { getReporteeDailyTimesheets } from '../../../services/daily/list-reportee-daily-timesheets.service';
import { ApplicationUserRole } from '../../../types/timesheet.types';
import { listReporteeDailyTimesheetsSchema } from '../../../schemas/daily/list.schemas';

/**
 * List Reportee Daily Timesheets Procedure
 * =========================================
 * tRPC query for fetching reportee daily timesheets
 * 
 * Access Control:
 * - HR/Super User: Can view ALL employee timesheets
 * - Manager/Director: Can view their reportee timesheets
 * - Employee/Customer: Cannot access (FORBIDDEN)
 */
export const listReporteeDailyTimesheetsProcedure = protectedProcedure
  .input(listReporteeDailyTimesheetsSchema)
  .query(async ({ input, ctx }) => {
    const { pagination, filters } = input;
    const clientIp = ctx.req.ip || 'unknown';
    
    const timer = new PerformanceTimer('tRPC Reportee Daily Timesheet List');
    
    try {
      logger.info('👥 Reportee daily timesheet list fetch initiated via tRPC', {
        type: 'TRPC_REPORTEE_DAILY_TIMESHEET_LIST',
        requestedBy: ctx.user?.uuid,
        requestedByRole: ctx.user?.role,
        pagination,
        filters,
        timestamp: new Date().toISOString()
      });

      logSecurity('REPORTEE_DAILY_TIMESHEET_LIST_ACCESS_ATTEMPT', 'low', {
        requestedByRole: ctx.user?.role
      }, clientIp, ctx.user?.uuid);

      const userContext = {
        uuid: ctx.user!.uuid,
        role: ctx.user!.role as ApplicationUserRole,
        email: ctx.user!.email || ''
      };

      const result = await getReporteeDailyTimesheets(
        pagination || {},
        filters,
        userContext
      );

      const duration = timer.end();

      logger.info('✅ Reportee daily timesheets fetched successfully via tRPC', {
        type: 'TRPC_REPORTEE_DAILY_TIMESHEET_LIST_SUCCESS',
        count: result.data.length,
        requestedBy: ctx.user?.uuid,
        duration: `${duration}ms`
      });

      logSecurity('REPORTEE_DAILY_TIMESHEET_LIST_ACCESS_SUCCESS', 'low', {
        count: result.data.length,
        duration
      }, clientIp, ctx.user?.uuid);

      return {
        success: true,
        message: 'Reportee daily timesheets fetched successfully',
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

      logger.error('❌ Reportee daily timesheets fetch failed via tRPC', {
        type: 'TRPC_REPORTEE_DAILY_TIMESHEET_LIST_ERROR',
        requestedBy: ctx.user?.uuid,
        error: error.message,
        code: error.code,
        duration: `${duration}ms`,
        stack: error.stack
      });

      logSecurity('REPORTEE_DAILY_TIMESHEET_LIST_ACCESS_ERROR', 'medium', {
        error: error.message,
        duration
      }, clientIp, ctx.user?.uuid);

      throw error;
    }
  });
