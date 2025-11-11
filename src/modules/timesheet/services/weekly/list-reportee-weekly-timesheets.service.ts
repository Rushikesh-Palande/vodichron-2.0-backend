/**
 * List Reportee Weekly Timesheets Service
 * ========================================
 * Business logic layer for managers/HR to view reportee timesheets
 * 
 * Based on old vodichron employeeWeeklyTimesheetController.ts (line 268-292)
 * 
 * Responsibilities:
 * - Role-based authorization (HR/superUser gets all, manager/director gets reportees)
 * - Pagination and filtering
 * - Comprehensive logging
 */

import { TRPCError } from '@trpc/server';
import { logger, logSecurity, PerformanceTimer } from '../../../../utils/logger';
import { 
  getPaginatedAllWeeklyTimesheet,
  getPaginatedReporteeWeeklyTimesheet 
} from '../../stores/weekly/list.store';
import { ApplicationUserRole, WeeklyTimesheetFilters } from '../../types/timesheet.types';

/**
 * User Context Interface
 */
interface UserContext {
  uuid: string;
  role: ApplicationUserRole;
  email: string;
}

/**
 * Get Reportee Weekly Timesheets Service
 * =======================================
 * 
 * Fetches paginated list of weekly timesheets for reportees
 * 
 * Authorization Rules (from old vodichron line 278-290):
 * - HR/Super User: Can view ALL employee timesheets
 * - Manager/Director: Can view their direct/indirect reportee timesheets
 * - Employee: Cannot access this endpoint (FORBIDDEN)
 * - Customer: Cannot access this endpoint (FORBIDDEN)
 * 
 * @param pagination - Page and limit
 * @param filters - Optional filters (month, year, approvalStatus)
 * @param user - Authenticated user context
 * @returns Array of weekly timesheets with data wrapper
 */
export async function getReporteeWeeklyTimesheets(
  pagination: { page?: number; pageLimit?: number },
  filters: WeeklyTimesheetFilters | undefined,
  user: UserContext
): Promise<{ data: any[] }> {
  const timer = new PerformanceTimer('getReporteeWeeklyTimesheets_service');
  
  try {
    logger.info('👥 Fetching reportee weekly timesheets', {
      requestedBy: user.uuid,
      requestedByRole: user.role,
      pagination,
      filters,
      operation: 'getReporteeWeeklyTimesheets'
    });

    // ==========================================================================
    // STEP 1: Authorization Check
    // ==========================================================================
    // Based on old vodichron line 278-290
    const isHROrSuperUser = user.role === ApplicationUserRole.hr || user.role === ApplicationUserRole.superUser;
    const isManagerOrDirector = user.role === ApplicationUserRole.manager || user.role === ApplicationUserRole.director;

    if (!isHROrSuperUser && !isManagerOrDirector) {
      logger.warn('🚫 Access denied - User cannot view reportee timesheets', {
        userId: user.uuid,
        userRole: user.role
      });

      logSecurity('GET_REPORTEE_TIMESHEETS_ACCESS_DENIED', 'high', {
        userRole: user.role,
        reason: 'User role not authorized to view reportee timesheets'
      }, undefined, user.uuid);

      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied for the operation request.'
      });
    }

    // ==========================================================================
    // STEP 2: Extract and Validate Pagination
    // ==========================================================================
    let page = pagination?.page || 0;
    const pageLimit = pagination?.pageLimit || 20;

    if (!page || page < 0) {
      page = 0;
    }

    // ==========================================================================
    // STEP 3: Fetch Timesheets Based on Role
    // ==========================================================================
    let timesheets: any[] = [];

    if (isHROrSuperUser) {
      // HR and Super User can see ALL timesheets
      logger.debug('🔍 Fetching all weekly timesheets (HR/Super User)', {
        userId: user.uuid,
        page,
        pageLimit,
        filters
      });

      timesheets = await getPaginatedAllWeeklyTimesheet(
        filters || {},
        user.uuid,
        page,
        pageLimit
      );

      logger.info('✅ All weekly timesheets fetched (HR/Super User)', {
        count: timesheets.length,
        requestedBy: user.uuid,
        role: user.role
      });

    } else if (isManagerOrDirector) {
      // Manager and Director can see their reportee timesheets
      logger.debug('🔍 Fetching reportee weekly timesheets (Manager/Director)', {
        userId: user.uuid,
        page,
        pageLimit,
        filters
      });

      timesheets = await getPaginatedReporteeWeeklyTimesheet(
        filters || {},
        user.uuid,
        page,
        pageLimit
      );

      logger.info('✅ Reportee weekly timesheets fetched (Manager/Director)', {
        count: timesheets.length,
        requestedBy: user.uuid,
        role: user.role
      });
    }

    // ==========================================================================
    // STEP 4: Log Success and Return
    // ==========================================================================
    const duration = timer.end();

    logger.info('✅ Reportee timesheets fetched successfully', {
      count: timesheets.length,
      page,
      pageLimit,
      requestedBy: user.uuid,
      requestedByRole: user.role,
      duration: `${duration}ms`
    });

    logSecurity('GET_REPORTEE_TIMESHEETS_SUCCESS', 'low', {
      count: timesheets.length,
      userRole: user.role,
      duration
    }, undefined, user.uuid);

    return { data: timesheets };

  } catch (error: any) {
    const duration = timer.end();

    if (error instanceof TRPCError) {
      throw error;
    }

    logger.error('❌ Failed to fetch reportee timesheets', {
      requestedBy: user.uuid,
      requestedByRole: user.role,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });

    logSecurity('GET_REPORTEE_TIMESHEETS_ERROR', 'critical', {
      error: error.message,
      userRole: user.role,
      duration
    }, undefined, user.uuid);

    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch reportee timesheets. Please try again later.'
    });
  }
}
