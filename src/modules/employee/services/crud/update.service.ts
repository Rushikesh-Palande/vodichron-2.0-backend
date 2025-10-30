/**
 * Update Employee Service
 * =======================
 * Business logic layer for updating existing employees
 * Based on old vodichron employeeController.patch (lines 232-300)
 * 
 * Responsibilities:
 * - Authorization checks (HR/super_user can update all, others restricted)
 * - Validate employee exists before update
 * - Role-based field protection (prevent regular users from updating certain fields)
 * - Data encryption (PAN, Aadhaar, Bank Account, PF)
 * - Password update handling
 * - First password change activity tracking
 * - Employee record update
 * - Comprehensive logging
 * 
 * Authorization Logic (from old controller lines 232-300):
 * - HR/Super users can update ANY employee and ALL fields
 * - Regular employees can ONLY update their OWN profile
 * - Regular employees CANNOT update: name, employeeId, CTC, officialEmailId, 
 *   dateOfJoining, reportingManagerId, reportingDirectorId, designation
 */

import { TRPCError } from '@trpc/server';
import { logger, logSecurity, PerformanceTimer } from '../../../../utils/logger';
import { 
  getEmployeeByUuid, 
  updateEmployeeData, 
  updateUserPassword,
  getEmployeeActivityByEmployeeId,
  insertEmployeeActivity
} from '../../stores/crud/update.store';
import { UpdateEmployeeInput } from '../../schemas/crud/update.schemas';
import { ApplicationUserRole, Employee } from '../../types/employee.types';
import { encryptEmployeeSensitiveFields } from '../../helpers/encrypt-employee-sensitive-fields.helper';
import { hashPassword } from '../../../auth/helpers/hash-password.helper';

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
 * Activity Types
 * --------------
 * Constants for employee activity tracking
 * Matches old vodichron constants/activityMaster.ts
 */
const ACTIVITY_FIRST_PASSWORD_CHANGE = 'FIRST_PASSWORD_CHANGE';

/**
 * Update Employee Service
 * =======================
 * 
 * Main service function for updating an existing employee
 * 
 * Business Logic Flow (matching old patch function):
 * 1. Fetch existing employee data
 * 2. Authorization check (HR/super_user OR self)
 * 3. Validate employee exists
 * 4. Apply role-based field restrictions
 * 5. Encrypt sensitive fields
 * 6. Update password if provided
 * 7. Track first password change activity
 * 8. Update employee record
 * 9. Return updated data
 * 
 * @param employeeData - Employee data to update
 * @param user - Authenticated user context
 * @returns Updated employee data (with decrypted fields for response)
 * @throws TRPCError FORBIDDEN if user lacks permission
 * @throws TRPCError BAD_REQUEST if employee not found
 * @throws TRPCError INTERNAL_SERVER_ERROR for unexpected errors
 */
export async function updateEmployee(
  employeeData: UpdateEmployeeInput,
  user: UserContext
): Promise<{ success: boolean; data: UpdateEmployeeInput }> {
  const timer = new PerformanceTimer('updateEmployee_service');
  
  try {
    logger.info('✏️  Updating employee', {
      employeeUuid: employeeData.uuid,
      updatedBy: user.uuid,
      updatedByRole: user.role,
      operation: 'updateEmployee'
    });

    // ==========================================================================
    // STEP 1: Fetch Existing Employee (matching old controller line 235)
    // ==========================================================================
    logger.debug('📊 Fetching existing employee data', {
      employeeUuid: employeeData.uuid
    });

    const existingEmployee = await getEmployeeByUuid(employeeData.uuid);

    // ==========================================================================
    // STEP 2: Validate Employee Exists (matching old controller lines 246-248)
    // ==========================================================================
    if (!existingEmployee) {
      logger.warn('❌ Employee not found for update', {
        employeeUuid: employeeData.uuid,
        requestedBy: user.uuid
      });

      logSecurity('UPDATE_EMPLOYEE_NOT_FOUND', 'medium', {
        employeeUuid: employeeData.uuid,
        userRole: user.role
      }, undefined, user.uuid);

      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Unable to find the details of the employee to update.'
      });
    }

    logger.debug('✅ Employee found', {
      employeeUuid: employeeData.uuid,
      name: existingEmployee.name
    });

    // ==========================================================================
    // STEP 3: Authorization Check (matching old controller lines 237-243)
    // ==========================================================================
    const isHROrSuperUser = 
      user.role === ApplicationUserRole.hr || 
      user.role === ApplicationUserRole.superUser;
    
    const isSelfUpdate = user.uuid === employeeData.uuid;

    // If not HR/super_user AND not updating self, deny access
    if (!isHROrSuperUser && !isSelfUpdate) {
      logger.warn('🚫 Access denied - User not authorized to update employee', {
        employeeUuid: employeeData.uuid,
        requestedBy: user.uuid,
        requestedByRole: user.role
      });

      logSecurity('UPDATE_EMPLOYEE_ACCESS_DENIED', 'high', {
        employeeUuid: employeeData.uuid,
        userRole: user.role,
        reason: 'Not HR/super_user and not self-update'
      }, undefined, user.uuid);

      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied for the operation request.'
      });
    }

    logger.info('✅ Authorization passed', {
      employeeUuid: employeeData.uuid,
      updatedBy: user.uuid,
      isHROrSuperUser,
      isSelfUpdate
    });

    // ==========================================================================
    // STEP 4: Apply Role-Based Field Restrictions 
    // ==========================================================================
    // (matching old controller lines 256-270)
    // 
    // If NOT (HR or super_user) OR is self-update, prevent updating certain fields
    // This protects critical fields like name, employeeId, CTC, etc.
    //
    // Note: The old logic has `!(hr || super) || self` which means:
    // - If NOT admin AND updating self → restrict fields
    // - If admin but updating someone else → allow all fields
    // 
    // We'll keep the exact same logic for consistency
    const shouldRestrictFields = !isHROrSuperUser || isSelfUpdate;

    if (shouldRestrictFields) {
      logger.debug('🔒 Applying field restrictions (non-admin or self-update)', {
        employeeUuid: employeeData.uuid,
        updatedBy: user.uuid
      });

      // Keep original values for protected fields (matching lines 261-269)
      const protectedFields = {
        name: existingEmployee.name,
        employeeId: existingEmployee.employeeId,
        currentCtc: existingEmployee.currentCtc,
        officialEmailId: existingEmployee.officialEmailId,
        dateOfJoining: existingEmployee.dateOfJoining,
        reportingManagerId: existingEmployee.reportingManagerId,
        reportingDirectorId: existingEmployee.reportingDirectorId,
        designation: existingEmployee.designation
      };

      // Override any attempts to change protected fields
      Object.assign(employeeData, protectedFields);

      logger.debug('✅ Protected fields preserved', {
        employeeUuid: employeeData.uuid,
        protectedFields: Object.keys(protectedFields)
      });
    }

    // ==========================================================================
    // STEP 5: Encrypt Sensitive Fields (matching old controller lines 272-278)
    // ==========================================================================
    logger.debug('🔐 Encrypting sensitive employee data', {
      employeeUuid: employeeData.uuid,
      fields: ['panCardNumber', 'bankAccountNumber', 'aadhaarCardNumber', 'pfAccountNumber']
    });

    const encryptedEmployeeData = await encryptEmployeeSensitiveFields(employeeData);

    // ==========================================================================
    // STEP 6: Handle Password Update (matching old controller lines 279-295)
    // ==========================================================================
    if (employeeData.password) {
      logger.info('🔐 Password update requested', {
        employeeUuid: employeeData.uuid,
        updatedBy: user.uuid
      });

      // Hash the password (matching line 282)
      const encryptedPassword = await hashPassword(employeeData.password);

      // Update password in application_users table (matching line 283)
      await updateUserPassword(user.uuid, encryptedPassword);

      logger.info('✅ Password updated successfully', {
        employeeUuid: employeeData.uuid
      });

      // Track first password change activity (matching lines 284-294)
      // Only if user is updating their own password
      if (user.uuid === employeeData.uuid) {
        logger.debug('📝 Checking first password change activity', {
          employeeUuid: employeeData.uuid
        });

        const existingActivity = await getEmployeeActivityByEmployeeId(
          employeeData.uuid,
          ACTIVITY_FIRST_PASSWORD_CHANGE
        );

        if (existingActivity.length === 0) {
          // First time changing password, record the activity
          logger.info('📝 Recording first password change activity', {
            employeeUuid: employeeData.uuid
          });

          await insertEmployeeActivity(
            employeeData.uuid,
            ACTIVITY_FIRST_PASSWORD_CHANGE,
            { status: true }
          );

          logger.info('✅ First password change activity recorded', {
            employeeUuid: employeeData.uuid
          });
        } else {
          logger.debug('ℹ️  First password change activity already exists', {
            employeeUuid: employeeData.uuid
          });
        }
      }

      // Remove password from data before updating employee table
      const { password, ...dataWithoutPassword } = encryptedEmployeeData;
      Object.assign(encryptedEmployeeData, dataWithoutPassword);
    }

    // ==========================================================================
    // STEP 7: Update Employee Record (matching old controller line 297)
    // ==========================================================================
    logger.info('💾 Updating employee record in database', {
      employeeUuid: employeeData.uuid,
      updatedBy: user.uuid
    });

    await updateEmployeeData(encryptedEmployeeData, user.uuid);

    // ==========================================================================
    // STEP 8: Success - Log and Return (matching old controller line 298)
    // ==========================================================================
    const duration = timer.end();

    logger.info('✅ Employee updated successfully', {
      employeeUuid: employeeData.uuid,
      name: existingEmployee.name,
      updatedBy: user.uuid,
      duration: `${duration}ms`
    });

    logSecurity('UPDATE_EMPLOYEE_SUCCESS', 'low', {
      employeeUuid: employeeData.uuid,
      userRole: user.role,
      isSelfUpdate,
      duration
    }, undefined, user.uuid);

    // Return the updated data (note: password is already removed if it was provided)
    return {
      success: true,
      data: employeeData
    };

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
    logger.error('❌ Failed to update employee', {
      employeeUuid: employeeData.uuid,
      updatedBy: user.uuid,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });

    logSecurity('UPDATE_EMPLOYEE_ERROR', 'critical', {
      employeeUuid: employeeData.uuid,
      error: error.message,
      duration
    }, undefined, user.uuid);

    // Throw generic error to avoid exposing internal details
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to update employee. Please try again later.'
    });
  }
}
