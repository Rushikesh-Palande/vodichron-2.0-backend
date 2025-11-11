/**
 * Weekly Timesheet Store - Create Operations
 * ===========================================
 * Database operations for creating weekly timesheets
 * 
 * Based on old vodichron employeeWeeklyTimesheet.ts store
 */

import { QueryTypes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import { sequelize } from '../../../../database';
import { logger, logDatabase, PerformanceTimer } from '../../../../utils/logger';
import { CreateWeeklyTimesheetInput, WeeklyTimesheet, WeeklyTaskEntry } from '../../types/timesheet.types';
import { generateRequestNumber } from '../../helpers/generate-request-number';

/**
 * Add UUIDs to Task Cells
 * ------------------------
 * Adds UUID to each task cell if not already present
 * Used for the task locking mechanism
 * 
 * @param taskDetails - Array of weekly task entries
 * @returns Updated task details with UUIDs
 */
export function addTaskUuids(taskDetails: WeeklyTaskEntry[]): WeeklyTaskEntry[] {
  const updatedTaskDetails: WeeklyTaskEntry[] = [];
  
  for (const timesheetEntry of taskDetails) {
    const keys = Object.keys(timesheetEntry);
    
    for (const key of keys) {
      const cell = timesheetEntry[key];
      if (cell && typeof cell === 'object' && 'value' in cell) {
        if (!cell.uuid) {
          (timesheetEntry[key] as any) = {
            ...cell,
            uuid: uuidv4(),
          };
        }
      }
    }
    
    updatedTaskDetails.push(timesheetEntry);
  }
  
  return updatedTaskDetails;
}

/**
 * Check Weekly Timesheet Overlap
 * -------------------------------
 * Checks if a weekly timesheet already exists for the given week and employee
 * 
 * @param weekStartDate - Start date of the week (YYYY-MM-DD)
 * @param employeeId - UUID of the employee
 * @returns Existing timesheet record or false
 */
export async function checkWeeklyTimesheetOverlap(
  weekStartDate: string,
  employeeId: string
): Promise<WeeklyTimesheet | false> {
  const timer = new PerformanceTimer('checkWeeklyTimesheetOverlap');
  
  try {
    logger.debug('🔍 Checking weekly timesheet overlap', {
      weekStartDate,
      employeeId,
      operation: 'checkWeeklyTimesheetOverlap'
    });

    const formattedDate = moment(weekStartDate).format('YYYY-MM-DD');

    const sql = `
      SELECT * FROM employee_weekly_timesheets 
      WHERE weekStartDate = :weekStartDate 
        AND employeeId = :employeeId
      LIMIT 1
    `;

    const result = await sequelize.query<WeeklyTimesheet>(sql, {
      replacements: { weekStartDate: formattedDate, employeeId },
      type: QueryTypes.SELECT,
      raw: true,
    });

    const duration = timer.end();
    logDatabase('CHECK_WEEKLY_TIMESHEET_OVERLAP', employeeId, duration);

    if (result.length > 0) {
      logger.debug('✅ Weekly timesheet overlap found', {
        weekStartDate: formattedDate,
        employeeId,
        timesheetId: result[0].uuid,
        duration: `${duration}ms`
      });
      return result[0];
    }

    logger.debug('❌ No overlap found', {
      weekStartDate: formattedDate,
      employeeId,
      duration: `${duration}ms`
    });

    return false;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('CHECK_WEEKLY_TIMESHEET_OVERLAP_ERROR', employeeId, duration, error);
    
    logger.error('❌ Failed to check weekly timesheet overlap', {
      weekStartDate,
      employeeId,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while checking timesheet overlap: ${error.message}`);
  }
}

/**
| * Insert Weekly Timesheet
| * ------------------------
| * Inserts a new weekly timesheet record into the database
| * 
| * @param timesheetData - Weekly timesheet data to insert
| * @param createdBy - UUID of user creating the timesheet
| * @returns UUID of the newly created timesheet
| */
export async function insertWeeklyTimesheet(
  timesheetData: CreateWeeklyTimesheetInput,
  createdBy: string
): Promise<string> {
  const timer = new PerformanceTimer('insertWeeklyTimesheet');
  
  try {
    const uuid = uuidv4();
    const requestNumber = generateRequestNumber(6);
    const weekStartDate = moment(timesheetData.weekStartDate).format('YYYY-MM-DD');
    const weekEndDate = moment(timesheetData.weekEndDate).format('YYYY-MM-DD');
    const now = moment().format('YYYY-MM-DD HH:mm:ss');

    // Determine approval status based on timesheet status
    let approvalStatus = null;
    if (timesheetData.timeSheetStatus === 'REQUESTED') {
      approvalStatus = 'REQUESTED';
    }

    logger.info('📝 Inserting weekly timesheet', {
      employeeId: timesheetData.employeeId,
      weekStartDate,
      weekEndDate,
      requestNumber,
      timeSheetStatus: timesheetData.timeSheetStatus,
      createdBy,
      operation: 'insertWeeklyTimesheet'
    });

    const sql = `
      INSERT INTO employee_weekly_timesheets (
        uuid,
        employeeId,
        requestNumber,
        weekStartDate,
        weekEndDate,
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
        approvalStatus,
        timeSheetStatus,
        createdAt,
        createdBy,
        updatedBy
      ) VALUES (
        :uuid,
        :employeeId,
        :requestNumber,
        :weekStartDate,
        :weekEndDate,
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
        :approvalStatus,
        :timeSheetStatus,
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
        weekStartDate,
        weekEndDate,
        taskDetails: JSON.stringify(timesheetData.taskDetails),
        totalHours: timesheetData.totalHours,
        approvalStatus,
        timeSheetStatus: timesheetData.timeSheetStatus,
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
        createdAt: now,
        createdBy,
        updatedBy: createdBy,
      },
      type: QueryTypes.INSERT,
    });

    const duration = timer.end();
    logDatabase('INSERT_WEEKLY_TIMESHEET', uuid, duration);

    logger.info('✅ Weekly timesheet created successfully', {
      uuid,
      requestNumber,
      employeeId: timesheetData.employeeId,
      weekStartDate,
      duration: `${duration}ms`
    });

    return uuid;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('INSERT_WEEKLY_TIMESHEET_ERROR', 'new_timesheet', duration, error);
    
    logger.error('❌ Failed to insert weekly timesheet', {
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
