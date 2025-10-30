/**
 * Create Employee Store
 * =====================
 * Database operations for creating new employee records
 * 
 * Responsibilities:
 * - Insert employee data into database
 * - Check for duplicate emails (personal and official)
 * - Generate UUID for new employee
 * - Handle date formatting
 * - Comprehensive logging and error handling
 */

import { QueryTypes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import { sequelize } from '../../../../database';
import { logger, logDatabase, PerformanceTimer } from '../../../../utils/logger';
import { CreateEmployeeInput } from '../../schemas/crud/create.schemas';

/**
 * Check if Employee ID Exists
 * ============================
 * Checks if an employee ID already exists in the database
 * Used for real-time validation before creating new employee
 * 
 * @param employeeId - Employee ID to check
 * @returns Employee record if exists, null otherwise
 */
export async function checkEmployeeIdExists(
  employeeId: string
): Promise<{ uuid: string; name: string } | null> {
  const timer = new PerformanceTimer('checkEmployeeIdExists');
  
  try {
    logger.debug('🔍 Checking if employee ID exists', {
      employeeId,
      operation: 'checkEmployeeIdExists'
    });

    const sql = `
      SELECT uuid, name, employeeId
      FROM employees
      WHERE employeeId = :employeeId
      LIMIT 1
    `;

    const result = await sequelize.query<{ uuid: string; name: string }>(sql, {
      replacements: { employeeId },
      type: QueryTypes.SELECT,
      raw: true,
    });

    const duration = timer.end();
    logDatabase('CHECK_EMPLOYEE_ID', employeeId, duration);

    if (result.length > 0) {
      logger.debug('✅ Employee ID found', {
        employeeId,
        employeeUuid: result[0].uuid,
        duration: `${duration}ms`
      });
      return result[0];
    }

    logger.debug('❌ Employee ID not found', {
      employeeId,
      duration: `${duration}ms`
    });
    return null;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('CHECK_EMPLOYEE_ID_ERROR', employeeId, duration, error);
    
    logger.error('❌ Failed to check employee ID', {
      employeeId,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while checking employee ID: ${error.message}`);
  }
}

/**
 * Check if Employee Email Exists
 * ===============================
 * Checks if an email already exists in the database
 * Used for validation before creating new employee
 * 
 * @param email - Email to check
 * @param emailType - Type of email ('personalEmail' or 'officialEmailId')
 * @returns Employee record if exists, null otherwise
 */
export async function checkEmployeeEmailExists(
  email: string,
  emailType: 'personalEmail' | 'officialEmailId'
): Promise<{ uuid: string; name: string } | null> {
  const timer = new PerformanceTimer('checkEmployeeEmailExists');
  
  try {
    logger.debug('🔍 Checking if employee email exists', {
      email,
      emailType,
      operation: 'checkEmployeeEmailExists'
    });

    const sql = `
      SELECT uuid, name, ${emailType}
      FROM employees
      WHERE ${emailType} = :email
      LIMIT 1
    `;

    const result = await sequelize.query<{ uuid: string; name: string }>(sql, {
      replacements: { email },
      type: QueryTypes.SELECT,
      raw: true,
    });

    const duration = timer.end();
    logDatabase('CHECK_EMPLOYEE_EMAIL', email, duration);

    if (result.length > 0) {
      logger.debug('✅ Employee email found', {
        email,
        employeeUuid: result[0].uuid,
        duration: `${duration}ms`
      });
      return result[0];
    }

    logger.debug('❌ Employee email not found', {
      email,
      duration: `${duration}ms`
    });
    return null;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('CHECK_EMAIL_ERROR', email, duration, error);
    
    logger.error('❌ Failed to check employee email', {
      email,
      emailType,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while checking email: ${error.message}`);
  }
}

/**
 * Insert Employee
 * ===============
 * Inserts a new employee record into the database
 * 
 * Process:
 * 1. Generate UUID for new employee
 * 2. Format dates (dateOfBirth, dateOfJoining)
 * 3. Build INSERT query with all fields
 * 4. Execute query with parameterized values
 * 5. Return the generated UUID
 * 
 * @param employeeData - Employee data to insert
 * @param createdBy - UUID of user creating the employee
 * @returns UUID of the newly created employee
 */
export async function insertEmployee(
  employeeData: CreateEmployeeInput,
  createdBy: string
): Promise<string> {
  const timer = new PerformanceTimer('insertEmployee');
  
  try {
    // Generate UUID for new employee
    const employeeUuid = uuidv4();

    logger.info('📝 Inserting new employee', {
      employeeId: employeeData.employeeId,
      name: employeeData.name,
      createdBy,
      operation: 'insertEmployee'
    });

    // Format dates
    const formattedDateOfBirth = employeeData.dateOfBirth 
      ? moment(employeeData.dateOfBirth).format('YYYY-MM-DD')
      : null;
    
    const formattedDateOfJoining = moment(employeeData.dateOfJoining).format('YYYY-MM-DD');

    // Build INSERT SQL
    const sql = `
      INSERT INTO employees (
        uuid,
        name,
        gender,
        dateOfBirth,
        contactNumber,
        personalEmail,
        bloodGroup,
        maritalStatus,
        permanentAddress,
        temporaryAddress,
        emergencyContactNumber1Of,
        emergencyContactNumber1,
        emergencyContactNumber2Of,
        emergencyContactNumber2,
        employeeId,
        officialEmailId,
        skills,
        dateOfJoining,
        reportingManagerId,
        reportingDirectorId,
        currentCtc,
        designation,
        panCardNumber,
        bankAccountNumber,
        ifscCode,
        aadhaarCardNumber,
        pfAccountNumber,
        bankPassbookImage,
        recentPhotograph,
        highestEducationalQualification,
        totalWorkExperience,
        department,
        linkedIn,
        employmentStatus,
        createdAt,
        createdBy,
        updatedBy
      ) VALUES (
        :uuid,
        :name,
        :gender,
        :dateOfBirth,
        :contactNumber,
        :personalEmail,
        :bloodGroup,
        :maritalStatus,
        :permanentAddress,
        :temporaryAddress,
        :emergencyContactNumber1Of,
        :emergencyContactNumber1,
        :emergencyContactNumber2Of,
        :emergencyContactNumber2,
        :employeeId,
        :officialEmailId,
        :skills,
        :dateOfJoining,
        :reportingManagerId,
        :reportingDirectorId,
        :currentCtc,
        :designation,
        :panCardNumber,
        :bankAccountNumber,
        :ifscCode,
        :aadhaarCardNumber,
        :pfAccountNumber,
        :bankPassbookImage,
        :recentPhotograph,
        :highestEducationalQualification,
        :totalWorkExperience,
        :department,
        :linkedIn,
        :employmentStatus,
        :createdAt,
        :createdBy,
        :updatedBy
      )
    `;

    // Get current timestamp
    const now = moment().format('YYYY-MM-DD HH:mm:ss');

    // Execute INSERT
    await sequelize.query(sql, {
      replacements: {
        uuid: employeeUuid,
        name: employeeData.name,
        gender: employeeData.gender,
        dateOfBirth: formattedDateOfBirth,
        contactNumber: employeeData.contactNumber || null,
        personalEmail: employeeData.personalEmail,
        bloodGroup: employeeData.bloodGroup || null,
        maritalStatus: employeeData.maritalStatus || null,
        permanentAddress: employeeData.permanentAddress || null,
        temporaryAddress: employeeData.temporaryAddress || null,
        emergencyContactNumber1Of: employeeData.emergencyContactNumber1Of || null,
        emergencyContactNumber1: employeeData.emergencyContactNumber1 || null,
        emergencyContactNumber2Of: employeeData.emergencyContactNumber2Of || null,
        emergencyContactNumber2: employeeData.emergencyContactNumber2 || null,
        employeeId: employeeData.employeeId,
        officialEmailId: employeeData.officialEmailId,
        skills: employeeData.skills || null,
        dateOfJoining: formattedDateOfJoining,
        reportingManagerId: employeeData.reportingManagerId,
        reportingDirectorId: employeeData.reportingDirectorId || null,
        currentCtc: employeeData.currentCtc || null,
        designation: employeeData.designation,
        panCardNumber: employeeData.panCardNumber || null,
        bankAccountNumber: employeeData.bankAccountNumber || null,
        ifscCode: employeeData.ifscCode || null,
        aadhaarCardNumber: employeeData.aadhaarCardNumber || null,
        pfAccountNumber: employeeData.pfAccountNumber || null,
        bankPassbookImage: employeeData.bankPassbookImage || null,
        recentPhotograph: employeeData.recentPhotograph || null,
        highestEducationalQualification: employeeData.highestEducationalQualification || null,
        totalWorkExperience: employeeData.totalWorkExperience || null,
        department: employeeData.department,
        linkedIn: employeeData.linkedIn || null,
        employmentStatus: employeeData.employmentStatus || 'ACTIVE',
        createdAt: now,
        createdBy,
        updatedBy: createdBy,
      },
      type: QueryTypes.INSERT,
    });

    const duration = timer.end();
    logDatabase('INSERT_EMPLOYEE', employeeUuid, duration);

    logger.info('✅ Employee created successfully', {
      employeeUuid,
      employeeId: employeeData.employeeId,
      name: employeeData.name,
      duration: `${duration}ms`
    });

    return employeeUuid;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('INSERT_EMPLOYEE_ERROR', 'new_employee', duration, error);
    
    logger.error('❌ Failed to insert employee', {
      employeeId: employeeData.employeeId,
      error: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      duration: `${duration}ms`,
      stack: error.stack
    });

    throw new Error(`Database error while creating employee: ${error.message}`);
  }
}

/**
 * Delete Employee
 * ===============
 * Deletes an employee record from the database
 * Used for rollback if leave allocation fails
 * 
 * @param employeeUuid - UUID of employee to delete
 */
export async function deleteEmployeeById(employeeUuid: string): Promise<void> {
  const timer = new PerformanceTimer('deleteEmployeeById');
  
  try {
    logger.warn('🗑️ Deleting employee', {
      employeeUuid,
      operation: 'deleteEmployeeById'
    });

    const sql = `DELETE FROM employees WHERE uuid = :employeeUuid`;

    await sequelize.query(sql, {
      replacements: { employeeUuid },
      type: QueryTypes.DELETE,
    });

    const duration = timer.end();
    logDatabase('DELETE_EMPLOYEE', employeeUuid, duration);

    logger.info('✅ Employee deleted', {
      employeeUuid,
      duration: `${duration}ms`
    });

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('DELETE_EMPLOYEE_ERROR', employeeUuid, duration, error);
    
    logger.error('❌ Failed to delete employee', {
      employeeUuid,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while deleting employee: ${error.message}`);
  }
}
