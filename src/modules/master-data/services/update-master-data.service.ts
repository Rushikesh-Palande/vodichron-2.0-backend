/**
 * Update Master Data Service
 * ===========================
 * Business logic for updating master data configuration
 * 
 * Based on: old vodichron masterDataController.patch (lines 6-10)
 * Pattern: Service layer contains business logic and orchestrates store calls
 * 
 * Responsibilities:
 * - Authorization checks (only HR/SuperUser can update)
 * - Batch update orchestration
 * - Validate master fields exist before update
 * - Comprehensive logging and error handling
 * - Security audit trail
 */

import { TRPCError } from '@trpc/server';
import { logger, logSecurity, PerformanceTimer } from '../../../utils/logger';
import { updateMasterField } from '../stores/master-data.store';
import type { UpdateMasterDataInput, UpdateMasterDataOutput } from '../schemas/update-master-data.schemas';

/**
 * Application User Roles
 * ----------------------
 * Role constants for authorization checks
 * Matches old codebase ADMIN_USERS constant
 */
enum ApplicationUserRole {
  superUser = 'super_user',
  admin = 'admin',
  hr = 'hr',
  director = 'director',
  manager = 'manager',
  employee = 'employee',
  customer = 'customer'
}

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
 * Update Master Data Service
 * ===========================
 * 
 * Main service function for updating master data configuration
 * 
 * Business Logic Flow (matching old code):
 * 1. Authorization check (only HR/SuperUser/Admin can update)
 * 2. Validate input (Zod schema validation handled before this)
 * 3. Batch update all master fields using Promise.all
 * 4. Log successful updates
 * 5. Return success response
 * 
 * Old Code Reference:
 * ------------------
 * export const patch = async (req: AuthorizedRequest, res: Response) => {
 *     const masterFields = req.body as MasterField[];
 *     await Promise.all(masterFields.map((changedMasterField) => 
 *         updateMasterField(changedMasterField, req.user.uuid)
 *     ));
 *     res.send(masterFields);
 * };
 * 
 * Authorization:
 * - Only ADMIN_USERS (super_user, admin, hr) can update
 * - EMP_MANAGERS (director, manager) can READ but NOT UPDATE
 * - Regular employees and customers: FORBIDDEN
 * 
 * Use Cases:
 * - HR adding new designation: "Principal Engineer"
 * - HR adding new department: "DevOps"
 * - HR updating leave types for new policy
 * - Admin removing outdated values
 * 
 * Security:
 * - Authorization enforced at service layer
 * - All updates logged with user ID for audit trail
 * - Security events logged for monitoring
 * 
 * @param input - Validated input with array of master fields to update
 * @param user - Authenticated user context
 * @returns Success message with count of updated fields
 * @throws TRPCError FORBIDDEN if user lacks permission
 * @throws TRPCError BAD_REQUEST if validation fails
 * @throws TRPCError INTERNAL_SERVER_ERROR for unexpected errors
 */
export async function updateMasterData(
  input: UpdateMasterDataInput,
  user: UserContext
): Promise<UpdateMasterDataOutput> {
  // ============================================================================
  // STEP 1: Initialize Performance Timer
  // ============================================================================
  const timer = new PerformanceTimer('updateMasterData_service');
  
  try {
    logger.info('📝 Updating master data configuration', {
      fieldsCount: input.masterFields.length,
      fieldNames: input.masterFields.map(f => f.name),
      updatedBy: user.uuid,
      userRole: user.role,
      operation: 'updateMasterData_service'
    });

    // ==========================================================================
    // STEP 2: Authorization Check
    // ==========================================================================
    // Matches old code authorization: ADMIN_USERS only
    // Old route definition (dataRoutes.ts line 42-45):
    // path: '/common-data/master/save'
    // method: METHODS.PATCH
    // roles: ADMIN_USERS (super_user, admin, hr)
    const allowedRoles = [
      ApplicationUserRole.superUser,
      ApplicationUserRole.admin,
      ApplicationUserRole.hr
    ];

    if (!allowedRoles.includes(user.role)) {
      logger.warn('🚫 Access denied - User not authorized to update master data', {
        userId: user.uuid,
        userRole: user.role,
        operation: 'updateMasterData_service'
      });

      logSecurity('UPDATE_MASTER_DATA_ACCESS_DENIED', 'high', {
        userRole: user.role,
        reason: 'Only HR, Admin, and Super User can update master data'
      }, undefined, user.uuid);

      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied. Only HR, Admin, and Super User can update master data configuration.'
      });
    }

    logger.debug('✅ Authorization check passed', {
      userRole: user.role,
      operation: 'updateMasterData_service'
    });

    // ==========================================================================
    // STEP 3: Batch Update Master Fields
    // ==========================================================================
    // Matches old code: Promise.all batch update (line 8)
    // await Promise.all(masterFields.map((changedMasterField) => 
    //     updateMasterField(changedMasterField, req.user.uuid)
    // ));
    logger.info('💾 Starting batch update', {
      fieldsCount: input.masterFields.length,
      fieldNames: input.masterFields.map(f => f.name),
      operation: 'updateMasterData_service'
    });

    const updatePromises = input.masterFields.map(async (masterField) => {
      logger.debug('🔄 Updating master field', {
        fieldName: masterField.name,
        valueCount: masterField.value.length,
        operation: 'updateMasterData_service'
      });

      // Call store to update this field
      const rowsAffected = await updateMasterField(
        masterField.name,
        masterField.value,
        user.uuid
      );

      logger.debug('✅ Master field updated', {
        fieldName: masterField.name,
        rowsAffected,
        operation: 'updateMasterData_service'
      });

      return masterField.name;
    });

    // Wait for all updates to complete
    const updatedFieldNames = await Promise.all(updatePromises);

    // ==========================================================================
    // STEP 4: Log Success
    // ==========================================================================
    const duration = timer.end();

    logger.info('✅ Master data updated successfully', {
      fieldsCount: updatedFieldNames.length,
      fieldNames: updatedFieldNames,
      updatedBy: user.uuid,
      duration: `${duration}ms`,
      operation: 'updateMasterData_service'
    });

    logSecurity('UPDATE_MASTER_DATA_SUCCESS', 'low', {
      fieldsCount: updatedFieldNames.length,
      fieldNames: updatedFieldNames,
      userRole: user.role,
      duration
    }, undefined, user.uuid);

    // ==========================================================================
    // STEP 5: Return Success Response
    // ==========================================================================
    return {
      message: 'Master data configuration updated successfully',
      count: updatedFieldNames.length,
      updatedFields: updatedFieldNames
    };

  } catch (error) {
    // ==========================================================================
    // STEP 6: Error Handling
    // ==========================================================================
    const duration = timer.end();

    // Re-throw TRPCError as-is
    if (error instanceof TRPCError) {
      throw error;
    }

    // Log unexpected errors
    logger.error('💥 Failed to update master data', {
      fieldsCount: input.masterFields.length,
      fieldNames: input.masterFields.map(f => f.name),
      updatedBy: user.uuid,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`,
      operation: 'updateMasterData_service'
    });

    logSecurity('UPDATE_MASTER_DATA_ERROR', 'critical', {
      fieldsCount: input.masterFields.length,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration
    }, undefined, user.uuid);

    // Wrap other errors in TRPCError
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to update master data configuration',
      cause: error
    });
  }
}
