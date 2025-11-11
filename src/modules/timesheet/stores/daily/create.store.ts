/**
 * Daily Timesheet Store - Create Operations
 * ==========================================
 * Database operations for creating daily timesheets
 * 
 * Based on old vodichron employeeTimesheet.ts store
 * Updated with new Sequelize pattern and comprehensive logging
 */

import { QueryTypes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import { sequelize } from '../../../../database';
import { logger, logDatabase, PerformanceTimer } from '../../../../utils/logger';
import { CreateDailyTimesheetInput, DailyTimesheet } from '../../types/timesheet.types';
import { generateRequestNumber } from '../../helpers/generate-request-number';

/**
 * Check Daily Timesheet Overlap
 * ------------------------------
 * Checks if a timesheet already exists for the given date and employee
 * Prevents duplicate timesheet submissions for the same date
 * 
 * @param timesheetDate - Date for the timesheet (YYYY-MM-DD)
 * @param employeeId - UUID of the employee
 * @returns true if timesheet exists with APPROVED or REQUESTED status, false otherwise
 */
export async function checkDailyTimesheetOverlap(
  timesheetDate: string,
  employeeId: string
): Promise<boolean> {
  const timer = new PerformanceTimer('checkDailyTimesheetOverlap');
  
  try {
    logger.debug('🔍 Checking daily timesheet overlap', {
      timesheetDate,
      employeeId,
      operation: 'checkDailyTimesheetOverlap'
    });

    const formattedDate = moment(timesheetDate).format('YYYY-MM-DD');

    const sql = `
      SELECT * FROM employee_timesheets 
      WHERE timesheetDate = :timesheetDate 
        AND (approvalStatus = 'APPROVED' OR approvalStatus = 'REQUESTED') 
        AND employeeId = :employeeId
      LIMIT 1
    `;

    const result = await sequelize.query<DailyTimesheet>(sql, {
      replacements: { timesheetDate: formattedDate, employeeId },
      type: QueryTypes.SELECT,
      raw: true,
    });

    const duration = timer.end();
    logDatabase('CHECK_DAILY_TIMESHEET_OVERLAP', employeeId, duration);

    const exists = result.length > 0;

    logger.debug(exists ? '✅ Daily timesheet overlap found' : '❌ No overlap found', {
      timesheetDate: formattedDate,
      employeeId,
      exists,
      duration: `${duration}ms`
    });

    return exists;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('CHECK_DAILY_TIMESHEET_OVERLAP_ERROR', employeeId, duration, error);
    
    logger.error('❌ Failed to check daily timesheet overlap', {
      timesheetDate,
      employeeId,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while checking timesheet overlap: ${error.message}`);
  }
}

/**
 * Insert Daily Timesheet
 * -----------------------
 * Inserts a new daily timesheet record into the database
 * 
 * @param timesheetData - Daily timesheet data to insert
 * @param createdBy - UUID of user creating the timesheet
 * @returns UUID of the newly created timesheet
 */
export async function insertDailyTimesheet(
  timesheetData: CreateDailyTimesheetInput,
  createdBy: string
): Promise<string> {
  const timer = new PerformanceTimer('insertDailyTimesheet');
  
  try {
    const uuid = uuidv4();
    const requestNumber = generateRequestNumber(6);
    const formattedDate = moment(timesheetData.timesheetDate).format('YYYY-MM-DD');
    const now = moment().format('YYYY-MM-DD HH:mm:ss');

    logger.info('📝 Inserting daily timesheet', {
      employeeId: timesheetData.employeeId,
      timesheetDate: formattedDate,
      requestNumber,
      createdBy,
      operation: 'insertDailyTimesheet'
    });

    const sql = `
      INSERT INTO employee_timesheets (
        uuid,
        requestNumber,
        employeeId,
        timesheetDate,
        taskId,
        customer,
        project,
        manager,
        taskBrief,
        taskStatus,
        responsible,
        plannedStartDate,
        plannedEndDate,
        actualStartDate,
        actualEndDate,
        completionPercentage,
        remarks,
        reasonForDelay,
        taskHours,
        taskDetails,
        totalHours,
        createdAt,
        createdBy,
        updatedBy
      ) VALUES (
        :uuid,
        :requestNumber,
        :employeeId,
        :timesheetDate,
        :taskId,
        :customer,
        :project,
        :manager,
        :taskBrief,
        :taskStatus,
        :responsible,
        :plannedStartDate,
        :plannedEndDate,
        :actualStartDate,
        :actualEndDate,
        :completionPercentage,
        :remarks,
        :reasonForDelay,
        :taskHours,
        :taskDetails,
        :totalHours,
        :createdAt,
        :createdBy,
        :updatedBy
      )
    `;

    await sequelize.query(sql, {
      replacements: {
        uuid,
        requestNumber,
        employeeId: timesheetData.employeeId,
        timesheetDate: formattedDate,
        // New task tracking fields
        taskId: timesheetData.taskId || null,
        customer: timesheetData.customer || null,
        project: timesheetData.project || null,
        manager: timesheetData.manager || null,
        taskBrief: timesheetData.taskBrief || null,
        taskStatus: timesheetData.taskStatus || null,
        responsible: timesheetData.responsible || null,
        plannedStartDate: timesheetData.plannedStartDate ? moment(timesheetData.plannedStartDate).format('YYYY-MM-DD') : null,
        plannedEndDate: timesheetData.plannedEndDate ? moment(timesheetData.plannedEndDate).format('YYYY-MM-DD') : null,
        actualStartDate: timesheetData.actualStartDate ? moment(timesheetData.actualStartDate).format('YYYY-MM-DD') : null,
        actualEndDate: timesheetData.actualEndDate ? moment(timesheetData.actualEndDate).format('YYYY-MM-DD') : null,
        completionPercentage: timesheetData.completionPercentage || null,
        remarks: timesheetData.remarks || null,
        reasonForDelay: timesheetData.reasonForDelay || null,
        taskHours: timesheetData.taskHours || null,
        // Legacy fields
        taskDetails: JSON.stringify(timesheetData.taskDetails),
        totalHours: timesheetData.totalHours,
        // Audit fields
        createdAt: now,
        createdBy,
        updatedBy: createdBy,
      },
      type: QueryTypes.INSERT,
    });

    const duration = timer.end();
    logDatabase('INSERT_DAILY_TIMESHEET', uuid, duration);

    logger.info('✅ Daily timesheet created successfully', {
      uuid,
      requestNumber,
      employeeId: timesheetData.employeeId,
      timesheetDate: formattedDate,
      duration: `${duration}ms`
    });

    return uuid;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('INSERT_DAILY_TIMESHEET_ERROR', 'new_timesheet', duration, error);
    
    logger.error('❌ Failed to insert daily timesheet', {
      employeeId: timesheetData.employeeId,
      error: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while creating timesheet: ${error.message}`);
  }
}
