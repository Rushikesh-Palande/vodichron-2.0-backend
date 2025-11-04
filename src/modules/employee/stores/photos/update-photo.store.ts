/**
 * Update Photo Store
 * ==================
 * 
 * Database operations for employee photo update.
 * Based on: old vodichron updateEmployeePhoto (employeeStore.ts lines 458-474)
 * 
 * Logic:
 * Updates the recentPhotograph field in employees table.
 */

import moment from 'moment';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../../database';
import { logger, logDatabase, PerformanceTimer } from '../../../../utils/logger';

/**
 * Update Employee Photo
 * =====================
 * 
 * Updates the recentPhotograph field for the specified employee.
 * 
 * EXACT SQL from old code (lines 462-468):
 * ```sql
 * UPDATE employees SET 
 *   recentPhotograph = ?,
 *   updatedBy = ?,
 *   updatedAt = ?
 * WHERE uuid = ?
 * ```
 * 
 * @param fileName - New photo file name/path
 * @param loggedInUserId - Employee UUID (both for WHERE clause and updatedBy)
 * @returns Update result
 */
export async function updateEmployeePhoto(
  fileName: string,
  loggedInUserId: string
): Promise<void> {
  // ============================================================================
  // STEP 1: Initialize Performance Timer
  // ============================================================================
  const timer = new PerformanceTimer('updateEmployeePhoto');

  try {
    logger.info('📷 Updating employee photo', {
      userId: loggedInUserId,
      fileName,
      operation: 'updateEmployeePhoto'
    });

    // ==========================================================================
    // STEP 2: Prepare Current DateTime
    // ==========================================================================
    const currentDateTime = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');

    // ==========================================================================
    // STEP 3: Update Employee Photo
    // ==========================================================================
    // Matches old code lines 462-468
    const sql = `UPDATE employees SET 
                    recentPhotograph = ?,
                    updatedBy = ?,
                    updatedAt = ?
                WHERE uuid = ?`;
    
    const values = [fileName, loggedInUserId, currentDateTime, loggedInUserId];

    await sequelize.query(sql, {
      replacements: values,
      type: QueryTypes.UPDATE,
    });

    const duration = timer.end();
    logDatabase('UPDATE_EMPLOYEE_PHOTO', loggedInUserId, duration);

    logger.info('✅ Employee photo updated successfully', {
      userId: loggedInUserId,
      fileName,
      duration: `${duration}ms`
    });

  } catch (error: any) {
    // ==========================================================================
    // STEP 4: Error Handling
    // ==========================================================================
    const duration = timer.end();
    logDatabase('UPDATE_PHOTO_ERROR', loggedInUserId, duration, error);

    logger.error('❌ Failed to update employee photo', {
      userId: loggedInUserId,
      fileName,
      error: error.message,
      code: error.code,
      duration: `${duration}ms`,
      stack: error.stack
    });

    // Re-throw error to be handled by service layer
    throw new Error(`Unable to update employee photo at the moment, please try again after some time.`);
  }
}
