/**
 * Online Status Store
 * ===================
 * Database operations for employee online status
 * Based on old vodichron employeeStore functions
 */

import { QueryTypes } from 'sequelize';
import { sequelize } from '../../database';
import { logger, logDatabase, PerformanceTimer } from '../../utils/logger';
import { OnlineStatus } from '../types/websocket.types';

/**
 * Upsert Employee Online Status
 * ==============================
 * Updates employee's online status in the database
 * 
 * Based on old vodichron: upsertEmployeeOnlineStatusByEmployeeId
 * 
 * @param employeeId - UUID of employee
 * @param status - Online status (ONLINE, OFFLINE, AWAY)
 * @returns void
 */
export async function upsertEmployeeOnlineStatus(
  employeeId: string,
  status: OnlineStatus
): Promise<void> {
  const timer = new PerformanceTimer('upsertEmployeeOnlineStatus');

  try {
    logger.debug('🔄 Upserting employee online status', {
      employeeId,
      status,
      operation: 'upsertEmployeeOnlineStatus'
    });

    // SQL query to update online status
    // Uses COALESCE to handle NULL values properly
    const updateSql = `
      UPDATE employees
      SET 
        "onlineStatus" = :status,
        "updatedAt" = NOW()
      WHERE uuid = :employeeId
    `;

    await sequelize.query(updateSql, {
      replacements: {
        employeeId,
        status
      },
      type: QueryTypes.UPDATE,
    });

    const duration = timer.end();
    logDatabase('UPDATE_EMPLOYEE_ONLINE_STATUS', employeeId, duration);

    logger.info('✅ Employee online status updated', {
      employeeId,
      status,
      duration: `${duration}ms`
    });

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('UPDATE_EMPLOYEE_ONLINE_STATUS_ERROR', employeeId, duration, error);

    logger.error('❌ Failed to update employee online status', {
      employeeId,
      status,
      error: error.message,
      code: error.code,
      duration: `${duration}ms`,
      stack: error.stack
    });

    throw new Error(`Database error while updating online status: ${error.message}`);
  }
}

/**
 * Update User Last Login
 * ======================
 * Updates the last login timestamp for a user
 * Called when user disconnects/logs out
 * 
 * Based on old vodichron: updateUserLastLogin
 * 
 * @param userId - UUID of user
 * @returns void
 */
export async function updateUserLastLogin(userId: string): Promise<void> {
  const timer = new PerformanceTimer('updateUserLastLogin');

  try {
    logger.debug('🔄 Updating user last login', {
      userId,
      operation: 'updateUserLastLogin'
    });

    // SQL query to update last login timestamp
    const updateSql = `
      UPDATE application_users
      SET 
        "lastLogin" = NOW(),
        "updatedAt" = NOW()
      WHERE uuid = :userId
    `;

    await sequelize.query(updateSql, {
      replacements: {
        userId
      },
      type: QueryTypes.UPDATE,
    });

    const duration = timer.end();
    logDatabase('UPDATE_USER_LAST_LOGIN', userId, duration);

    logger.info('✅ User last login updated', {
      userId,
      duration: `${duration}ms`
    });

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('UPDATE_USER_LAST_LOGIN_ERROR', userId, duration, error);

    logger.error('❌ Failed to update user last login', {
      userId,
      error: error.message,
      code: error.code,
      duration: `${duration}ms`,
      stack: error.stack
    });

    throw new Error(`Database error while updating last login: ${error.message}`);
  }
}

/**
 * Get Employee By UUID
 * ====================
 * Fetches basic employee info for validation
 * 
 * @param employeeId - UUID of employee
 * @returns Employee data or null
 */
export async function getEmployeeByUuid(employeeId: string): Promise<{ uuid: string; name: string } | null> {
  const timer = new PerformanceTimer('getEmployeeByUuid');

  try {
    logger.debug('🔍 Fetching employee by UUID', {
      employeeId,
      operation: 'getEmployeeByUuid'
    });

    const selectSql = `
      SELECT uuid, name
      FROM employees
      WHERE uuid = :employeeId
      LIMIT 1
    `;

    const employees = await sequelize.query<{ uuid: string; name: string }>(selectSql, {
      replacements: {
        employeeId
      },
      type: QueryTypes.SELECT,
      raw: true,
    });

    const duration = timer.end();
    logDatabase('GET_EMPLOYEE_BY_UUID', employeeId, duration);

    if (!employees || employees.length === 0) {
      logger.warn('⚠️ Employee not found', {
        employeeId,
        duration: `${duration}ms`
      });
      return null;
    }

    logger.debug('✅ Employee fetched', {
      employeeId,
      duration: `${duration}ms`
    });

    return employees[0];

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('GET_EMPLOYEE_BY_UUID_ERROR', employeeId, duration, error);

    logger.error('❌ Failed to fetch employee', {
      employeeId,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while fetching employee: ${error.message}`);
  }
}
