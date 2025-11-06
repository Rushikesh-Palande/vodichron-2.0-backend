/**
 * Employee Activity Store
 * ========================
 * Database operations for tracking employee application activities.
 * 
 * Based on old backend: src/store/employeeActivity.ts
 * 
 * Activities tracked:
 * - FIRST_PASSWORD_CHANGE
 * - Other user milestones
 */

import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../../database';
import { logger, logDatabase, PerformanceTimer } from '../../../../utils/logger';

export interface EmployeeActivity {
  uuid: string;
  employeeId: string;
  activityName: string;
  value: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Get Employee Activity By Employee ID and Activity Name
 * =======================================================
 * Fetches specific activity for an employee.
 * 
 * Based on old backend: getEmployeeActivityByEmployeeId (employeeActivity.ts lines 13-17)
 */
export async function getEmployeeActivityByEmployeeId(
  employeeId: string,
  activityName: string
): Promise<EmployeeActivity[]> {
  const timer = new PerformanceTimer('DB: getEmployeeActivityByEmployeeId');
  
  try {
    logger.debug('🔍 Fetching employee activity', {
      employeeId,
      activityName,
      operation: 'getEmployeeActivityByEmployeeId'
    });

    const sql = `
      SELECT uuid, employeeId, activityName, value 
      FROM employee_application_activities 
      WHERE employeeId = ? AND activityName = ?
    `;

    const result = await sequelize.query<EmployeeActivity>(sql, {
      replacements: [employeeId, activityName],
      type: QueryTypes.SELECT,
      raw: true
    });

    const duration = timer.end();
    logDatabase('SELECT', 'employee_application_activities', duration, undefined, result.length);

    logger.debug('✅ Employee activity fetched', {
      employeeId,
      activityName,
      found: result.length > 0,
      duration: `${duration}ms`
    });

    return result;

  } catch (error: any) {
    const duration = timer.end();
    logger.error('❌ getEmployeeActivityByEmployeeId failed', {
      employeeId,
      activityName,
      error: error.message
    });
    logDatabase('SELECT', 'employee_application_activities', duration, error);
    throw error;
  }
}

/**
 * Insert Employee Activity
 * =========================
 * Creates a new activity record for an employee.
 * 
 * Based on old backend: insertEmployeeActivity (employeeActivity.ts lines 19-37)
 */
export async function insertEmployeeActivity(
  employeeId: string,
  activityName: string,
  value: any
): Promise<string> {
  const timer = new PerformanceTimer('DB: insertEmployeeActivity');
  
  try {
    logger.info('➕ Inserting employee activity', {
      employeeId,
      activityName,
      operation: 'insertEmployeeActivity'
    });

    const sql = `
      INSERT INTO employee_application_activities (
        uuid,
        employeeId,
        activityName,
        value,
        createdAt
      ) VALUES (UUID(), ?, ?, ?, NOW())
    `;

    const valueStr = typeof value === 'string' ? value : JSON.stringify(value);

    await sequelize.query(sql, {
      replacements: [employeeId, activityName, valueStr],
      type: QueryTypes.INSERT
    });

    const duration = timer.end();
    logDatabase('INSERT', 'employee_application_activities', duration, undefined, 1);

    logger.info('✅ Employee activity inserted successfully', {
      employeeId,
      activityName,
      duration: `${duration}ms`
    });

    return 'success';

  } catch (error: any) {
    const duration = timer.end();
    logger.error('❌ insertEmployeeActivity failed', {
      employeeId,
      activityName,
      error: error.message
    });
    logDatabase('INSERT', 'employee_application_activities', duration, error);
    throw error;
  }
}

/**
 * Update Employee Activity By Activity ID
 * =========================================
 * Updates an existing activity record.
 * 
 * Based on old backend: updateEmployeeActivityByActivityId (employeeActivity.ts lines 39-51)
 */
export async function updateEmployeeActivityByActivityId(
  activityId: string,
  value: any
): Promise<void> {
  const timer = new PerformanceTimer('DB: updateEmployeeActivityByActivityId');
  
  try {
    logger.info('✏️ Updating employee activity', {
      activityId,
      operation: 'updateEmployeeActivityByActivityId'
    });

    const sql = `
      UPDATE employee_application_activities
      SET value = ?, updatedAt = NOW()
      WHERE uuid = ?
    `;

    const valueStr = typeof value === 'string' ? value : JSON.stringify(value);

    const [result] = await sequelize.query(sql, {
      replacements: [valueStr, activityId],
      type: QueryTypes.UPDATE
    });

    const duration = timer.end();
    logDatabase('UPDATE', 'employee_application_activities', duration, undefined, (result as any)?.affectedRows || 1);

    logger.info('✅ Employee activity updated successfully', {
      activityId,
      duration: `${duration}ms`
    });

  } catch (error: any) {
    const duration = timer.end();
    logger.error('❌ updateEmployeeActivityByActivityId failed', {
      activityId,
      error: error.message
    });
    logDatabase('UPDATE', 'employee_application_activities', duration, error);
    throw error;
  }
}
