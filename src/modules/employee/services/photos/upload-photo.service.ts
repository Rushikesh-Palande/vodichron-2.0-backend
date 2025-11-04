/**
 * Upload Photo Service
 * ====================
 * 
 * Service layer for employee photo upload with file handling.
 * Based on: old vodichron uploadEmployeePhoto controller (lines 417-455)
 * 
 * Process Flow:
 * 1. Check if uploads are allowed (config check)
 * 2. Validate authorization (user can only upload own photo)
 * 3. Move file from temp location to permanent storage
 * 4. Update employee's recentPhotograph field in database
 * 5. Handle errors and cleanup files on failure
 * 
 * File Storage:
 * - Files stored in: {assetPath}/employee_documents/
 * - Filename format: {uuid}{extension}
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../../../utils/logger';
import { updateEmployeePhoto } from '../../stores/photos/update-photo.store';
import { UploadPhotoInput, UploadPhotoOutput } from '../../schemas/photos/upload-photo.schemas';

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
 * Multer File Interface
 * ====================
 * 
 * File object from multer middleware
 */
export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  destination: string;
  filename: string;
  path: string;
  size: number;
}

/**
 * Service Configuration Interface
 * ===============================
 */
interface ServiceConfig {
  assetPath: string;
  allowUpload: boolean;
}

/**
 * Upload Employee Photo Service
 * =============================
 * 
 * Main service function for photo upload.
 * 
 * Authorization Logic (old code lines 429-432):
 * - Employees can ONLY upload photos for themselves
 * - userId in request MUST match logged-in user UUID
 * - If not: throw ForbiddenError and delete uploaded file
 * 
 * File Handling (old code lines 434-444):
 * - Generate UUID-based filename to prevent collisions
 * - Move file from temp upload dir to permanent storage
 * - Store in: {assetPath}/employee_documents/
 * 
 * Error Handling:
 * - If file move fails: delete temp file and throw error
 * - If database update fails: delete permanent file and throw error
 * 
 * @param input - Photo upload request (userId)
 * @param file - Uploaded file from multer
 * @param user - Authenticated user context
 * @param config - Service configuration (asset path, upload enabled)
 * @returns Upload result with filename
 */
export async function uploadEmployeePhoto(
  input: UploadPhotoInput,
  file: MulterFile,
  user: UserContext,
  config: ServiceConfig
): Promise<UploadPhotoOutput> {
  // ============================================================================
  // STEP 1: Log Incoming Request
  // ============================================================================
  logger.info('📤 Photo upload request received', {
    userId: input.userId,
    originalFilename: file.originalname,
    fileSize: file.size,
    requestedBy: user.uuid,
    operation: 'uploadEmployeePhoto'
  });

  try {
    // ==========================================================================
    // STEP 2: Check if Uploads are Allowed
    // ==========================================================================
    // Matches old code lines 421-426
    if (!config.allowUpload) {
      logger.warn('⛔ Upload attempt while uploads are disabled', {
        userId: input.userId,
        attemptedBy: user.uuid
      });

      // Delete uploaded file
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      throw new Error('Uploads are not allowed at the moment, check with the support team for more information');
    }

    // ==========================================================================
    // STEP 3: Validate Authorization
    // ==========================================================================
    // Matches old code lines 429-432
    // IMPORTANT: Employees can ONLY upload photos for themselves
    if (input.userId !== user.uuid) {
      logger.warn('⛔ Unauthorized photo upload attempt', {
        requestedFor: input.userId,
        attemptedBy: user.uuid,
        reason: 'User attempting to upload photo for another employee'
      });

      // Delete uploaded file (security cleanup)
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      throw new Error('Access denied - You can only upload your own photo');
    }

    // ==========================================================================
    // STEP 4: Prepare File Storage
    // ==========================================================================
    // Matches old code lines 434-438
    const oldPath = file.path; // Temp file from multer
    const fileExtension = path.extname(file.originalname);
    const newFileName = `${uuidv4()}${fileExtension}`; // UUID-based filename
    const employeeDocsDir = path.join(config.assetPath, 'employee_documents');
    const newFilePath = path.join(employeeDocsDir, newFileName);

    logger.debug('📁 Preparing file storage', {
      oldPath,
      newFilePath,
      fileName: newFileName,
      extension: fileExtension
    });

    // ==========================================================================
    // STEP 5: Ensure Directory Exists
    // ==========================================================================
    if (!fs.existsSync(employeeDocsDir)) {
      logger.info('📁 Creating employee documents directory', {
        path: employeeDocsDir
      });
      fs.mkdirSync(employeeDocsDir, { recursive: true });
    }

    // ==========================================================================
    // STEP 6: Move File to Permanent Storage
    // ==========================================================================
    // Matches old code lines 439-444
    try {
      fs.renameSync(oldPath, newFilePath);
      
      logger.info('✅ File moved to permanent storage', {
        fileName: newFileName,
        path: newFilePath,
        size: file.size
      });
    } catch (moveError: any) {
      logger.error('❌ Failed to move file', {
        error: moveError.message,
        oldPath,
        newFilePath
      });

      // Cleanup temp file if still exists
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }

      throw new Error('Something went wrong when uploading the file. Please try again.');
    }

    // ==========================================================================
    // STEP 7: Update Database with New Photo Filename
    // ==========================================================================
    // Matches old code lines 445-450
    try {
      await updateEmployeePhoto(newFileName, input.userId);

      logger.info('✅ Employee photo field updated in database', {
        userId: input.userId,
        fileName: newFileName
      });
    } catch (dbError: any) {
      logger.error('❌ Database update failed, cleaning up file', {
        error: dbError.message,
        fileName: newFileName
      });

      // Cleanup: Delete file since database update failed
      if (fs.existsSync(newFilePath)) {
        fs.unlinkSync(newFilePath);
      }

      throw new Error('Something went wrong when uploading the file. Please try again.');
    }

    // ==========================================================================
    // STEP 8: Return Success Response
    // ==========================================================================
    // Matches old code line 452
    const result: UploadPhotoOutput = {
      message: `File uploaded successfully`,
      fileName: newFileName,
    };

    logger.info('✅ Photo upload completed successfully', {
      userId: input.userId,
      fileName: newFileName,
      fileSize: file.size
    });

    return result;

  } catch (error: any) {
    // ==========================================================================
    // STEP 9: Error Handling
    // ==========================================================================
    logger.error('💥 Photo upload service error', {
      type: 'PHOTO_UPLOAD_SERVICE_ERROR',
      userId: input.userId,
      error: error?.message,
      stack: error?.stack
    });

    // Re-throw error to be handled by controller
    throw error;
  }
}
