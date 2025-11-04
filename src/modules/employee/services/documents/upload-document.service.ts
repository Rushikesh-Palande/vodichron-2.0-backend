/**
 * Upload Document Service
 * =======================
 * 
 * Service layer for employee document upload with file handling.
 * Based on: old vodichron uploadEmployeeDocument controller (lines 302-344)
 * 
 * Process Flow:
 * 1. Check if uploads are allowed (config check)
 * 2. Validate authorization (user can only upload own documents)
 * 3. Move file from temp location to permanent storage
 * 4. Save document metadata to database
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
import { insertEmployeeDocument } from '../../stores/documents/upload-document.store';
import { UploadDocumentInput, UploadDocumentOutput } from '../../schemas/documents/upload-document.schemas';

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
 * Upload Employee Document Service
 * ================================
 * 
 * Main service function for document upload.
 * 
 * Authorization Logic (old code lines 314-317):
 * - Employees can ONLY upload documents for themselves
 * - userId in request MUST match logged-in user UUID
 * - If not: throw ForbiddenError and delete uploaded file
 * 
 * File Handling (old code lines 319-329):
 * - Generate UUID-based filename to prevent collisions
 * - Move file from temp upload dir to permanent storage
 * - Store in: {assetPath}/employee_documents/
 * 
 * Error Handling:
 * - If file move fails: delete temp file and throw error
 * - If database insert fails: delete permanent file and throw error
 * 
 * @param input - Document upload request (userId, documentType)
 * @param file - Uploaded file from multer
 * @param user - Authenticated user context
 * @param config - Service configuration (asset path, upload enabled)
 * @returns Upload result with document ID and filename
 */
export async function uploadEmployeeDocument(
  input: UploadDocumentInput,
  file: MulterFile,
  user: UserContext,
  config: ServiceConfig
): Promise<UploadDocumentOutput> {
  // ============================================================================
  // STEP 1: Log Incoming Request
  // ============================================================================
  logger.info('📤 Document upload request received', {
    userId: input.userId,
    documentType: input.documentType,
    originalFilename: file.originalname,
    fileSize: file.size,
    requestedBy: user.uuid,
    operation: 'uploadEmployeeDocument'
  });

  try {
    // ==========================================================================
    // STEP 2: Check if Uploads are Allowed
    // ==========================================================================
    // Matches old code lines 306-311
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
    // Matches old code lines 314-317 with enhancement for HR registration
    // IMPORTANT: 
    // - Regular employees can ONLY upload documents for themselves
    // - HR, admin, super_user can upload documents for any employee (for registration)
    const privilegedRoles = ['super_user', 'admin', 'hr'];
    const isPrivilegedUser = privilegedRoles.includes(user.role);
    const isUploadingForSelf = input.userId === user.uuid;

    if (!isUploadingForSelf && !isPrivilegedUser) {
      logger.warn('⛔ Unauthorized document upload attempt', {
        requestedFor: input.userId,
        attemptedBy: user.uuid,
        userRole: user.role,
        reason: 'User attempting to upload document for another employee without privilege'
      });

      // Delete uploaded file (security cleanup)
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      throw new Error('Access denied - You can only upload documents for yourself');
    }

    logger.debug('✅ Authorization check passed', {
      requestedFor: input.userId,
      attemptedBy: user.uuid,
      userRole: user.role,
      isPrivileged: isPrivilegedUser,
      isSelf: isUploadingForSelf
    });

    // ==========================================================================
    // STEP 4: Prepare File Storage
    // ==========================================================================
    // Matches old code lines 319-323
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
    // Matches old code lines 324-329
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
    // STEP 7: Save Document Metadata to Database
    // ==========================================================================
    // Matches old code lines 330-339
    const documentData = {
      documentType: input.documentType,
      fileName: newFileName,
    };

    let documentId: string;
    try {
      documentId = await insertEmployeeDocument(documentData, input.userId);

      logger.info('✅ Document metadata saved to database', {
        documentId,
        userId: input.userId,
        documentType: input.documentType,
        fileName: newFileName
      });
    } catch (dbError: any) {
      logger.error('❌ Database insert failed, cleaning up file', {
        error: dbError.message,
        fileName: newFileName
      });

      // Cleanup: Delete file since database insert failed
      if (fs.existsSync(newFilePath)) {
        fs.unlinkSync(newFilePath);
      }

      throw new Error('Something went wrong when uploading the file. Please try again.');
    }

    // ==========================================================================
    // STEP 8: Return Success Response
    // ==========================================================================
    // Matches old code line 341
    const result: UploadDocumentOutput = {
      uuid: documentId,
      message: `File uploaded successfully`,
      fileName: newFileName,
    };

    logger.info('✅ Document upload completed successfully', {
      documentId,
      userId: input.userId,
      documentType: input.documentType,
      fileName: newFileName,
      fileSize: file.size
    });

    return result;

  } catch (error: any) {
    // ==========================================================================
    // STEP 9: Error Handling
    // ==========================================================================
    logger.error('💥 Document upload service error', {
      type: 'DOCUMENT_UPLOAD_SERVICE_ERROR',
      userId: input.userId,
      documentType: input.documentType,
      error: error?.message,
      stack: error?.stack
    });

    // Re-throw error to be handled by controller
    throw error;
  }
}
