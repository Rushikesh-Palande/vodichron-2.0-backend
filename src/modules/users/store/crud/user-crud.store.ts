/**
 * User CRUD Store
 * ================
 * Database operations for user CRUD functionality.
 * 
 * Functions:
 * - getUserByEmail - Check if user exists by email
 * - getUserCredsByEmployeeId - Get user with credentials by employeeId
 * - deleteAppUserData - Delete user by employeeId
 * - updateUserPassword - Update user password
 * - updateApplicationUserData - Update user role, password, status
 * 
 * Based on old backend: src/store/userStore.ts
 */

import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../../database';
import User from '../../../../models/user.model';
import { logger, logDatabase, PerformanceTimer } from '../../../../utils/logger';
import { ApplicationUserRoleType } from '../../schemas/crud/update-user.schemas';

/**
 * Application User Interface
 * ==========================
 */
export interface ApplicationUser {
  uuid?: string;
  employeeId: string;
  password: string;
  name?: string;
  officialEmailId?: string;
  role: string;
  status: string;
  lastLogin?: Date | null;
  managerDetail?: string;
  directorDetail?: string;
}

/**
 * Get User By Email
 * =================
 * Checks if user exists by email address.
 * Used for user existence validation.
 * 
 * Based on old backend: getUserByEmail (userStore.ts lines 78-99)
 * 
 * @param email - Official email address
 * @returns User object or null if not found
 */
export async function getUserByEmail(email: string): Promise<ApplicationUser | null> {
  const timer = new PerformanceTimer('DB: getUserByEmail');
  
  try {
    logger.debug('🔍 Checking if user exists by email', {
      email,
      operation: 'getUserByEmail'
    });

    const sql = `
      SELECT 
        employee.uuid, 
        employee.name,
        employee.officialEmailId,
        application_users.role,
        CONCAT(manager.name, " <", manager.officialEmailId, ">") as managerDetail,
        CONCAT(director.name, " <", director.officialEmailId, ">") as directorDetail,
        application_users.status,
        application_users.lastLogin
      FROM 
        employees as employee
        JOIN application_users ON employee.uuid = application_users.employeeId
        LEFT JOIN employees as manager ON employee.reportingManagerId = manager.uuid
        LEFT JOIN employees as director ON employee.reportingDirectorId = director.uuid
      WHERE employee.officialEmailId = ?
    `;

    const result = await sequelize.query<ApplicationUser>(sql, {
      replacements: [email],
      type: QueryTypes.SELECT,
      raw: true
    });

    const duration = timer.end();
    logDatabase('SELECT', 'application_users', duration, undefined, result.length);

    if (result.length > 0) {
      logger.debug('✅ User found by email', {
        email,
        userUuid: result[0].uuid,
        duration: `${duration}ms`
      });
      return result[0];
    }

    logger.debug('⚠️ User not found by email', {
      email,
      duration: `${duration}ms`
    });

    return null;

  } catch (error: any) {
    const duration = timer.end();
    logger.error('❌ getUserByEmail failed', {
      email,
      error: error.message,
      type: 'USER_CRUD_STORE_ERROR'
    });
    logDatabase('SELECT', 'application_users', duration, error);
    throw error;
  }
}

/**
 * Get User Credentials By Employee ID
 * ====================================
 * Fetches user with credentials and employee details.
 * Used for authentication and user updates.
 * 
 * Based on old backend: getUserCredsByEmployeeId (userStore.ts lines 60-76)
 * 
 * @param employeeId - Employee UUID
 * @returns User with credentials
 * @throws Error if user not found
 */
export async function getUserCredsByEmployeeId(employeeId: string): Promise<ApplicationUser> {
  const timer = new PerformanceTimer('DB: getUserCredsByEmployeeId');
  
  try {
    logger.debug('🔍 Fetching user credentials by employeeId', {
      employeeId,
      operation: 'getUserCredsByEmployeeId'
    });

    const sql = `
      SELECT
        application_users.uuid,
        application_users.password,
        application_users.employeeId, 
        employees.name,
        employees.officialEmailId,
        application_users.role,
        application_users.lastLogin,
        application_users.status
      FROM employees 
      JOIN application_users ON employees.uuid = application_users.employeeId
      WHERE employees.uuid = ?
    `;

    const result = await sequelize.query<ApplicationUser>(sql, {
      replacements: [employeeId],
      type: QueryTypes.SELECT,
      raw: true
    });

    const duration = timer.end();
    logDatabase('SELECT', 'application_users', duration, undefined, result.length);

    if (result.length === 0) {
      logger.error('❌ User not found by employeeId', {
        employeeId,
        duration: `${duration}ms`
      });
      throw new Error('Unable to find the user');
    }

    logger.debug('✅ User credentials fetched successfully', {
      employeeId,
      userUuid: result[0].uuid,
      role: result[0].role,
      duration: `${duration}ms`
    });

    return result[0];

  } catch (error: any) {
    const duration = timer.end();
    logger.error('❌ getUserCredsByEmployeeId failed', {
      employeeId,
      error: error.message,
      type: 'USER_CRUD_STORE_ERROR'
    });
    logDatabase('SELECT', 'application_users', duration, error);
    throw error;
  }
}

/**
 * Delete Application User Data
 * =============================
 * Deletes user by employeeId.
 * 
 * Based on old backend: deleteAppUserData (userStore.ts lines 165-169)
 * 
 * @param employeeId - Employee UUID
 * @returns Number of deleted rows
 */
export async function deleteAppUserData(employeeId: string): Promise<number> {
  const timer = new PerformanceTimer('DB: deleteAppUserData');
  
  try {
    logger.info('🗑️ Deleting application user', {
      employeeId,
      operation: 'deleteAppUserData'
    });

    const result = await User.destroy({
      where: { employeeId }
    });

    const duration = timer.end();
    logDatabase('DELETE', 'application_users', duration, undefined, result);

    logger.info('✅ Application user deleted successfully', {
      employeeId,
      deletedCount: result,
      duration: `${duration}ms`
    });

    return result;

  } catch (error: any) {
    const duration = timer.end();
    logger.error('❌ deleteAppUserData failed', {
      employeeId,
      error: error.message,
      type: 'USER_CRUD_STORE_ERROR'
    });
    logDatabase('DELETE', 'application_users', duration, error);
    throw error;
  }
}

/**
 * Update User Password
 * ====================
 * Updates user password by employeeId.
 * 
 * Based on old backend: updateUserPassword (userStore.ts lines 120-124)
 * 
 * @param employeeId - Employee UUID
 * @param hashedPassword - Hashed password (must be pre-hashed!)
 */
export async function updateUserPassword(employeeId: string, hashedPassword: string): Promise<void> {
  const timer = new PerformanceTimer('DB: updateUserPassword');
  
  try {
    logger.info('🔒 Updating user password', {
      employeeId,
      operation: 'updateUserPassword'
    });

    const [affectedRows] = await User.update(
      {
        password: hashedPassword,
        passwordUpdateTimestamp: new Date()
      },
      {
        where: { employeeId }
      }
    );

    const duration = timer.end();
    logDatabase('UPDATE', 'application_users', duration, undefined, affectedRows);

    if (affectedRows === 0) {
      throw new Error('User not found or password not updated');
    }

    logger.info('✅ User password updated successfully', {
      employeeId,
      duration: `${duration}ms`
    });

  } catch (error: any) {
    const duration = timer.end();
    logger.error('❌ updateUserPassword failed', {
      employeeId,
      error: error.message,
      type: 'USER_CRUD_STORE_ERROR'
    });
    logDatabase('UPDATE', 'application_users', duration, error);
    throw error;
  }
}

/**
 * Update Application User Data
 * =============================
 * Updates user role, password, and status.
 * 
 * Based on old backend: updateApplicationUserData (userStore.ts lines 214-242)
 * 
 * @param userData - User data to update
 * @param updatedBy - UUID of user making the update
 */
export async function updateApplicationUserData(
  userData: {
    employeeId: string;
    password: string;
    role: ApplicationUserRoleType;
    status?: string;
  },
  updatedBy: string
): Promise<void> {
  const timer = new PerformanceTimer('DB: updateApplicationUserData');
  
  try {
    logger.info('✏️ Updating application user data', {
      employeeId: userData.employeeId,
      role: userData.role,
      hasStatus: !!userData.status,
      operation: 'updateApplicationUserData'
    });

    const updateData: any = {
      role: userData.role,
      password: userData.password,
      updatedBy,
      updatedAt: new Date()
    };

    if (userData.status) {
      updateData.status = userData.status;
    }

    const [affectedRows] = await User.update(updateData, {
      where: { employeeId: userData.employeeId }
    });

    const duration = timer.end();
    logDatabase('UPDATE', 'application_users', duration, undefined, affectedRows);

    if (affectedRows === 0) {
      throw new Error('User not found or no changes made');
    }

    logger.info('✅ Application user data updated successfully', {
      employeeId: userData.employeeId,
      role: userData.role,
      duration: `${duration}ms`
    });

  } catch (error: any) {
    const duration = timer.end();
    logger.error('❌ updateApplicationUserData failed', {
      employeeId: userData.employeeId,
      error: error.message,
      type: 'USER_CRUD_STORE_ERROR'
    });
    logDatabase('UPDATE', 'application_users', duration, error);
    throw error;
  }
}
