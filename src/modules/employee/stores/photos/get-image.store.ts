/**
 * Get Employee Image Store
 * ========================
 * 
 * Database operations for retrieving employee photo information.
 * Based on: old vodichron getEmployeeImage controller (lines 457-471)
 * 
 * Logic:
 * Fetches employee record to get recentPhotograph field.
 */

import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../../database';
import { logger, logDatabase, PerformanceTimer } from '../../../../utils/logger';

/**
 * Employee Photo Info Interface
 * =============================
 */
export interface EmployeePhotoInfo {
  uuid: string;
  recentPhotograph: string | null;
  name: string;
}

/**
 * Get Employee Photo Info
 * =======================
 * 
 * Fetches employee's photo filename from database.
 * 
 * Old code (line 459): const employeeDetails = await getEmployeeByUuid(params.id);
 * 
 * @param employeeId - Employee UUID
 * @returns Employee photo information
 */
export async function getEmployeePhotoInfo(
  employeeId: string
): Promise<EmployeePhotoInfo | null> {
  // ============================================================================
  // STEP 1: Initialize Performance Timer
  // ============================================================================
  const timer = new PerformanceTimer('getEmployeePhotoInfo');

  try {
    logger.info('🖼️ Fetching employee photo info', {
      employeeId,
      operation: 'getEmployeePhotoInfo'
    });

    // ==========================================================================
    // STEP 2: Query Employee Photo Information
    // ==========================================================================
    const sql = `
      SELECT 
        uuid,
        recentPhotograph,
        name
      FROM employees 
      WHERE uuid = ?
    `;

    const result = await sequelize.query<EmployeePhotoInfo>(sql, {
      replacements: [employeeId],
      type: QueryTypes.SELECT,
      raw: true,
    });

    const duration = timer.end();
    logDatabase('GET_EMPLOYEE_PHOTO_INFO', employeeId, duration);

    if (result.length === 0) {
      logger.warn('❌ Employee not found', {
        employeeId,
        duration: `${duration}ms`
      });
      return null;
    }

    logger.info('✅ Employee photo info fetched successfully', {
      employeeId,
      hasPhoto: !!result[0].recentPhotograph,
      duration: `${duration}ms`
    });

    return result[0];

  } catch (error: any) {
    // ==========================================================================
    // STEP 3: Error Handling
    // ==========================================================================
    const duration = timer.end();
    logDatabase('GET_PHOTO_INFO_ERROR', employeeId, duration, error);

    logger.error('❌ Failed to fetch employee photo info', {
      employeeId,
      error: error.message,
      code: error.code,
      duration: `${duration}ms`,
      stack: error.stack
    });

    // Re-throw error to be handled by service layer
    throw new Error(`Unable to fetch employee photo information: ${error.message}`);
  }
}
