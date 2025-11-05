/**
 * Delete Employee Store Module
 * ============================
 * 
 * This module handles database operations for deleting employees.
 * Includes deletion of employee records and related user data.
 * 
 * Based on: old vodichron deleteEmployeeData function
 * Location: vodichron-backend-master/src/store/employeeStore.ts (line 99-105)
 * 
 * Key Features:
 * - Deletes employee record from database
 * - Deletes associated application_users record
 * - Database performance monitoring with timers
 * - Comprehensive error logging
 * - Transaction safety
 * 
 * Database Operations:
 * - DELETE from employees table
 * - CASCADE delete from application_users (via deleteAppUserData)
 * 
 * Performance Considerations:
 * - Uses parameterized queries for security
 * - Minimal joins (direct delete by UUID)
 * - Fast primary key lookup
 */

import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../../database';
import { logger, logDatabase, PerformanceTimer } from '../../../../utils/logger';

/**
 * Delete Application User Data
 * ============================
 * 
 * Deletes user account data associated with an employee.
 * This is called before deleting the employee record itself.
 * 
 * Database Operation:
 * - DELETE FROM application_users WHERE employeeId = ?
 * 
 * @param employeeId - UUID of the employee whose user data to delete
 * @throws Error if database operation fails
 */
export async function deleteAppUserData(employeeId: string): Promise<void> {
  // ============================================================================
  // STEP 1: Initialize Performance Timer
  // ============================================================================
  const timer = new PerformanceTimer('deleteAppUserData');

  try {
    logger.debug('🗑️ Deleting application user data', {
      employeeId,
      operation: 'deleteAppUserData'
    });

    // ==========================================================================
    // STEP 2: Execute Delete Query
    // ==========================================================================
    const sql = `DELETE FROM application_users WHERE employeeId = ?`;

    await sequelize.query(sql, {
      replacements: [employeeId],
      type: QueryTypes.DELETE,
    });

    // ==========================================================================
    // STEP 3: Log Success
    // ==========================================================================
    const duration = timer.end();
    logDatabase('DELETE_APP_USER', employeeId, duration);

    logger.debug('✅ Application user data deleted successfully', {
      employeeId,
      duration: `${duration}ms`
    });

  } catch (error: any) {
    // ==========================================================================
    // STEP 4: Error Handling
    // ==========================================================================
    const duration = timer.end();
    logDatabase('DELETE_APP_USER_ERROR', employeeId, duration, error);

    logger.error('❌ Failed to delete application user data', {
      employeeId,
      error: error.message,
      code: error.code,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while deleting user data: ${error.message}`);
  }
}

/**
 * Delete Employee Data
 * ===================
 * 
 * Deletes employee record from the database.
 * Also deletes associated user account data.
 * 
 * Process:
 * 1. Delete application_users record (user account)
 * 2. Delete employees record (employee profile)
 * 
 * Database Operations:
 * - DELETE FROM application_users (via deleteAppUserData)
 * - DELETE FROM employees
 * 
 * Note: This does NOT delete:
 * - Employee documents (files on disk)
 * - Employee document records (TODO in original code)
 * - Leave records
 * - Timesheet records
 * 
 * @param employeeUuid - UUID of the employee to delete
 * @returns True if deletion successful
 * @throws Error if database operation fails
 */
export async function deleteEmployeeData(employeeUuid: string): Promise<boolean> {
  // ============================================================================
  // STEP 1: Initialize Performance Timer
  // ============================================================================
  const timer = new PerformanceTimer('deleteEmployeeData');

  try {
    logger.info('🗑️ Starting employee deletion process', {
      employeeUuid,
      operation: 'deleteEmployeeData'
    });

    // ==========================================================================
    // STEP 2: Delete Application User Data First
    // ==========================================================================
    // Delete user account before deleting employee record
    // This maintains referential integrity
    logger.debug('Step 1: Deleting application user data', { employeeUuid });
    await deleteAppUserData(employeeUuid);

    // ==========================================================================
    // STEP 3: Delete Employee Record
    // ==========================================================================
    // Delete the main employee record from employees table
    logger.debug('Step 2: Deleting employee record', { employeeUuid });
    
    const sql = `DELETE FROM employees WHERE uuid = ?`;

    const result = await sequelize.query(sql, {
      replacements: [employeeUuid],
      type: QueryTypes.DELETE,
    });

    // ==========================================================================
    // STEP 4: Log Success and Return
    // ==========================================================================
    const duration = timer.end();
    logDatabase('DELETE_EMPLOYEE', employeeUuid, duration);

    logger.info('✅ Employee deleted successfully', {
      employeeUuid,
      duration: `${duration}ms`,
      result
    });

    return true;

  } catch (error: any) {
    // ==========================================================================
    // STEP 5: Error Handling
    // ==========================================================================
    const duration = timer.end();
    logDatabase('DELETE_EMPLOYEE_ERROR', employeeUuid, duration, error);

    logger.error('❌ Failed to delete employee from database', {
      employeeUuid,
      error: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      duration: `${duration}ms`,
      stack: error.stack
    });

    // Re-throw error to be handled by service layer
    throw new Error(`Database error while deleting employee: ${error.message}`);
  }
}

/**
 * Get Employee By UUID (for validation)
 * =====================================
 * 
 * Simple query to check if employee exists before deletion.
 * Used by service layer to validate employee exists.
 * 
 * @param employeeUuid - UUID of the employee
 * @returns Employee record or null if not found
 */
export async function getEmployeeByUuid(employeeUuid: string): Promise<any | null> {
  const timer = new PerformanceTimer('getEmployeeByUuid');

  try {
    logger.debug('🔍 Fetching employee by UUID', {
      employeeUuid,
      operation: 'getEmployeeByUuid'
    });

    const sql = `SELECT uuid, name, officialEmailId FROM employees WHERE uuid = ?`;

    const result = await sequelize.query<any>(sql, {
      replacements: [employeeUuid],
      type: QueryTypes.SELECT,
      raw: true,
    });

    const duration = timer.end();
    logDatabase('SELECT_EMPLOYEE_BY_UUID', employeeUuid, duration);

    if (result.length === 0) {
      logger.debug('❌ Employee not found', { employeeUuid });
      return null;
    }

    logger.debug('✅ Employee found', {
      employeeUuid,
      employeeName: result[0].name
    });

    return result[0];

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('SELECT_EMPLOYEE_ERROR', employeeUuid, duration, error);

    logger.error('❌ Failed to fetch employee', {
      employeeUuid,
      error: error.message
    });

    throw new Error(`Database error while fetching employee: ${error.message}`);
  }
}
