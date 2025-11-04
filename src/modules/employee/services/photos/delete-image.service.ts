/**
 * Delete Employee Image Service
 * ==============================
 * 
 * Service layer for employee image deletion with file handling.
 * Based on: old vodichron deleteEmployeeImage controller (lines 473-488)
 * 
 * Process Flow:
 * 1. Fetch employee record from database
 * 2. Check if employee exists
 * 3. If employee has photo:
 *    a. Update database (set recentPhotograph to empty string)
 *    b. Delete physical file from filesystem
 * 4. Return success
 * 
 * File Operations:
 * - Delete from: {assetPath}/employee_documents/{filename}
 * - Uses fs.unlinkSync for synchronous deletion
 */

import fs from 'fs';
import path from 'path';
import { logger } from '../../../../utils/logger';
import { getEmployeePhotoInfo } from '../../stores/photos/get-image.store';
import { updateEmployeePhoto } from '../../stores/photos/update-photo.store';
import { DeleteImageInput, DeleteImageOutput } from '../../schemas/photos/delete-image.schemas';

/**
 * User Context Interface
 * =====================
 */
interface UserContext {
  uuid: string;
  role: string;
  email: string;
}

/**
 * Service Configuration Interface
 * ===============================
 */
interface ServiceConfig {
  assetPath: string;
}

/**
 * Delete Employee Image Service
 * =============================
 * 
 * Main service function for image deletion.
 * 
 * Old code logic (lines 473-488):
 * 1. Fetch employee by UUID
 * 2. If not found: throw NotFoundError
 * 3. If employee.recentPhotograph exists:
 *    - Update database (set to empty string)
 *    - Delete file from filesystem
 * 4. Return success
 * 
 * Authorization:
 * - No explicit authorization in old code
 * - Should ideally restrict to self or HR/Admin
 * 
 * @param input - Delete image request (employee ID)
 * @param user - Authenticated user context
 * @param config - Service configuration (asset path)
 * @returns Delete result
 */
export async function deleteEmployeeImage(
  input: DeleteImageInput,
  user: UserContext,
  config: ServiceConfig
): Promise<DeleteImageOutput> {
  // ============================================================================
  // STEP 1: Log Incoming Request
  // ============================================================================
  logger.info('🗑️ Delete employee image request received', {
    employeeId: input.id,
    requestedBy: user.uuid,
    operation: 'deleteEmployeeImage'
  });

  try {
    // ==========================================================================
    // STEP 2: Fetch Employee Photo Information
    // ==========================================================================
    const employeeInfo = await getEmployeePhotoInfo(input.id);

    // ==========================================================================
    // STEP 3: Check if Employee Exists
    // ==========================================================================
    // Matches old code lines 475-478
    if (!employeeInfo) {
      logger.warn('❌ Employee not found', {
        employeeId: input.id,
        requestedBy: user.uuid
      });

      throw new Error('Unable to find the employee');
    }

    const fileName = employeeInfo.recentPhotograph;

    // ==========================================================================
    // STEP 4: Check if Employee Has Photo to Delete
    // ==========================================================================
    if (!fileName) {
      logger.info('ℹ️ No photo to delete (employee has no photo)', {
        employeeId: input.id,
        employeeName: employeeInfo.name,
        requestedBy: user.uuid
      });

      return {
        success: true,
        message: 'No photo to delete',
      };
    }

    // ==========================================================================
    // STEP 5: Update Database (Set recentPhotograph to Empty)
    // ==========================================================================
    // Matches old code line 484
    logger.debug('📝 Updating database to clear photo field', {
      employeeId: input.id,
      fileName
    });

    await updateEmployeePhoto('', input.id);

    logger.info('✅ Database updated - photo field cleared', {
      employeeId: input.id,
      deletedFileName: fileName
    });

    // ==========================================================================
    // STEP 6: Delete Physical File from Filesystem
    // ==========================================================================
    // Matches old code lines 479-481, 485
    const filePath = path.join(config.assetPath, 'employee_documents', fileName);

    logger.debug('📁 Deleting physical file', {
      employeeId: input.id,
      filePath
    });

    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        
        logger.info('✅ Physical file deleted successfully', {
          employeeId: input.id,
          fileName,
          filePath
        });
      } else {
        logger.warn('⚠️ File not found on filesystem (already deleted or missing)', {
          employeeId: input.id,
          fileName,
          filePath
        });
      }
    } catch (fileError: any) {
      // Log file deletion error but don't fail the operation
      // Database is already updated, which is the source of truth
      logger.error('❌ Failed to delete physical file (database already updated)', {
        employeeId: input.id,
        fileName,
        filePath,
        error: fileError.message
      });
    }

    // ==========================================================================
    // STEP 7: Return Success Response
    // ==========================================================================
    logger.info('✅ Employee image deleted successfully', {
      employeeId: input.id,
      employeeName: employeeInfo.name,
      deletedFileName: fileName,
      requestedBy: user.uuid
    });

    return {
      success: true,
      message: 'Employee image deleted successfully',
    };

  } catch (error: any) {
    // ==========================================================================
    // STEP 8: Error Handling
    // ==========================================================================
    logger.error('💥 Delete employee image service error', {
      type: 'DELETE_IMAGE_SERVICE_ERROR',
      employeeId: input.id,
      error: error?.message,
      stack: error?.stack,
      requestedBy: user.uuid
    });

    // Re-throw error to be handled by controller
    throw error;
  }
}
