/**
 * Create Employee Service
 * =======================
 * Business logic layer for creating new employees
 * 
 * Responsibilities:
 * - Authorization checks (only admin/HR can create employees)
 * - Email duplication validation
 * - Data encryption (PAN, Aadhaar, Bank Account)
 * - Employee record creation
 * - Leave allocation (calls external service)
 * - Rollback on failure
 * - Comprehensive logging
 */

import { TRPCError } from '@trpc/server';
import moment from 'moment';
import { logger, logSecurity, PerformanceTimer } from '../../../../utils/logger';
import { checkEmployeeEmailExists, insertEmployee, deleteEmployeeById } from '../../stores/crud/create.store';
import { CreateEmployeeInput } from '../../schemas/crud/create.schemas';
import { ApplicationUserRole } from '../../types/employee.types';
import { encryptEmployeeSensitiveFields } from '../../helpers/encrypt-employee-sensitive-fields.helper';
import { allocateEmployeeLeaves } from '../../../employee-leaves/services/leave-calculation.service';
import { insertEmployeeEducation } from '../../stores/crud/employee-education.store';
import { insertEmployeeExperience } from '../../stores/crud/employee-experience.store';

/**
 * User Context Interface
 * ----------------------
 * Represents the authenticated user making the request
 */
interface UserContext {
  uuid: string;
  role: ApplicationUserRole;
  email: string;
}

/**
 * Create Employee Service
 * =======================
 * 
 * Main service function for creating a new employee
 * 
 * Business Logic Flow:
 * 1. Authorization check (only admin/HR/super_user)
 * 2. Validate email uniqueness (personal and official)
 * 3. Encrypt sensitive fields (PAN, Aadhaar, Bank Account, PF)
 * 4. Insert employee record
 * 5. Allocate leaves for the employee
 * 6. Rollback on leave allocation failure
 * 7. Return employee UUID
 * 
 * @param employeeData - Employee data from validated input
 * @param user - Authenticated user context
 * @returns UUID of the created employee
 * @throws TRPCError FORBIDDEN if user lacks permission
 * @throws TRPCError BAD_REQUEST if email already exists
 * @throws TRPCError INTERNAL_SERVER_ERROR for unexpected errors
 */
export async function createEmployee(
  employeeData: CreateEmployeeInput,
  user: UserContext
): Promise<{ employeeUuid: string }> {
  const timer = new PerformanceTimer('createEmployee_service');
  
  try {
    logger.info('👤 Creating new employee', {
      employeeId: employeeData.employeeId,
      name: employeeData.name,
      createdBy: user.uuid,
      createdByRole: user.role,
      operation: 'createEmployee'
    });

    // ==========================================================================
    // STEP 1: Authorization Check
    // ==========================================================================
    const allowedRoles = [
      ApplicationUserRole.superUser,
      ApplicationUserRole.admin,
      ApplicationUserRole.hr
    ];

    if (!allowedRoles.includes(user.role)) {
      logger.warn('🚫 Access denied - User not authorized to create employee', {
        userId: user.uuid,
        userRole: user.role
      });

      logSecurity('CREATE_EMPLOYEE_ACCESS_DENIED', 'high', {
        userRole: user.role,
        reason: 'Insufficient permissions'
      }, undefined, user.uuid);

      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to create employees. Contact HR or Admin.'
      });
    }

    // ==========================================================================
    // STEP 2: Check Personal Email Uniqueness
    // ==========================================================================
    logger.debug('📧 Checking personal email uniqueness', {
      email: employeeData.personalEmail
    });

    const personalEmailExists = await checkEmployeeEmailExists(
      employeeData.personalEmail,
      'personalEmail'
    );

    if (personalEmailExists) {
      logger.warn('❌ Personal email already exists', {
        email: employeeData.personalEmail,
        existingEmployee: personalEmailExists.uuid
      });

      logSecurity('CREATE_EMPLOYEE_DUPLICATE_EMAIL', 'medium', {
        email: employeeData.personalEmail,
        emailType: 'personal'
      }, undefined, user.uuid);

      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Personal email ${employeeData.personalEmail} already exists for another employee.`
      });
    }

    // ==========================================================================
    // STEP 3: Check Official Email Uniqueness
    // ==========================================================================
    logger.debug('📧 Checking official email uniqueness', {
      email: employeeData.officialEmailId
    });

    const officialEmailExists = await checkEmployeeEmailExists(
      employeeData.officialEmailId,
      'officialEmailId'
    );

    if (officialEmailExists) {
      logger.warn('❌ Official email already exists', {
        email: employeeData.officialEmailId,
        existingEmployee: officialEmailExists.uuid
      });

      logSecurity('CREATE_EMPLOYEE_DUPLICATE_EMAIL', 'medium', {
        email: employeeData.officialEmailId,
        emailType: 'official'
      }, undefined, user.uuid);

      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Official email ${employeeData.officialEmailId} already exists for another employee.`
      });
    }

    // ==========================================================================
    // STEP 4: Encrypt Sensitive Fields
    // ==========================================================================
    logger.debug('🔐 Encrypting sensitive employee data', {
      fields: ['panCardNumber', 'bankAccountNumber', 'aadhaarCardNumber', 'pfAccountNumber']
    });

    const encryptedEmployeeData = await encryptEmployeeSensitiveFields(employeeData);

    // ==========================================================================
    // STEP 5: Insert Employee Record
    // ==========================================================================
    logger.info('💾 Inserting employee record', {
      employeeId: employeeData.employeeId,
      name: employeeData.name
    });

    const employeeUuid = await insertEmployee(encryptedEmployeeData, user.uuid);

    logger.info('✅ Employee record created', {
      employeeUuid,
      employeeId: employeeData.employeeId
    });

    // ==========================================================================
    // STEP 5.5: Insert Education Records
    // ==========================================================================
    try {
      if (employeeData.education && employeeData.education.length > 0) {
        logger.info('🎓 Inserting education records', {
          employeeUuid,
          recordCount: employeeData.education.length
        });

        await insertEmployeeEducation(employeeUuid, employeeData.education, user.uuid);

        logger.info('✅ Education records inserted', {
          employeeUuid,
          recordCount: employeeData.education.length
        });
      }
    } catch (educationError: any) {
      logger.error('❌ Failed to insert education records - Rolling back', {
        employeeUuid,
        error: educationError.message
      });

      await deleteEmployeeById(employeeUuid);

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to save education records. Please try again.'
      });
    }

    // ==========================================================================
    // STEP 5.6: Insert Experience Records
    // ==========================================================================
    try {
      if (employeeData.experience && employeeData.experience.length > 0) {
        logger.info('💼 Inserting experience records', {
          employeeUuid,
          recordCount: employeeData.experience.length
        });

        await insertEmployeeExperience(employeeUuid, employeeData.experience, user.uuid);

        logger.info('✅ Experience records inserted', {
          employeeUuid,
          recordCount: employeeData.experience.length
        });
      }
    } catch (experienceError: any) {
      logger.error('❌ Failed to insert experience records - Rolling back', {
        employeeUuid,
        error: experienceError.message
      });

      await deleteEmployeeById(employeeUuid);

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to save experience records. Please try again.'
      });
    }

    // ==========================================================================
    // STEP 6: Allocate Employee Leaves
    // ==========================================================================
    try {
      logger.info('📅 Allocating employee leaves', {
        employeeUuid,
        dateOfJoining: employeeData.dateOfJoining
      });

      const dateOfJoining = moment(employeeData.dateOfJoining).format('YYYY-MM-DD');
      const currentYear = new Date().getFullYear().toString();

      // Allocate leaves for the employee
      // This creates leave allocation records in employee_leave_allocation table
      // Pro-rated based on joining date (if mid-year joiner)
      await allocateEmployeeLeaves(employeeUuid, dateOfJoining, currentYear);

      logger.info('✅ Employee leaves allocated successfully', {
        employeeUuid,
        year: currentYear
      });

    } catch (leaveError: any) {
      // ==========================================================================
      // STEP 7: Rollback - Delete Employee on Leave Allocation Failure
      // ==========================================================================
      logger.error('❌ Failed to allocate leaves - Rolling back employee creation', {
        employeeUuid,
        error: leaveError.message
      });

      await deleteEmployeeById(employeeUuid);

      logger.warn('🔄 Employee record deleted (rollback)', {
        employeeUuid
      });

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to allocate leaves for new employee. Please try again.'
      });
    }

    // ==========================================================================
    // STEP 8: Success - Log and Return
    // ==========================================================================
    const duration = timer.end();

    logger.info('✅ Employee created successfully', {
      employeeUuid,
      employeeId: employeeData.employeeId,
      name: employeeData.name,
      createdBy: user.uuid,
      duration: `${duration}ms`
    });

    logSecurity('CREATE_EMPLOYEE_SUCCESS', 'low', {
      employeeUuid,
      employeeId: employeeData.employeeId,
      userRole: user.role,
      duration
    }, undefined, user.uuid);

    return { employeeUuid };

  } catch (error: any) {
    // ==========================================================================
    // STEP 9: Error Handling
    // ==========================================================================
    const duration = timer.end();

    // If it's already a TRPCError, re-throw it
    if (error instanceof TRPCError) {
      throw error;
    }

    // Log unexpected errors
    logger.error('❌ Failed to create employee', {
      employeeId: employeeData.employeeId,
      createdBy: user.uuid,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });

    logSecurity('CREATE_EMPLOYEE_ERROR', 'critical', {
      employeeId: employeeData.employeeId,
      error: error.message,
      duration
    }, undefined, user.uuid);

    // Throw generic error to avoid exposing internal details
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to create employee. Please try again later.'
    });
  }
}
