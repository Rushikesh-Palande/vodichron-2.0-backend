/**
 * Get Employee Task Count Store
 * ==============================
 * Database operation to count total tasks submitted by an employee
 * across both daily and weekly timesheets
 */

import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../database';
import { logger, logDatabase, PerformanceTimer } from '../../../utils/logger';

/**
 * Get Employee Task Count
 * -----------------------
 * Counts the total number of tasks an employee has submitted
 * across all daily and weekly timesheets (both approved and pending)
 * 
 * This is used to generate sequential task IDs (TASK001, TASK002, etc.)
 * 
 * @param employeeId - UUID of the employee
 * @returns Total count of tasks submitted by the employee
 * 
 * @example
 * const taskCount = await getEmployeeTaskCount('employee-uuid');
 * // Returns: 19 (next task ID would be TASK020)
 */
export async function getEmployeeTaskCount(employeeId: string): Promise<number> {
  const timer = new PerformanceTimer('getEmployeeTaskCount');
  
  try {
    logger.debug('🔢 Counting employee tasks', {
      employeeId,
      operation: 'getEmployeeTaskCount'
    });

    // Find the highest task number from both daily and weekly timesheets
    // Extract number from taskId column (e.g., "TASK096" -> 96) for this specific employee
    const sql = `
      SELECT 
        GREATEST(
          COALESCE(
            (SELECT MAX(CAST(SUBSTRING(taskId, 5) AS UNSIGNED)) 
             FROM employee_timesheets 
             WHERE employeeId = ? AND taskId IS NOT NULL AND taskId LIKE 'TASK%'), 0
          ),
          COALESCE(
            (SELECT MAX(CAST(SUBSTRING(taskId, 5) AS UNSIGNED)) 
             FROM employee_weekly_timesheets 
             WHERE employeeId = ? AND taskId IS NOT NULL AND taskId LIKE 'TASK%'), 0
          )
        ) as totalTaskCount
    `;
    
    const result = await sequelize.query<{ totalTaskCount: number }>(sql, {
      replacements: [employeeId, employeeId],
      type: QueryTypes.SELECT,
      raw: true,
    });

    const taskCount = Number(result[0]?.totalTaskCount) || 0;
    
    const duration = timer.end();
    logDatabase('GET_EMPLOYEE_TASK_COUNT', employeeId, duration);

    logger.debug('✅ Employee task count retrieved', {
      employeeId,
      taskCount,
      duration: `${duration}ms`
    });

    return taskCount;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('GET_EMPLOYEE_TASK_COUNT_ERROR', employeeId, duration, error);
    
    logger.error('❌ Failed to count employee tasks', {
      employeeId,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while counting tasks: ${error.message}`);
  }
}

/**
 * Get Employee Task Count by Date Range
 * --------------------------------------
 * Counts tasks submitted by an employee within a specific date range
 * Useful for reporting or analytics
 * 
 * @param employeeId - UUID of the employee
 * @param startDate - Start date (YYYY-MM-DD format)
 * @param endDate - End date (YYYY-MM-DD format)
 * @returns Total count of tasks in the date range
 * 
 * @example
 * const count = await getEmployeeTaskCountByDateRange(
 *   'employee-uuid',
 *   '2024-01-01',
 *   '2024-01-31'
 * );
 * // Returns: 10 (tasks submitted in January 2024)
 */
export async function getEmployeeTaskCountByDateRange(
  employeeId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  const timer = new PerformanceTimer('getEmployeeTaskCountByDateRange');
  
  try {
    logger.debug('🔢 Counting employee tasks by date range', {
      employeeId,
      startDate,
      endDate,
      operation: 'getEmployeeTaskCountByDateRange'
    });

    const sql = `
      SELECT 
        (
          SELECT COUNT(*) 
          FROM employee_timesheets 
          WHERE employeeId = ? 
            AND timesheetDate BETWEEN ? AND ?
        ) + (
          SELECT COUNT(*) 
          FROM employee_weekly_timesheets 
          WHERE employeeId = ? 
            AND weekStartDate >= ? 
            AND weekEndDate <= ?
        ) as totalTaskCount
    `;
    
    const result = await sequelize.query<{ totalTaskCount: number }>(sql, {
      replacements: [employeeId, startDate, endDate, employeeId, startDate, endDate],
      type: QueryTypes.SELECT,
      raw: true,
    });

    const taskCount = result[0]?.totalTaskCount || 0;
    
    const duration = timer.end();
    logDatabase('GET_EMPLOYEE_TASK_COUNT_BY_DATE', employeeId, duration);

    logger.debug('✅ Employee task count by date retrieved', {
      employeeId,
      startDate,
      endDate,
      taskCount,
      duration: `${duration}ms`
    });

    return taskCount;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('GET_EMPLOYEE_TASK_COUNT_BY_DATE_ERROR', employeeId, duration, error);
    
    logger.error('❌ Failed to count employee tasks by date', {
      employeeId,
      startDate,
      endDate,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while counting tasks by date: ${error.message}`);
  }
}
