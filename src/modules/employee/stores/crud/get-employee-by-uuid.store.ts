/**
 * Get Employee By UUID Store Module
 * ==================================
 * 
 * This module provides a simple function to fetch employee data by UUID.
 * Unlike getEmployeeByUuidWithManagerDetail, this returns basic employee data
 * without complex JOINs for manager/director/role/status information.
 * 
 * Use Cases:
 * - Quick employee lookups when minimal data is needed
 * - Validation checks (e.g., does employee exist?)
 * - Fetching employee for secondary operations
 * 
 * Performance:
 * - Simple SELECT query with single table
 * - Primary key lookup (very fast)
 * - No JOINs (faster than getEmployeeByUuidWithManagerDetail)
 */

import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../../database';
import { logger, logDatabase, PerformanceTimer } from '../../../../utils/logger';

/**
 * Employee interface for basic employee data
 */
interface Employee {
  uuid: string;
  name: string;
  gender?: string;
  dateOfBirth?: Date;
  contactNumber?: string;
  personalEmail?: string;
  bloodGroup?: string;
  maritalStatus?: string;
  permanentAddress?: string;
  temporaryAddress?: string;
  emergencyContactNumber1Of?: string;
  emergencyContactNumber1?: string;
  emergencyContactNumber2Of?: string;
  emergencyContactNumber2?: string;
  employeeId?: string;
  officialEmailId?: string;
  skills?: string;
  dateOfJoining?: Date;
  reportingManagerId?: string;
  reportingDirectorId?: string;
  currentCtc?: number;
  designation?: string;
  panCardNumber?: string;
  bankAccountNumber?: string;
  ifscCode?: string;
  aadhaarCardNumber?: string;
  pfAccountNumber?: string;
  bankPassbookImage?: string;
  recentPhotograph?: string;
  highestEducationalQualification?: string;
  totalWorkExperience?: string;
  department?: string;
  linkedIn?: string;
  employmentStatus?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Get Employee By UUID
 * ====================
 * 
 * Fetches basic employee data by UUID without complex JOINs.
 * This is a lightweight alternative to getEmployeeByUuidWithManagerDetail.
 * 
 * Database Query:
 * --------------
 * SELECT: All employee fields
 * FROM: employees
 * WHERE: uuid = ?
 * 
 * Performance:
 * - Single table query (no JOINs)
 * - Primary key lookup (very fast)
 * - Minimal data transfer
 * 
 * @param uuid - UUID of the employee to fetch
 * @returns Employee object or null if not found
 * @throws Error if database query fails
 */
export async function getEmployeeByUuid(
  uuid: string
): Promise<Employee | null> {
  const timer = new PerformanceTimer('getEmployeeByUuid');
  
  try {
    logger.debug('🔍 Fetching employee by UUID', {
      uuid,
      operation: 'getEmployeeByUuid'
    });

    // Simple SELECT query - no JOINs needed
    const sql = `
      SELECT * FROM employees
      WHERE uuid = :uuid
    `;

    const result = await sequelize.query<Employee>(sql, {
      replacements: { uuid },
      type: QueryTypes.SELECT,
      raw: true,
    });

    const duration = timer.end();
    
    // Log database operation
    logDatabase('SELECT_EMPLOYEE_BY_UUID', uuid, duration);

    // Check if employee was found
    if (result.length === 0) {
      logger.debug('❌ Employee not found', {
        uuid,
        duration: `${duration}ms`
      });
      
      return null;
    }

    const employee = result[0];

    logger.debug('✅ Employee fetched successfully', {
      uuid,
      employeeName: employee.name,
      duration: `${duration}ms`
    });

    return employee;

  } catch (error: any) {
    const duration = timer.end();
    
    logDatabase('SELECT_EMPLOYEE_BY_UUID_ERROR', uuid, duration, error);
    
    logger.error('❌ Failed to fetch employee from database', {
      uuid,
      error: error.message,
      code: error.code,
      duration: `${duration}ms`,
      stack: error.stack
    });

    throw new Error(`Database error while fetching employee: ${error.message}`);
  }
}
