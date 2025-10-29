/**
 * Employee Data Store Module
 * ==========================
 * 
 * This module handles all direct database operations related to employees.
 * It provides a data access layer with comprehensive logging and error handling.
 * 
 * Key Features:
 * - Raw SQL queries for complex JOINs and performance
 * - HMI-style step-by-step comments
 * - Database performance monitoring with timers
 * - Comprehensive error logging
 * - Type-safe return values
 * 
 * Database Operations:
 * - Get employee by UUID with manager/director details
 * - Get employee by email (for validation)
 * - Check employee-customer mapping
 * 
 * Performance Considerations:
 * - Uses LEFT JOINs for optional relationships
 * - Single query to fetch employee with all related data
 * - Indexed lookups on UUID (primary key)
 */

import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../database';
import { logger, logDatabase, logPerformance, PerformanceTimer } from '../../../utils/logger';
import { EmployeeWithManagerDetail } from '../types/employee.types';

/**
 * Get Employee By UUID With Manager Detail
 * =========================================
 * 
 * Fetches complete employee profile with manager and director information.
 * This is the primary function for loading employee profile data.
 * 
 * Database Query Structure:
 * ------------------------
 * SELECT: All employee fields + computed manager/director details + role + online status
 * FROM: employees (main table)
 * LEFT JOIN: employees (as manager) - for reporting manager details
 * LEFT JOIN: employees (as director) - for reporting director details
 * LEFT JOIN: application_users - for user role
 * LEFT JOIN: employee_online_status - for current online status
 * WHERE: employee.uuid = ? (parameterized)
 * 
 * Performance:
 * - Single query with JOINs (no N+1 problem)
 * - Uses primary key lookup (uuid) - very fast
 * - LEFT JOINs for optional relationships (manager/director)
 * - CASE statement for default online status
 * 
 * @param employeeId - UUID of the employee to fetch
 * @returns Employee object with manager details or null if not found
 * @throws Error if database query fails
 */
export async function getEmployeeByUuidWithManagerDetail(
  employeeId: string
): Promise<EmployeeWithManagerDetail | null> {
  // ============================================================================
  // STEP 1: Initialize Performance Timer
  // ============================================================================
  // Track query execution time for performance monitoring and optimization
  const timer = new PerformanceTimer('getEmployeeByUuidWithManagerDetail');
  
  try {
    logger.debug('🔍 Fetching employee by UUID with manager details', {
      employeeId,
      operation: 'getEmployeeByUuidWithManagerDetail'
    });

    // ==========================================================================
    // STEP 2: Construct SQL Query
    // ==========================================================================
    // Build comprehensive SQL query with all required JOINs
    // Uses LEFT JOIN to handle cases where manager/director/user/status don't exist
    const sql = `
      SELECT  
        employee.uuid,
        employee.name,
        employee.gender,
        employee.dateOfBirth,
        employee.contactNumber,
        employee.personalEmail,
        employee.bloodGroup,
        employee.maritalStatus,
        employee.permanentAddress,
        employee.temporaryAddress,
        employee.emergencyContactNumber1Of,
        employee.emergencyContactNumber1,
        employee.emergencyContactNumber2Of,
        employee.emergencyContactNumber2,
        employee.employeeId,
        employee.officialEmailId,
        employee.skills,
        employee.dateOfJoining,
        employee.reportingManagerId,
        employee.reportingDirectorId,
        employee.currentCtc,
        employee.designation,
        employee.panCardNumber,
        employee.bankAccountNumber,
        employee.ifscCode,
        employee.aadhaarCardNumber,
        employee.pfAccountNumber,
        employee.bankPassbookImage,
        employee.recentPhotograph,
        employee.highestEducationalQualification,
        employee.totalWorkExperience,
        employee.department,
        employee.linkedIn,
        employee.createdBy,
        employee.updatedBy,
        employee.employmentStatus,
        app_users.role,
        CONCAT(manager.name, " <", manager.officialEmailId, ">") as managerDetail,
        CONCAT(director.name, " <", director.officialEmailId, ">") as directorDetail,
        CASE
          WHEN online_status.onlineStatus IS NOT NULL THEN online_status.onlineStatus
          ELSE 'OFFLINE'
        END AS onlineStatus
      FROM employees as employee 
        LEFT JOIN employees as manager ON employee.reportingManagerId = manager.uuid
        LEFT JOIN employees as director ON employee.reportingDirectorId = director.uuid
        LEFT JOIN application_users as app_users ON app_users.employeeId = employee.uuid
        LEFT JOIN employee_online_status as online_status ON online_status.employeeId = employee.uuid
      WHERE employee.uuid = :employeeId
      ORDER BY employee.name ASC
    `;

    // ==========================================================================
    // STEP 3: Execute Database Query
    // ==========================================================================
    // Execute query with parameterized values to prevent SQL injection
    const result = await sequelize.query<EmployeeWithManagerDetail>(sql, {
      replacements: { employeeId },  // Parameterized query for security
      type: QueryTypes.SELECT,        // Specify query type for proper result parsing
      raw: true,                       // Return raw data (no model instances)
    });

    // ==========================================================================
    // STEP 4: Stop Timer and Log Performance
    // ==========================================================================
    const duration = timer.end();
    
    // Log database operation with performance metrics
    logDatabase('SELECT_EMPLOYEE_WITH_MANAGER', employeeId, duration);
    
    // Log performance warning if query is slow
    if (duration > 100) {
      logPerformance('SLOW_EMPLOYEE_QUERY', duration, {
        employeeId,
        resultCount: result.length
      }, 100);
    }

    // ==========================================================================
    // STEP 5: Process Query Result
    // ==========================================================================
    // Check if employee was found
    if (result.length === 0) {
      logger.debug('❌ Employee not found', {
        employeeId,
        duration: `${duration}ms`
      });
      
      logDatabase('SELECT_EMPLOYEE_NOT_FOUND', employeeId, duration);
      return null;
    }

    // Extract first result (uuid is unique, so only one result expected)
    const employee = result[0];

    logger.debug('✅ Employee fetched successfully', {
      employeeId,
      employeeName: employee.name,
      hasManager: !!employee.managerDetail,
      hasDirector: !!employee.directorDetail,
      onlineStatus: employee.onlineStatus,
      duration: `${duration}ms`
    });

    // Return employee with all related data
    return employee;

  } catch (error: any) {
    // ==========================================================================
    // STEP 6: Error Handling
    // ==========================================================================
    const duration = timer.end();
    
    // Log database error with full details
    logDatabase('SELECT_EMPLOYEE_ERROR', employeeId, duration, error);
    
    logger.error('❌ Failed to fetch employee from database', {
      employeeId,
      error: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      duration: `${duration}ms`,
      stack: error.stack
    });

    // Re-throw error to be handled by service layer
    throw new Error(`Database error while fetching employee: ${error.message}`);
  }
}

/**
 * Check If Employee Mapped To Customer
 * ====================================
 * 
 * Checks if an employee is allocated to a specific customer's project.
 * Used for authorization - customers can only view employees assigned to their projects.
 * 
 * Database Query:
 * --------------
 * SELECT: COUNT(*)
 * FROM: project_resource_allocation
 * WHERE: employeeId = ? AND customerId = ? AND status = 'ACTIVE'
 * 
 * @param employeeId - UUID of the employee
 * @param customerId - UUID of the customer
 * @returns True if employee is mapped to customer, false otherwise
 */
export async function checkIfEmployeeMappedToCustomer(
  employeeId: string,
  customerId: string
): Promise<boolean> {
  // ============================================================================
  // STEP 1: Initialize Performance Timer
  // ============================================================================
  const timer = new PerformanceTimer('checkIfEmployeeMappedToCustomer');

  try {
    logger.debug('🔍 Checking employee-customer mapping', {
      employeeId,
      customerId,
      operation: 'checkIfEmployeeMappedToCustomer'
    });

    // ==========================================================================
    // STEP 2: Execute Count Query
    // ==========================================================================
    // Query project_resource_allocation table to check if mapping exists
    const sql = `
      SELECT COUNT(*) as count
      FROM project_resource_allocation
      WHERE employeeId = :employeeId 
        AND customerId = :customerId 
        AND status = 'ACTIVE'
    `;

    const result = await sequelize.query<{ count: number }>(sql, {
      replacements: { employeeId, customerId },
      type: QueryTypes.SELECT,
      raw: true,
    });

    // ==========================================================================
    // STEP 3: Process Result
    // ==========================================================================
    const duration = timer.end();
    const isMapped = result[0].count > 0;

    // Log operation result
    logDatabase('CHECK_EMPLOYEE_CUSTOMER_MAPPING', `${employeeId}-${customerId}`, duration);

    logger.debug(`${isMapped ? '✅' : '❌'} Employee-customer mapping check complete`, {
      employeeId,
      customerId,
      isMapped,
      count: result[0].count,
      duration: `${duration}ms`
    });

    return isMapped;

  } catch (error: any) {
    // ==========================================================================
    // STEP 4: Error Handling
    // ==========================================================================
    const duration = timer.end();
    
    logDatabase('CHECK_MAPPING_ERROR', `${employeeId}-${customerId}`, duration, error);
    
    logger.error('❌ Failed to check employee-customer mapping', {
      employeeId,
      customerId,
      error: error.message,
      duration: `${duration}ms`
    });

    // Return false on error (deny access by default)
    return false;
  }
}
