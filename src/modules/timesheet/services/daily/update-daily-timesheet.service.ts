/**
 * Update Daily Timesheet Service
 * ===============================
 * Business logic layer for updating daily timesheets by employees
 * 
 * Business Rules:
 * - Employee can only update their own timesheets
 * - Can only update on the same day (timesheetDate must be today)
 * - Can only update if status is REQUESTED or REJECTED (not APPROVED)
 * 
 * Responsibilities:
 * - Authorization checks
 * - Same-day validation
 * - Status validation
 * - Timesheet record update
 * - Comprehensive logging
 */

import { TRPCError } from '@trpc/server';
import moment from 'moment';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../../database';
import { logger, logSecurity, PerformanceTimer } from '../../../../utils/logger';
import { updateDailyTimesheetTaskDetails } from '../../stores/daily/update.store';
import { CreateDailyTimesheetInput, ApplicationUserRole, DailyTimesheet } from '../../types/timesheet.types';
import { UpdateDailyTimesheetInput } from '../../schemas/daily/update.schemas';

/**
 * User Context Interface
 * ----------------------
 * Represents the authenticated user making the request
 */
interface UserContext {
  uuid: string;
  role: ApplicationUserRole;
  email: string;
}

/**
 * Get Daily Timesheet by UUID
 * ----------------------------
 * Fetch a single timesheet record for validation
 */
async function getDailyTimesheetByUuid(timesheetUuid: string): Promise<DailyTimesheet | null> {
  const sql = `
    SELECT * FROM employee_timesheets 
    WHERE uuid = ?
  `;
  
  const result = await sequelize.query<DailyTimesheet>(sql, {
    replacements: [timesheetUuid],
    type: QueryTypes.SELECT,
    raw: true,
  });
  
  return result[0] || null;
}

/**
 * Update Daily Timesheet Service
 * ===============================
 * 
 * Main service function for updating an existing daily timesheet
 * 
 * Business Logic Flow:
 * 1. Fetch existing timesheet record
 * 2. Authorization check (employees can only update their own timesheets)
 * 3. Same-day validation (timesheetDate must be today)
 * 4. Status validation (can only update REQUESTED or REJECTED)
 * 5. Update timesheet record
 * 6. Return success
 * 
 * Authorization Rules:
 * - Employees can only update their own timesheets
 * - Admin/HR/Super users can update timesheets for any employee
 * 
 * @param updateData - Daily timesheet update data from validated input
 * @param user - Authenticated user context
 * @returns Success status
 * @throws TRPCError FORBIDDEN if user lacks permission
 * @throws TRPCError BAD_REQUEST if validation fails
 * @throws TRPCError NOT_FOUND if timesheet doesn't exist
 * @throws TRPCError INTERNAL_SERVER_ERROR for unexpected errors
 */
export async function updateDailyTimesheet(
  updateData: UpdateDailyTimesheetInput,
  user: UserContext
): Promise<{ success: boolean }> {
  const timer = new PerformanceTimer('updateDailyTimesheet_service');
  
  try {
    logger.info('📝 Updating daily timesheet', {
      timesheetUuid: updateData.timesheetUuid,
      updatedBy: user.uuid,
      updatedByRole: user.role,
      operation: 'updateDailyTimesheet'
    });

    // ==========================================================================
    // STEP 1: Fetch Existing Timesheet
    // ==========================================================================
    const existingTimesheet = await getDailyTimesheetByUuid(updateData.timesheetUuid);
    
    if (!existingTimesheet) {
      logger.warn('❌ Timesheet not found', {
        timesheetUuid: updateData.timesheetUuid,
        userId: user.uuid
      });

      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Timesheet not found.'
      });
    }

    // ==========================================================================
    // STEP 2: Authorization Check
    // ==========================================================================
    const adminRoles = [
      ApplicationUserRole.superUser,
      ApplicationUserRole.admin,
      ApplicationUserRole.hr
    ];

    const isAdmin = adminRoles.includes(user.role);
    const isOwnTimesheet = user.uuid === existingTimesheet.employeeId;

    if (!isAdmin && !isOwnTimesheet) {
      logger.warn('🚫 Access denied - User cannot update timesheet for another employee', {
        userId: user.uuid,
        userRole: user.role,
        timesheetEmployeeId: existingTimesheet.employeeId
      });

      logSecurity('UPDATE_DAILY_TIMESHEET_ACCESS_DENIED', 'high', {
        userRole: user.role,
        timesheetEmployeeId: existingTimesheet.employeeId,
        reason: 'Attempting to update timesheet for another employee'
      }, undefined, user.uuid);

      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You can only update your own timesheets.'
      });
    }

    // ==========================================================================
    // STEP 3: Same-Day Validation (Employee Only)
    // ==========================================================================
    // Note: Admins can update any timesheet regardless of date
    if (!isAdmin) {
      const timesheetDate = moment(existingTimesheet.timesheetDate).format('YYYY-MM-DD');
      const today = moment().format('YYYY-MM-DD');

      if (timesheetDate !== today) {
        logger.warn('❌ Cannot update old timesheet - Same-day validation failed', {
          timesheetDate,
          today,
          userId: user.uuid,
          timesheetUuid: updateData.timesheetUuid
        });

        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You can only update timesheets on the same day they were created. This timesheet can no longer be edited.'
        });
      }
    }

    // ==========================================================================
    // STEP 4: Status Validation
    // ==========================================================================
    if (existingTimesheet.approvalStatus === 'APPROVED') {
      logger.warn('❌ Cannot update approved timesheet', {
        timesheetUuid: updateData.timesheetUuid,
        approvalStatus: existingTimesheet.approvalStatus,
        userId: user.uuid
      });

      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot update an approved timesheet.'
      });
    }

    // ==========================================================================
    // STEP 5: Update Timesheet Record
    // ==========================================================================
    const timesheetData: CreateDailyTimesheetInput = {
      employeeId: existingTimesheet.employeeId,
      timesheetDate: existingTimesheet.timesheetDate,
      taskDetails: [], // Not used in update, keeping for type compatibility
      totalHours: updateData.totalHours,
      // Task fields from update
      taskId: updateData.taskId,
      customer: updateData.customer,
      project: updateData.project,
      manager: updateData.manager || null,
      taskBrief: updateData.taskBrief,
      taskStatus: updateData.taskStatus,
      responsible: updateData.responsible,
      plannedStartDate: updateData.plannedStartDate || null,
      plannedEndDate: updateData.plannedEndDate || null,
      actualStartDate: updateData.actualStartDate || null,
      actualEndDate: updateData.actualEndDate || null,
      completionPercentage: updateData.completionPercentage ?? null,
      remarks: updateData.remarks || null,
      reasonForDelay: updateData.reasonForDelay || null,
      taskHours: updateData.taskHours || null,
    };

    await updateDailyTimesheetTaskDetails(
      timesheetData,
      updateData.timesheetUuid,
      user.uuid
    );

    const duration = timer.end();

    logger.info('✅ Daily timesheet updated successfully', {
      timesheetUuid: updateData.timesheetUuid,
      updatedBy: user.uuid,
      duration: `${duration}ms`
    });

    return { success: true };

  } catch (error: any) {
    const duration = timer.end();

    // Re-throw TRPCErrors as-is
    if (error instanceof TRPCError) {
      throw error;
    }

    // Log and wrap unexpected errors
    logger.error('❌ Failed to update daily timesheet', {
      timesheetUuid: updateData.timesheetUuid,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An error occurred while updating the timesheet. Please try again.'
    });
  }
}
