/**
 * Weekly Timesheet Store - Update Operations
 * ===========================================
 * Database operations for updating weekly timesheets
 * 
 * Based on old vodichron employeeWeeklyTimesheet.ts store
 * Updated with new Sequelize pattern, comprehensive logging, and new model fields
 */

import { QueryTypes } from 'sequelize';
import moment from 'moment';
import { sequelize } from '../../../../database';
import { logger, logDatabase, PerformanceTimer } from '../../../../utils/logger';
import { CreateWeeklyTimesheetInput, WeeklyTaskEntry } from '../../types/timesheet.types';

/**
 * Update Weekly Timesheet Task Details
 * -------------------------------------
 * Updates the task details and total hours for an existing weekly timesheet
 * Used when employee modifies a saved timesheet before submitting
 * 
 * @param timesheetData - Updated timesheet data
 * @param timesheetId - UUID of the timesheet to update
 * @param updatedBy - UUID of user making the update
 * @returns true if successful
 */
export async function updateWeeklyTimeSheetTaskDetails(
  timesheetData: CreateWeeklyTimesheetInput,
  timesheetId: string,
  updatedBy: string
): Promise<boolean> {
  const timer = new PerformanceTimer('updateWeeklyTimeSheetTaskDetails');
  
  try {
    const updatedAt = moment().format('YYYY-MM-DD HH:mm:ss');

    logger.info('📝 Updating weekly timesheet task details', {
      timesheetId,
      updatedBy,
      totalHours: timesheetData.totalHours,
      operation: 'updateWeeklyTimeSheetTaskDetails'
    });

    const sql = `
      UPDATE employee_weekly_timesheets 
      SET 
        taskDetails = ?,
        totalHours = ?,
        updatedAt = ?,
        updatedBy = ?
      WHERE uuid = ?
    `;

    await sequelize.query(sql, {
      replacements: [
        JSON.stringify(timesheetData.taskDetails),
        timesheetData.totalHours,
        updatedAt,
        updatedBy,
        timesheetId
      ],
      type: QueryTypes.UPDATE,
    });

    const duration = timer.end();
    logDatabase('UPDATE_WEEKLY_TIMESHEET_DETAILS', timesheetId, duration);

    logger.info('✅ Weekly timesheet task details updated successfully', {
      timesheetId,
      duration: `${duration}ms`
    });

    return true;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('UPDATE_WEEKLY_TIMESHEET_DETAILS_ERROR', timesheetId, duration, error);
    
    logger.error('❌ Failed to update weekly timesheet task details', {
      timesheetId,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while updating timesheet: ${error.message}`);
  }
}

/**
 * Update Weekly Timesheet Status
 * -------------------------------
 * Updates the timesheet status to REQUESTED when employee submits for approval
 * Also updates task details, total hours, approval status, and timesheet status
 * 
 * @param timesheetData - Updated timesheet data
 * @param timesheetId - UUID of the timesheet to update
 * @param updatedBy - UUID of user making the update
 * @returns true if successful
 */
export async function updateWeeklyTimeSheetStatus(
  timesheetData: CreateWeeklyTimesheetInput,
  timesheetId: string,
  updatedBy: string
): Promise<boolean> {
  const timer = new PerformanceTimer('updateWeeklyTimeSheetStatus');
  
  try {
    const status = 'REQUESTED';
    const updatedAt = moment().format('YYYY-MM-DD HH:mm:ss');

    logger.info('📝 Updating weekly timesheet status to REQUESTED', {
      timesheetId,
      updatedBy,
      totalHours: timesheetData.totalHours,
      operation: 'updateWeeklyTimeSheetStatus'
    });

    const sql = `
      UPDATE employee_weekly_timesheets 
      SET 
        taskDetails = ?,
        totalHours = ?,
        approvalStatus = ?,
        timeSheetStatus = ?,
        updatedAt = ?,
        updatedBy = ?
      WHERE uuid = ?
    `;

    await sequelize.query(sql, {
      replacements: [
        JSON.stringify(timesheetData.taskDetails),
        timesheetData.totalHours,
        status,
        status,
        updatedAt,
        updatedBy,
        timesheetId
      ],
      type: QueryTypes.UPDATE,
    });

    const duration = timer.end();
    logDatabase('UPDATE_WEEKLY_TIMESHEET_STATUS', timesheetId, duration);

    logger.info('✅ Weekly timesheet status updated successfully', {
      timesheetId,
      newStatus: status,
      duration: `${duration}ms`
    });

    return true;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('UPDATE_WEEKLY_TIMESHEET_STATUS_ERROR', timesheetId, duration, error);
    
    logger.error('❌ Failed to update weekly timesheet status', {
      timesheetId,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while updating timesheet status: ${error.message}`);
  }
}

/**
 * Update Weekly Timesheet Approval Status
 * ----------------------------------------
 * Updates approval status when manager/director/customer approves or rejects a timesheet
 * Records approver information, comments, and locks the task details
 * 
 * @param loggedInUserId - UUID of the approver
 * @param loggedInUserRole - Role of the approver (manager, director, customer, etc.)
 * @param timesheetId - UUID of the timesheet to update
 * @param comments - Approver comments/feedback
 * @param status - Approval status (APPROVED or REJECTED)
 * @param taskDetails - Updated task details (may include locked cells)
 * @param updatedBy - UUID of user making the update
 * @returns true if successful
 */
export async function updateWeeklyTimeSheetApprovalStatus(
  loggedInUserId: string,
  loggedInUserRole: string,
  timesheetId: string,
  comments: string,
  status: 'APPROVED' | 'REJECTED',
  taskDetails: WeeklyTaskEntry[],
  updatedBy: string
): Promise<boolean> {
  const timer = new PerformanceTimer('updateWeeklyTimeSheetApprovalStatus');
  
  try {
    const currentDate = moment().format('YYYY-MM-DD');
    const updatedAt = moment().format('YYYY-MM-DD HH:mm:ss');

    logger.info('📝 Updating weekly timesheet approval status', {
      timesheetId,
      approverId: loggedInUserId,
      approverRole: loggedInUserRole,
      status,
      operation: 'updateWeeklyTimeSheetApprovalStatus'
    });

    const sql = `
      UPDATE employee_weekly_timesheets 
      SET 
        taskDetails = ?,
        approvalStatus = ?,
        timeSheetStatus = ?,
        approverComments = ?,
        approvalDate = ?,
        approverId = ?,
        approverRole = ?,
        updatedAt = ?,
        updatedBy = ?
      WHERE uuid = ?
    `;

    await sequelize.query(sql, {
      replacements: [
        JSON.stringify(taskDetails),
        status,
        status,
        comments,
        currentDate,
        loggedInUserId,
        loggedInUserRole,
        updatedAt,
        updatedBy,
        timesheetId
      ],
      type: QueryTypes.UPDATE,
    });

    const duration = timer.end();
    logDatabase('UPDATE_WEEKLY_TIMESHEET_APPROVAL', timesheetId, duration);

    logger.info('✅ Weekly timesheet approval status updated successfully', {
      timesheetId,
      status,
      approverId: loggedInUserId,
      duration: `${duration}ms`
    });

    return true;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('UPDATE_WEEKLY_TIMESHEET_APPROVAL_ERROR', timesheetId, duration, error);
    
    logger.error('❌ Failed to update weekly timesheet approval status', {
      timesheetId,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while updating timesheet approval: ${error.message}`);
  }
}
