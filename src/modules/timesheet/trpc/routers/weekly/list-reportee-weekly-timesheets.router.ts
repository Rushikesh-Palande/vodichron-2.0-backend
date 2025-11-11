/**
 * List Reportee Weekly Timesheets tRPC Router
 * ============================================
 * Type-safe tRPC procedure for managers/HR to view reportee timesheets
 */

import { protectedProcedure } from '../../../../../trpc/trpc';
import { logger, logSecurity, PerformanceTimer } from '../../../../../utils/logger';
import { getReporteeWeeklyTimesheets } from '../../../services/weekly/list-reportee-weekly-timesheets.service';
import { ApplicationUserRole } from '../../../types/timesheet.types';
import { listReporteeWeeklyTimesheetsSchema } from '../../../schemas/weekly/list.schemas';

/**
 * List Reportee Weekly Timesheets Procedure
 * ==========================================
 * tRPC query for fetching reportee weekly timesheets
 * 
 * Access Control:
 * - HR/Super User: Can view ALL employee timesheets
 * - Manager/Director: Can view their reportee timesheets
 * - Employee/Customer: Cannot access (FORBIDDEN)
 */
export const listReporteeWeeklyTimesheetsProcedure = protectedProcedure
  .input(listReporteeWeeklyTimesheetsSchema)
  .query(async ({ input, ctx }) => {
    const { pagination, filters } = input;
    const clientIp = ctx.req.ip || 'unknown';
    
    const timer = new PerformanceTimer('tRPC Reportee Weekly Timesheet List');
    
    try {
      logger.info('👥 Reportee weekly timesheet list fetch initiated via tRPC', {
        type: 'TRPC_REPORTEE_WEEKLY_TIMESHEET_LIST',
        requestedBy: ctx.user?.uuid,
        requestedByRole: ctx.user?.role,
        pagination,
        filters
      });

      logSecurity('REPORTEE_TIMESHEET_LIST_ACCESS_ATTEMPT', 'low', {
        requestedByRole: ctx.user?.role
      }, clientIp, ctx.user?.uuid);

      const userContext = {
        uuid: ctx.user!.uuid,
        role: ctx.user!.role as ApplicationUserRole,
        email: ctx.user!.email || ''
      };

      const result = await getReporteeWeeklyTimesheets(
        pagination || {},
        filters,
        userContext
      );

      const duration = timer.end();

      logger.info('✅ Reportee weekly timesheets fetched successfully via tRPC', {
        count: result.data.length,
        requestedBy: ctx.user?.uuid,
        duration: `${duration}ms`
      });

      logSecurity('REPORTEE_TIMESHEET_LIST_ACCESS_SUCCESS', 'low', {
        count: result.data.length,
        duration
      }, clientIp, ctx.user?.uuid);

      return {
        success: true,
        message: 'Reportee timesheets fetched successfully',
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

      logger.error('❌ Reportee timesheets fetch failed via tRPC', {
        requestedBy: ctx.user?.uuid,
        error: error.message,
        duration: `${duration}ms`
      });

      logSecurity('REPORTEE_TIMESHEET_LIST_ACCESS_ERROR', 'medium', {
        error: error.message
      }, clientIp, ctx.user?.uuid);

      throw error;
    }
  });
