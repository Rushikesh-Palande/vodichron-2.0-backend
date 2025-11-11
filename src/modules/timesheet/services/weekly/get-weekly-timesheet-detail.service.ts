/**
 * Get Weekly Timesheet Detail Service
 * ====================================
 * Business logic layer for retrieving single weekly timesheet details
 * 
 * Based on old vodichron employeeWeeklyTimesheetController.ts (line 253-266)
 * 
 * Responsibilities:
 * - Authorization checks (employees can only view their own)
 * - Fetch single timesheet by UUID
 * - Comprehensive logging
 */

import { TRPCError } from '@trpc/server';
import { logger, logSecurity, PerformanceTimer } from '../../../../utils/logger';
import { getWeeklyTimesheetDetailsById } from '../../stores/weekly/list.store';
import { ApplicationUserRole } from '../../types/timesheet.types';

/**
 * User Context Interface
 */
interface UserContext {
  uuid: string;
  role: ApplicationUserRole;
  email: string;
}

/**
 * Get Weekly Timesheet Detail Service
 * ====================================
 * 
 * Fetches detailed information for a single weekly timesheet
 * 
 * Authorization Rules (from old vodichron line 258-260):
 * - Employees can only view their own timesheets
 * - Admin/HR/Super users/Manager/Director can view any timesheet
 * 
 * @param timesheetId - UUID of the timesheet to fetch
 * @param employeeId - UUID of employee who owns the timesheet
 * @param user - Authenticated user context
 * @returns Timesheet details with data wrapper
 */
export async function getWeeklyTimesheetDetail(
  timesheetId: string,
  employeeId: string,
  user: UserContext
): Promise<{ data: any }> {
  const timer = new PerformanceTimer('getWeeklyTimesheetDetail_service');
  
  try {
    logger.info('📄 Fetching weekly timesheet detail', {
      timesheetId,
      employeeId,
      requestedBy: user.uuid,
      requestedByRole: user.role,
      operation: 'getWeeklyTimesheetDetail'
    });

    // ==========================================================================
    // STEP 1: Authorization Check
    // ==========================================================================
    // Based on old vodichron line 258-260
    const isEmployee = user.role === ApplicationUserRole.employee;
    const isOwnTimesheet = user.uuid === employeeId;

    if (isEmployee && !isOwnTimesheet) {
      logger.warn('🚫 Access denied - Employee cannot view another employee\'s timesheet', {
        userId: user.uuid,
        userRole: user.role,
        targetEmployeeId: employeeId,
        timesheetId
      });

      logSecurity('GET_WEEKLY_TIMESHEET_DETAIL_ACCESS_DENIED', 'high', {
        userRole: user.role,
        targetEmployeeId: employeeId,
        timesheetId,
        reason: 'Employee attempting to view another employee\'s timesheet'
      }, undefined, user.uuid);

      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied for the operation request.'
      });
    }

    // ==========================================================================
    // STEP 2: Fetch Timesheet Details
    // ==========================================================================
    logger.debug('🔍 Fetching timesheet from database', {
      timesheetId
    });

    const timesheet = await getWeeklyTimesheetDetailsById(timesheetId);

    // ==========================================================================
    // STEP 3: Validate Timesheet Exists
    // ==========================================================================
    // Based on old vodichron line 262-264
    if (!timesheet) {
      logger.warn('❌ Timesheet not found', {
        timesheetId,
        employeeId,
        requestedBy: user.uuid
      });

      logSecurity('GET_WEEKLY_TIMESHEET_DETAIL_NOT_FOUND', 'medium', {
        timesheetId,
        employeeId,
        requestedBy: user.uuid
      }, undefined, user.uuid);

      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Unable to find timesheet details to update.'
      });
    }

    // ==========================================================================
    // STEP 4: Log Success and Return
    // ==========================================================================
    const duration = timer.end();

    logger.info('✅ Weekly timesheet detail fetched successfully', {
      timesheetId,
      employeeId: timesheet.employeeId,
      requestNumber: timesheet.requestNumber,
      approvalStatus: timesheet.approvalStatus,
      requestedBy: user.uuid,
      duration: `${duration}ms`
    });

    logSecurity('GET_WEEKLY_TIMESHEET_DETAIL_SUCCESS', 'low', {
      timesheetId,
      employeeId: timesheet.employeeId,
      userRole: user.role,
      duration
    }, undefined, user.uuid);

    return { data: timesheet };

  } catch (error: any) {
    const duration = timer.end();

    if (error instanceof TRPCError) {
      throw error;
    }

    logger.error('❌ Failed to fetch weekly timesheet detail', {
      timesheetId,
      employeeId,
      requestedBy: user.uuid,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });

    logSecurity('GET_WEEKLY_TIMESHEET_DETAIL_ERROR', 'critical', {
      timesheetId,
      employeeId,
      error: error.message,
      duration
    }, undefined, user.uuid);

    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch timesheet details. Please try again later.'
    });
  }
}
