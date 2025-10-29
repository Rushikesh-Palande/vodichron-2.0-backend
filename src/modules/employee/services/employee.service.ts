/**
 * Employee Service Module
 * =======================
 * 
 * This module contains the business logic layer for employee operations.
 * It sits between the controller (tRPC) and the store (database).
 * 
 * Responsibilities:
 * - Business logic and validation
 * - Authorization checks (role-based access control)
 * - Data transformation (decryption of sensitive fields)
 * - Comprehensive logging of operations
 * - Error handling and meaningful error messages
 * 
 * Authorization Rules:
 * - Super users, admins, HR: Can view any employee
 * - Managers: Can view their reportees
 * - Directors: Can view their reportees
 * - Customers: Can view employees mapped to their projects
 * - Employees: Can view their own profile only
 */

import { TRPCError } from '@trpc/server';
import { logger, logSecurity, PerformanceTimer } from '../../../utils/logger';
import { getEmployeeByUuidWithManagerDetail, checkIfEmployeeMappedToCustomer } from '../stores/employee.store';
import { decryptEmployeeSensitiveFields } from '../helpers/security.helper';
import { EmployeeWithManagerDetail, ApplicationUserRole } from '../types/employee.types';

/**
 * User Context Interface
 * ----------------------
 * Represents the authenticated user making the request.
 * Extracted from JWT token by tRPC middleware.
 */
interface UserContext {
  uuid: string;
  role: ApplicationUserRole;
  email: string;
}

/**
 * Get Employee By ID Service
 * ==========================
 * 
 * Fetches employee profile with comprehensive authorization checks.
 * 
 * Business Logic Flow:
 * 1. Validate input parameters
 * 2. Fetch employee from database with manager/director details
 * 3. Perform role-based authorization checks
 * 4. Decrypt sensitive fields (PAN, Aadhaar, Bank Account, PF)
 * 5. Return employee profile data
 * 
 * Authorization Matrix:
 * | Role       | Can View                                    |
 * |------------|---------------------------------------------|
 * | superUser  | All employees                               |
 * | admin      | All employees                               |
 * | hr         | All employees                               |
 * | director   | Self + Direct reportees                     |
 * | manager    | Self + Direct reportees                     |
 * | customer   | Self + Employees mapped to their projects   |
 * | employee   | Self only                                   |
 * 
 * @param employeeId - UUID of employee to fetch
 * @param user - Authenticated user context (from JWT)
 * @returns Employee profile with decrypted sensitive data
 * @throws TRPCError NOT_FOUND if employee doesn't exist
 * @throws TRPCError FORBIDDEN if user doesn't have permission
 * @throws TRPCError INTERNAL_SERVER_ERROR for unexpected errors
 */
export async function getEmployeeById(
  employeeId: string,
  user: UserContext
): Promise<EmployeeWithManagerDetail> {
  // ============================================================================
  // STEP 1: Initialize Performance Timer
  // ============================================================================
  const timer = new PerformanceTimer('getEmployeeById_service');
  
  try {
    logger.info('👤 Fetching employee profile', {
      employeeId,
      requestedBy: user.uuid,
      requestedByRole: user.role,
      operation: 'getEmployeeById'
    });

    // ==========================================================================
    // STEP 2: Validate Input Parameters
    // ==========================================================================
    if (!employeeId || employeeId.trim() === '') {
      logSecurity('GET_EMPLOYEE_VALIDATION_FAILED', 'low', {
        reason: 'Missing employee ID'
      }, undefined, user.uuid);
      
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Employee ID is required'
      });
    }

    // ==========================================================================
    // STEP 3: Fetch Employee from Database
    // ==========================================================================
    logger.debug('📊 Fetching employee from database', {
      employeeId,
      userId: user.uuid
    });

    const employee = await getEmployeeByUuidWithManagerDetail(employeeId);

    // Check if employee exists
    if (!employee) {
      logger.warn('❌ Employee not found', {
        employeeId,
        requestedBy: user.uuid
      });

      logSecurity('GET_EMPLOYEE_NOT_FOUND', 'low', {
        employeeId,
        userRole: user.role
      }, undefined, user.uuid);

      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Employee not found'
      });
    }

    // ==========================================================================
    // STEP 4: Authorization Checks
    // ==========================================================================
    const isAuthorized = await checkAuthorization(employee, user);

    if (!isAuthorized) {
      logger.warn('🚫 Access denied - User not authorized to view employee', {
        employeeId,
        requestedBy: user.uuid,
        requestedByRole: user.role,
        targetEmployee: employee.name
      });

      logSecurity('GET_EMPLOYEE_ACCESS_DENIED', 'high', {
        employeeId,
        userRole: user.role,
        reason: 'Insufficient permissions'
      }, undefined, user.uuid);

      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to view this employee profile'
      });
    }

    // ==========================================================================
    // STEP 5: Decrypt Sensitive Fields
    // ==========================================================================
    logger.debug('🔓 Decrypting sensitive employee fields', {
      employeeId,
      fields: ['panCardNumber', 'bankAccountNumber', 'aadhaarCardNumber', 'pfAccountNumber']
    });

    const employeeWithDecryptedData = await decryptEmployeeSensitiveFields(employee);

    // ==========================================================================
    // STEP 6: Log Success and Return
    // ==========================================================================
    const duration = timer.end();

    logger.info('✅ Employee profile fetched successfully', {
      employeeId,
      employeeName: employee.name,
      requestedBy: user.uuid,
      requestedByRole: user.role,
      duration: `${duration}ms`
    });

    logSecurity('GET_EMPLOYEE_SUCCESS', 'low', {
      employeeId,
      userRole: user.role,
      duration
    }, undefined, user.uuid);

    return employeeWithDecryptedData;

  } catch (error: any) {
    // ==========================================================================
    // STEP 7: Error Handling
    // ==========================================================================
    const duration = timer.end();

    // If it's already a TRPCError, re-throw it
    if (error instanceof TRPCError) {
      throw error;
    }

    // Log unexpected errors
    logger.error('❌ Failed to fetch employee profile', {
      employeeId,
      requestedBy: user.uuid,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });

    logSecurity('GET_EMPLOYEE_ERROR', 'critical', {
      employeeId,
      error: error.message,
      duration
    }, undefined, user.uuid);

    // Throw generic error to avoid exposing internal details
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch employee profile. Please try again later.'
    });
  }
}

/**
 * Check Authorization
 * ===================
 * 
 * Determines if the authenticated user has permission to view the requested employee.
 * Implements role-based access control (RBAC) with hierarchical checks.
 * 
 * Authorization Logic:
 * -------------------
 * 1. Super users, admins, HR: Always authorized (full access)
 * 2. Viewing own profile: Always authorized
 * 3. Directors: Can view their direct reportees
 * 4. Managers: Can view their direct reportees
 * 5. Customers: Can view employees mapped to their projects
 * 6. Regular employees: Can only view their own profile
 * 
 * @param employee - Employee being accessed
 * @param user - User requesting access
 * @returns True if authorized, false otherwise
 */
async function checkAuthorization(
  employee: EmployeeWithManagerDetail,
  user: UserContext
): Promise<boolean> {
  logger.debug('🔐 Checking authorization', {
    employeeId: employee.uuid,
    userId: user.uuid,
    userRole: user.role
  });

  // Rule 1: Super users, admins, and HR can view any employee
  const adminRoles = [ApplicationUserRole.superUser, ApplicationUserRole.admin, ApplicationUserRole.hr];
  if (adminRoles.includes(user.role)) {
    logger.debug('✅ Authorization granted - Admin/HR/Super user', {
      userId: user.uuid,
      userRole: user.role
    });
    return true;
  }

  // Rule 2: Users can always view their own profile
  if (user.uuid === employee.uuid) {
    logger.debug('✅ Authorization granted - Own profile', {
      userId: user.uuid
    });
    return true;
  }

  // Rule 3: Directors can view their direct reportees
  if (user.role === ApplicationUserRole.director && employee.reportingDirectorId === user.uuid) {
    logger.debug('✅ Authorization granted - Director viewing reportee', {
      directorId: user.uuid,
      employeeId: employee.uuid
    });
    return true;
  }

  // Rule 4: Managers can view their direct reportees
  if (user.role === ApplicationUserRole.manager && employee.reportingManagerId === user.uuid) {
    logger.debug('✅ Authorization granted - Manager viewing reportee', {
      managerId: user.uuid,
      employeeId: employee.uuid
    });
    return true;
  }

  // Rule 5: Customers can view employees mapped to their projects
  if (user.role === ApplicationUserRole.customer) {
    const isMapped = await checkIfEmployeeMappedToCustomer(employee.uuid, user.uuid);
    
    if (isMapped) {
      logger.debug('✅ Authorization granted - Customer viewing mapped employee', {
        customerId: user.uuid,
        employeeId: employee.uuid
      });
      return true;
    }
  }

  // Rule 6: Deny access by default
  logger.debug('❌ Authorization denied - No matching rules', {
    userId: user.uuid,
    userRole: user.role,
    employeeId: employee.uuid
  });

  return false;
}
