/**
 * List Weekly Timesheets Service
 * ===============================
 * Business logic layer for retrieving employee weekly timesheets
 * 
 * Based on old vodichron employeeWeeklyTimesheetController.ts (line 230-251)
 * 
 * Responsibilities:
 * - Authorization checks (employees can only view their own)
 * - Pagination and filtering
 * - Comprehensive logging
 */

import { TRPCError } from '@trpc/server';
import { logger, logSecurity, PerformanceTimer } from '../../../../utils/logger';
import { getPaginatedEmployeeWeeklyTimesheetByEmployeeId } from '../../stores/weekly/list.store';
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
 * Get Employee Weekly Timesheets Service
 * =======================================
 * 
 * Fetches paginated list of weekly timesheets for an employee
 * 
 * Authorization Rules (from old vodichron line 237-239):
 * - Employees can only view their own timesheets
 * - Admin/HR/Super users/Manager/Director can view any employee's timesheets
 * 
 * @param employeeId - UUID of employee whose timesheets to fetch
 * @param pagination - Page and limit
 * @param filters - Optional filters (month, year, approvalStatus)
 * @param user - Authenticated user context
 * @returns Array of weekly timesheets with data wrapper
 */
export async function getEmployeeWeeklyTimesheets(
  employeeId: string,
  pagination: { page?: number; pageLimit?: number },
  filters: WeeklyTimesheetFilters | undefined,
  user: UserContext
): Promise<{ data: any[] }> {
  const timer = new PerformanceTimer('getEmployeeWeeklyTimesheets_service');
  
  try {
    logger.info('📋 Fetching employee weekly timesheets', {
      employeeId,
      requestedBy: user.uuid,
      requestedByRole: user.role,
      pagination,
      filters,
      operation: 'getEmployeeWeeklyTimesheets'
    });

    // ==========================================================================
    // STEP 1: Authorization Check
    // ==========================================================================
    // Based on old vodichron line 237-239
    const isEmployee = user.role === ApplicationUserRole.employee;
    const isOwnTimesheets = user.uuid === employeeId;

    if (isEmployee && !isOwnTimesheets) {
      logger.warn('🚫 Access denied - Employee cannot view another employee\'s timesheets', {
        userId: user.uuid,
        userRole: user.role,
        targetEmployeeId: employeeId
      });

      logSecurity('GET_WEEKLY_TIMESHEETS_ACCESS_DENIED', 'high', {
        userRole: user.role,
        targetEmployeeId: employeeId,
        reason: 'Employee attempting to view another employee\'s timesheets'
      }, undefined, user.uuid);

      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied for the operation request.'
      });
    }

    // ==========================================================================
    // STEP 2: Extract and Validate Pagination
    // ==========================================================================
    // Based on old vodichron line 241-243
    let page = pagination?.page || 0;
    const pageLimit = pagination?.pageLimit || 20;

    if (!page || page < 0) {
      page = 0;
    }

    // ==========================================================================
    // STEP 3: Fetch Timesheets from Database
    // ==========================================================================
    logger.debug('🔍 Fetching weekly timesheets from database', {
      employeeId,
      page,
      pageLimit,
      filters
    });

    const timesheets = await getPaginatedEmployeeWeeklyTimesheetByEmployeeId(
      filters || {},
      employeeId,
      page,
      pageLimit
    );

    // ==========================================================================
    // STEP 4: Log Success and Return
    // ==========================================================================
    const duration = timer.end();

    logger.info('✅ Weekly timesheets fetched successfully', {
      count: timesheets.length,
      employeeId,
      page,
      pageLimit,
      requestedBy: user.uuid,
      duration: `${duration}ms`
    });

    logSecurity('GET_WEEKLY_TIMESHEETS_SUCCESS', 'low', {
      count: timesheets.length,
      employeeId,
      userRole: user.role,
      duration
    }, undefined, user.uuid);

    return { data: timesheets };

  } catch (error: any) {
    const duration = timer.end();

    if (error instanceof TRPCError) {
      throw error;
    }

    logger.error('❌ Failed to fetch weekly timesheets', {
      employeeId,
      requestedBy: user.uuid,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });

    logSecurity('GET_WEEKLY_TIMESHEETS_ERROR', 'critical', {
      employeeId,
      error: error.message,
      duration
    }, undefined, user.uuid);

    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch weekly timesheets. Please try again later.'
    });
  }
}
