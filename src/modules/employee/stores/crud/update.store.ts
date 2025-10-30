/**
 * Update Employee Store
 * =====================
 * Database operations for updating employee records
 * Based on old vodichron employeeController.patch (lines 232-300)
 * 
 * Responsibilities:
 * - Fetch existing employee data by UUID
 * - Update employee data in database
 * - Update user password in application_users table
 * - Manage employee activity for first password change
 * - Comprehensive logging and error handling
 */

import { QueryTypes } from 'sequelize';
import moment from 'moment';
import { sequelize } from '../../../../database';
import { logger, logDatabase, PerformanceTimer } from '../../../../utils/logger';
import { UpdateEmployeeInput } from '../../schemas/crud/update.schemas';
import { Employee } from '../../types/employee.types';

/**
 * Get Employee By UUID
 * ====================
 * Fetches an employee record by UUID for validation before update
 * Matches old vodichron employeeStore.getEmployeeByUuid
 * 
 * @param employeeUuid - UUID of the employee to fetch
 * @returns Employee record if found, null otherwise
 */
export async function getEmployeeByUuid(employeeUuid: string): Promise<Employee | null> {
  const timer = new PerformanceTimer('getEmployeeByUuid_update');
  
  try {
    logger.debug('🔍 Fetching employee for update validation', {
      employeeUuid,
      operation: 'getEmployeeByUuid'
    });

    const sql = `
      SELECT * FROM employees
      WHERE uuid = :employeeUuid
      LIMIT 1
    `;

    const result = await sequelize.query<Employee>(sql, {
      replacements: { employeeUuid },
      type: QueryTypes.SELECT,
      raw: true,
    });

    const duration = timer.end();
    logDatabase('GET_EMPLOYEE_BY_UUID', employeeUuid, duration);

    if (result.length > 0) {
      logger.debug('✅ Employee found for update', {
        employeeUuid,
        name: result[0].name,
        duration: `${duration}ms`
      });
      return result[0];
    }

    logger.debug('❌ Employee not found', {
      employeeUuid,
      duration: `${duration}ms`
    });
    return null;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('GET_EMPLOYEE_ERROR', employeeUuid, duration, error);
    
    logger.error('❌ Failed to fetch employee for update', {
      employeeUuid,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while fetching employee: ${error.message}`);
  }
}

/**
 * Update Employee Data
 * ====================
 * Updates employee record in the database
 * Matches old vodichron employeeStore.updateEmployeeData
 * 
 * Process:
 * 1. Format dates (dateOfBirth, dateOfJoining)
 * 2. Build dynamic UPDATE query with only provided fields
 * 3. Execute parameterized query
 * 4. Update updatedAt and updatedBy fields
 * 
 * @param employeeData - Employee data to update (with encrypted sensitive fields)
 * @param updatedBy - UUID of user performing the update
 * @returns void
 */
export async function updateEmployeeData(
  employeeData: UpdateEmployeeInput,
  updatedBy: string
): Promise<void> {
  const timer = new PerformanceTimer('updateEmployeeData');
  
  try {
    logger.info('💾 Updating employee record', {
      employeeUuid: employeeData.uuid,
      updatedBy,
      operation: 'updateEmployeeData'
    });

    // Format dates if provided
    const formattedData: any = { ...employeeData };
    
    if (employeeData.dateOfBirth) {
      formattedData.dateOfBirth = moment(employeeData.dateOfBirth).format('YYYY-MM-DD');
    }
    
    if (employeeData.dateOfJoining) {
      formattedData.dateOfJoining = moment(employeeData.dateOfJoining).format('YYYY-MM-DD');
    }

    // Build SET clause dynamically based on provided fields
    const fieldsToUpdate: string[] = [];
    const replacements: any = {
      uuid: employeeData.uuid,
      updatedBy,
      updatedAt: new Date()
    };

    // List of updatable fields (excluding uuid and password)
    const updateableFields = [
      'name', 'gender', 'dateOfBirth', 'contactNumber', 'personalEmail',
      'bloodGroup', 'maritalStatus', 'permanentAddress', 'temporaryAddress',
      'emergencyContactNumber1Of', 'emergencyContactNumber1',
      'emergencyContactNumber2Of', 'emergencyContactNumber2',
      'employeeId', 'officialEmailId', 'skills', 'dateOfJoining',
      'reportingManagerId', 'reportingDirectorId', 'currentCtc', 'designation',
      'panCardNumber', 'bankAccountNumber', 'ifscCode', 'aadhaarCardNumber',
      'pfAccountNumber', 'bankPassbookImage', 'recentPhotograph',
      'highestEducationalQualification', 'totalWorkExperience', 'department',
      'linkedIn', 'employmentStatus'
    ];

    // Build SET clause
    for (const field of updateableFields) {
      if (formattedData[field] !== undefined) {
        fieldsToUpdate.push(`${field} = :${field}`);
        replacements[field] = formattedData[field];
      }
    }

    // Always update updatedAt and updatedBy
    fieldsToUpdate.push('updatedAt = :updatedAt');
    fieldsToUpdate.push('updatedBy = :updatedBy');

    if (fieldsToUpdate.length === 2) {
      // Only updatedAt and updatedBy, nothing else to update
      logger.warn('⚠️  No fields to update', {
        employeeUuid: employeeData.uuid
      });
      return;
    }

    const sql = `
      UPDATE employees
      SET ${fieldsToUpdate.join(', ')}
      WHERE uuid = :uuid
    `;

    await sequelize.query(sql, {
      replacements,
      type: QueryTypes.UPDATE,
    });

    const duration = timer.end();
    logDatabase('UPDATE_EMPLOYEE', employeeData.uuid, duration);

    logger.info('✅ Employee record updated successfully', {
      employeeUuid: employeeData.uuid,
      updatedFields: Object.keys(replacements).filter(k => k !== 'uuid' && k !== 'updatedBy' && k !== 'updatedAt'),
      duration: `${duration}ms`
    });

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('UPDATE_EMPLOYEE_ERROR', employeeData.uuid, duration, error);
    
    logger.error('❌ Failed to update employee record', {
      employeeUuid: employeeData.uuid,
      updatedBy,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while updating employee: ${error.message}`);
  }
}

/**
 * Update User Password
 * ====================
 * Updates user password in application_users table
 * Matches old vodichron userStore.updateUserPassword
 * 
 * @param userUuid - UUID of the user whose password to update
 * @param encryptedPassword - Hashed password
 * @returns void
 */
export async function updateUserPassword(
  userUuid: string,
  encryptedPassword: string
): Promise<void> {
  const timer = new PerformanceTimer('updateUserPassword');
  
  try {
    logger.info('🔐 Updating user password', {
      userUuid,
      operation: 'updateUserPassword'
    });

    const sql = `
      UPDATE application_users
      SET password = :password,
          updatedAt = :updatedAt
      WHERE uuid = :userUuid
    `;

    await sequelize.query(sql, {
      replacements: {
        password: encryptedPassword,
        updatedAt: new Date(),
        userUuid
      },
      type: QueryTypes.UPDATE,
    });

    const duration = timer.end();
    logDatabase('UPDATE_USER_PASSWORD', userUuid, duration);

    logger.info('✅ User password updated successfully', {
      userUuid,
      duration: `${duration}ms`
    });

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('UPDATE_PASSWORD_ERROR', userUuid, duration, error);
    
    logger.error('❌ Failed to update user password', {
      userUuid,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while updating password: ${error.message}`);
  }
}

/**
 * Get Employee Activity By Employee ID
 * =====================================
 * Checks if an employee activity record exists
 * Used to track first password change activity
 * Matches old vodichron employeeActivity.getEmployeeActivityByEmployeeId
 * 
 * @param employeeUuid - UUID of the employee
 * @param activityType - Type of activity to check
 * @returns Array of activity records (empty if none exist)
 */
export async function getEmployeeActivityByEmployeeId(
  employeeUuid: string,
  activityType: string
): Promise<any[]> {
  const timer = new PerformanceTimer('getEmployeeActivity');
  
  try {
    logger.debug('🔍 Checking employee activity', {
      employeeUuid,
      activityType,
      operation: 'getEmployeeActivity'
    });

    const sql = `
      SELECT * FROM employee_activity
      WHERE employeeId = :employeeUuid
        AND activityType = :activityType
      LIMIT 1
    `;

    const result = await sequelize.query(sql, {
      replacements: { employeeUuid, activityType },
      type: QueryTypes.SELECT,
      raw: true,
    });

    const duration = timer.end();
    logDatabase('GET_EMPLOYEE_ACTIVITY', employeeUuid, duration);

    logger.debug(result.length > 0 ? '✅ Activity found' : '❌ Activity not found', {
      employeeUuid,
      activityType,
      duration: `${duration}ms`
    });

    return result;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('GET_ACTIVITY_ERROR', employeeUuid, duration, error);
    
    logger.error('❌ Failed to fetch employee activity', {
      employeeUuid,
      activityType,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while fetching activity: ${error.message}`);
  }
}

/**
 * Insert Employee Activity
 * ========================
 * Inserts a new employee activity record
 * Used to track first password change
 * Matches old vodichron employeeActivity.insertEmployeeActivity
 * 
 * @param employeeUuid - UUID of the employee
 * @param activityType - Type of activity
 * @param value - Activity data/value
 * @returns void
 */
export async function insertEmployeeActivity(
  employeeUuid: string,
  activityType: string,
  value: any
): Promise<void> {
  const timer = new PerformanceTimer('insertEmployeeActivity');
  
  try {
    logger.info('📝 Inserting employee activity', {
      employeeUuid,
      activityType,
      operation: 'insertEmployeeActivity'
    });

    const sql = `
      INSERT INTO employee_activity (
        employeeId,
        activityType,
        value,
        createdAt
      ) VALUES (
        :employeeUuid,
        :activityType,
        :value,
        :createdAt
      )
    `;

    await sequelize.query(sql, {
      replacements: {
        employeeUuid,
        activityType,
        value: JSON.stringify(value),
        createdAt: new Date()
      },
      type: QueryTypes.INSERT,
    });

    const duration = timer.end();
    logDatabase('INSERT_EMPLOYEE_ACTIVITY', employeeUuid, duration);

    logger.info('✅ Employee activity inserted successfully', {
      employeeUuid,
      activityType,
      duration: `${duration}ms`
    });

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('INSERT_ACTIVITY_ERROR', employeeUuid, duration, error);
    
    logger.error('❌ Failed to insert employee activity', {
      employeeUuid,
      activityType,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while inserting activity: ${error.message}`);
  }
}
