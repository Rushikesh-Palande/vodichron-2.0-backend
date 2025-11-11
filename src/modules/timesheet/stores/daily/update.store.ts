/**
 * Daily Timesheet Store - Update Operations
 * ==========================================
 * Database operations for updating daily timesheets
 * 
 * Extended functionality beyond old vodichron for completeness
 * Includes update task details and approval status operations
 */

import { QueryTypes } from 'sequelize';
import moment from 'moment';
import { sequelize } from '../../../../database';
import { logger, logDatabase, PerformanceTimer } from '../../../../utils/logger';
import { CreateDailyTimesheetInput } from '../../types/timesheet.types';

/**
 * Update Daily Timesheet Task Details
 * ------------------------------------
 * Updates the task details and total hours for an existing daily timesheet
 * Can only be done if timesheet is in REQUESTED or REJECTED status
 * 
 * @param timesheetData - Updated timesheet data
 * @param timesheetId - UUID of the timesheet to update
 * @param updatedBy - UUID of user making the update
 * @returns true if successful
 */
export async function updateDailyTimesheetTaskDetails(
  timesheetData: CreateDailyTimesheetInput,
  timesheetId: string,
  updatedBy: string
): Promise<boolean> {
  const timer = new PerformanceTimer('updateDailyTimesheetTaskDetails');
  
  try {
    const updatedAt = moment().format('YYYY-MM-DD HH:mm:ss');

    logger.info('📝 Updating daily timesheet task details', {
      timesheetId,
      updatedBy,
      totalHours: timesheetData.totalHours,
      operation: 'updateDailyTimesheetTaskDetails'
    });

    const sql = `
      UPDATE employee_timesheets 
      SET 
        taskDetails = ?,
        totalHours = ?,
        taskId = ?,
        customer = ?,
        project = ?,
        manager = ?,
        taskBrief = ?,
        taskStatus = ?,
        responsible = ?,
        plannedStartDate = ?,
        plannedEndDate = ?,
        actualStartDate = ?,
        actualEndDate = ?,
        completionPercentage = ?,
        remarks = ?,
        reasonForDelay = ?,
        taskHours = ?,
        updatedAt = ?,
        updatedBy = ?
      WHERE uuid = ?
    `;

    await sequelize.query(sql, {
      replacements: [
        JSON.stringify(timesheetData.taskDetails),
        timesheetData.totalHours,
        // New task tracking fields
        timesheetData.taskId || null,
        timesheetData.customer || null,
        timesheetData.project || null,
        timesheetData.manager || null,
        timesheetData.taskBrief || null,
        timesheetData.taskStatus || null,
        timesheetData.responsible || null,
        timesheetData.plannedStartDate ? moment(timesheetData.plannedStartDate).format('YYYY-MM-DD') : null,
        timesheetData.plannedEndDate ? moment(timesheetData.plannedEndDate).format('YYYY-MM-DD') : null,
        timesheetData.actualStartDate ? moment(timesheetData.actualStartDate).format('YYYY-MM-DD') : null,
        timesheetData.actualEndDate ? moment(timesheetData.actualEndDate).format('YYYY-MM-DD') : null,
        timesheetData.completionPercentage || null,
        timesheetData.remarks || null,
        timesheetData.reasonForDelay || null,
        timesheetData.taskHours || null,
        updatedAt,
        updatedBy,
        timesheetId
      ],
      type: QueryTypes.UPDATE,
    });

    const duration = timer.end();
    logDatabase('UPDATE_DAILY_TIMESHEET_DETAILS', timesheetId, duration);

    logger.info('✅ Daily timesheet task details updated successfully', {
      timesheetId,
      duration: `${duration}ms`
    });

    return true;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('UPDATE_DAILY_TIMESHEET_DETAILS_ERROR', timesheetId, duration, error);
    
    logger.error('❌ Failed to update daily timesheet task details', {
      timesheetId,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while updating timesheet: ${error.message}`);
  }
}

/**
 * Update Daily Timesheet Approval Status
 * ---------------------------------------
 * Updates approval status when manager/director approves or rejects a daily timesheet
 * Records approver information, comments, and approval date
 * 
 * @param approverId - UUID of the approver
 * @param timesheetId - UUID of the timesheet to update
 * @param comments - Approver comments/feedback
 * @param status - Approval status (APPROVED or REJECTED)
 * @param updatedBy - UUID of user making the update
 * @returns true if successful
 */
export async function updateDailyTimesheetApprovalStatus(
  approverId: string,
  timesheetId: string,
  comments: string,
  status: 'APPROVED' | 'REJECTED',
  updatedBy: string
): Promise<boolean> {
  const timer = new PerformanceTimer('updateDailyTimesheetApprovalStatus');
  
  try {
    const currentDate = moment().format('YYYY-MM-DD');
    const updatedAt = moment().format('YYYY-MM-DD HH:mm:ss');

    logger.info('📝 Updating daily timesheet approval status', {
      timesheetId,
      approverId,
      status,
      operation: 'updateDailyTimesheetApprovalStatus'
    });

    const sql = `
      UPDATE employee_timesheets 
      SET 
        approvalStatus = ?,
        approverComments = ?,
        approvalDate = ?,
        approverId = ?,
        updatedAt = ?,
        updatedBy = ?
      WHERE uuid = ?
    `;

    await sequelize.query(sql, {
      replacements: [
        status,
        comments,
        currentDate,
        approverId,
        updatedAt,
        updatedBy,
        timesheetId
      ],
      type: QueryTypes.UPDATE,
    });

    const duration = timer.end();
    logDatabase('UPDATE_DAILY_TIMESHEET_APPROVAL', timesheetId, duration);

    logger.info('✅ Daily timesheet approval status updated successfully', {
      timesheetId,
      status,
      approverId,
      duration: `${duration}ms`
    });

    return true;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('UPDATE_DAILY_TIMESHEET_APPROVAL_ERROR', timesheetId, duration, error);
    
    logger.error('❌ Failed to update daily timesheet approval status', {
      timesheetId,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while updating timesheet approval: ${error.message}`);
  }
}
