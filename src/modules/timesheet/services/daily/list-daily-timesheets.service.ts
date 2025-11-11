/**
 * List Daily Timesheets Service
 * ==============================
 * Business logic layer for retrieving daily timesheets
 * 
 * Based on old vodichron employeeTimesheetController.ts
 * 
 * Responsibilities:
 * - Authorization checks (employees can only view their own)
 * - Pagination and filtering
 * - Comprehensive logging
 */

import { TRPCError } from '@trpc/server';
import { logger, logSecurity, PerformanceTimer } from '../../../../utils/logger';
import { getPaginatedDailyTimesheetsByEmployeeId } from '../../stores/daily/list.store';
import { ApplicationUserRole, DailyTimesheetFilters } from '../../types/timesheet.types';

/**
 * User Context Interface
 */
interface UserContext {
  uuid: string;
  role: ApplicationUserRole;
  email: string;
}

/**
 * Get Employee Daily Timesheets Service
 * ======================================
 * 
 * Fetches paginated list of daily timesheets for an employee
 * 
 * Authorization Rules:
 * - Employees can only view their own timesheets
 * - Admin/HR/Super users can view any employee's timesheets
 * 
 * @param employeeId - UUID of employee whose timesheets to fetch
 * @param pagination - Page and limit
 * @param filters - Optional filters (month, year, approvalStatus)
 * @param user - Authenticated user context
 * @returns Array of daily timesheets
 */
export async function getEmployeeDailyTimesheets(
  employeeId: string,
  pagination: { page?: number; pageLimit?: number },
  filters: DailyTimesheetFilters | undefined,
  user: UserContext
): Promise<any[]> {
  const timer = new PerformanceTimer('getEmployeeDailyTimesheets_service');
  
  try {
    logger.info('📋 Fetching employee daily timesheets', {
      employeeId,
      requestedBy: user.uuid,
      requestedByRole: user.role,
      pagination,
      filters,
      operation: 'getEmployeeDailyTimesheets'
    });

    // ==========================================================================
    // STEP 1: Authorization Check
    // ==========================================================================
    const adminRoles = [
      ApplicationUserRole.superUser,
      ApplicationUserRole.admin,
      ApplicationUserRole.hr
    ];

    const isAdmin = adminRoles.includes(user.role);
    const isOwnTimesheets = user.uuid === employeeId;

    if (!isAdmin && !isOwnTimesheets) {
      logger.warn('🚫 Access denied - User cannot view another employee\'s timesheets', {
        userId: user.uuid,
        userRole: user.role,
        targetEmployeeId: employeeId
      });

      logSecurity('GET_DAILY_TIMESHEETS_ACCESS_DENIED', 'high', {
        userRole: user.role,
        targetEmployeeId: employeeId,
        reason: 'Attempting to view another employee\'s timesheets'
      }, undefined, user.uuid);

      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied for the operation request.'
      });
    }

    // ==========================================================================
    // STEP 2: Extract Pagination
    // ==========================================================================
    let page = pagination?.page || 0;
    const pageLimit = pagination?.pageLimit || 20;

    if (!page || page < 0) {
      page = 0;
    }

    // ==========================================================================
    // STEP 3: Fetch Timesheets from Database
    // ==========================================================================
    const timesheets = await getPaginatedDailyTimesheetsByEmployeeId(
      filters || {},
      employeeId,
      page,
      pageLimit
    );

    // ==========================================================================
    // STEP 4: Log Success and Return
    // ==========================================================================
    const duration = timer.end();

    logger.info('✅ Daily timesheets fetched successfully', {
      count: timesheets.length,
      employeeId,
      page,
      pageLimit,
      requestedBy: user.uuid,
      duration: `${duration}ms`
    });

    logSecurity('GET_DAILY_TIMESHEETS_SUCCESS', 'low', {
      count: timesheets.length,
      employeeId,
      userRole: user.role,
      duration
    }, undefined, user.uuid);

    return timesheets;

  } catch (error: any) {
    const duration = timer.end();

    if (error instanceof TRPCError) {
      throw error;
    }

    logger.error('❌ Failed to fetch daily timesheets', {
      employeeId,
      requestedBy: user.uuid,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });

    logSecurity('GET_DAILY_TIMESHEETS_ERROR', 'critical', {
      employeeId,
      error: error.message,
      duration
    }, undefined, user.uuid);

    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch daily timesheets. Please try again later.'
    });
  }
}
