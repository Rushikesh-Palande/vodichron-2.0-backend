/**
 * Delete Employee Service
 * =======================
 * 
 * Service layer for deleting employee records.
 * Handles business logic, authorization, and orchestrates database operations.
 * 
 * Based on: old vodichron deleteEmployee controller
 * Location: vodichron-backend-master/src/controllers/employeeController.ts (line 163-171)
 * 
 * Key Features:
 * - Authorization checks (only ADMIN_USERS can delete)
 * - Employee existence validation
 * - Comprehensive logging
 * - Proper error handling with typed errors
 * - Service-layer orchestration
 * 
 * Authorization Rules:
 * - Only HR and SuperUser roles can delete employees
 * - Employee must exist before deletion
 * 
 * Process Flow:
 * 1. Validate input (Zod schema)
 * 2. Check authorization (role-based)
 * 3. Check if employee exists
 * 4. Delete employee (via store layer)
 * 5. Return success response
 */

import { TRPCError } from '@trpc/server';
import { logger } from '../../../../utils/logger';
import { DeleteEmployeeInput, DeleteEmployeeOutput } from '../../schemas/crud/delete.schemas';
import { deleteEmployeeData, getEmployeeByUuid } from '../../stores/crud/delete.store';
import { ApplicationUserRole } from '../../types/employee.types';

/**
 * User Context Interface
 * =====================
 * Information about the authenticated user making the request
 */
interface UserContext {
  uuid: string;
  role: ApplicationUserRole;
  email: string;
}

/**
 * Authorization Helper
 * ===================
 * 
 * Checks if user has permission to delete employees.
 * Only HR and SuperUser roles are allowed.
 * 
 * ADMIN_USERS = [HR, SuperUser] (from old codebase)
 * 
 * @param userRole - Role of the authenticated user
 * @returns True if authorized, false otherwise
 */
function isAuthorizedToDelete(userRole: ApplicationUserRole): boolean {
  const ADMIN_USERS = [
    ApplicationUserRole.hr,
    ApplicationUserRole.superUser
  ];
  
  return ADMIN_USERS.includes(userRole);
}

/**
 * Delete Employee Service
 * =======================
 * 
 * Main service function to delete an employee.
 * Performs authorization checks and validates employee existence.
 * 
 * Authorization:
 * - Only HR and SuperUser can delete employees
 * 
 * Validation:
 * - Employee must exist in database
 * 
 * Error Handling:
 * - FORBIDDEN: User not authorized to delete
 * - NOT_FOUND: Employee not found
 * - INTERNAL_SERVER_ERROR: Database or unexpected errors
 * 
 * @param input - Delete employee input (validated by Zod)
 * @param user - Authenticated user context
 * @returns Success response with message
 * @throws TRPCError if validation or authorization fails
 */
export async function deleteEmployee(
  input: DeleteEmployeeInput,
  user: UserContext
): Promise<DeleteEmployeeOutput> {
  // ============================================================================
  // STEP 1: Log Incoming Request
  // ============================================================================
  logger.info('📥 Delete employee request received', {
    employeeUuid: input.employeeUuid,
    requestedBy: user.uuid,
    requestedByRole: user.role,
    requestedByEmail: user.email,
    operation: 'deleteEmployee'
  });

  try {
    // ==========================================================================
    // STEP 2: Authorization Check
    // ==========================================================================
    // Only HR and SuperUser can delete employees
    logger.debug('Checking authorization', {
      userRole: user.role,
      requiredRoles: ['hr', 'superUser']
    });

    if (!isAuthorizedToDelete(user.role)) {
      logger.warn('⛔ Unauthorized delete attempt', {
        employeeUuid: input.employeeUuid,
        userId: user.uuid,
        userRole: user.role,
        reason: 'User does not have permission to delete employees'
      });

      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied for the operation request.'
      });
    }

    logger.debug('✅ Authorization check passed', { userRole: user.role });

    // ==========================================================================
    // STEP 3: Check If Employee Exists
    // ==========================================================================
    // Validate that the employee exists before attempting deletion
    logger.debug('Checking if employee exists', {
      employeeUuid: input.employeeUuid
    });

    const existingEmployee = await getEmployeeByUuid(input.employeeUuid);

    if (!existingEmployee) {
      logger.warn('❌ Employee not found for deletion', {
        employeeUuid: input.employeeUuid,
        requestedBy: user.uuid
      });

      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Unable to find the employee to delete'
      });
    }

    logger.debug('✅ Employee found', {
      employeeUuid: input.employeeUuid,
      employeeName: existingEmployee.name,
      employeeEmail: existingEmployee.officialEmailId
    });

    // ==========================================================================
    // STEP 4: Delete Employee
    // ==========================================================================
    // Execute deletion via store layer
    logger.info('🗑️ Deleting employee', {
      employeeUuid: input.employeeUuid,
      employeeName: existingEmployee.name,
      deletedBy: user.uuid
    });

    await deleteEmployeeData(input.employeeUuid);

    // ==========================================================================
    // STEP 5: Log Success and Return
    // ==========================================================================
    logger.info('✅ Employee deleted successfully', {
      employeeUuid: input.employeeUuid,
      employeeName: existingEmployee.name,
      deletedBy: user.uuid,
      deletedByEmail: user.email
    });

    return {
      success: true,
      message: 'Employee deleted successfully'
    };

  } catch (error: any) {
    // ==========================================================================
    // STEP 6: Error Handling
    // ==========================================================================
    
    // If it's already a TRPCError, re-throw it
    if (error instanceof TRPCError) {
      throw error;
    }

    // Log unexpected errors
    logger.error('💥 Delete employee service error', {
      type: 'EMPLOYEE_DELETE_SERVICE_ERROR',
      employeeUuid: input.employeeUuid,
      userId: user.uuid,
      error: error?.message,
      stack: error?.stack
    });

    // Throw generic internal server error
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: error?.message || 'Failed to delete employee'
    });
  }
}
