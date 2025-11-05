/**
 * Upload Photo Controller (Express REST API)
 * ==========================================
 * 
 * Controller for employee photo upload with multer file handling.
 * Based on: old vodichron uploadEmployeePhoto controller (lines 417-455)
 * 
 * Pattern:
 * Controller (Express + Multer) → Service (business logic) → Store (database)
 * 
 * Endpoint: POST /api/employees/photo/upload
 * 
 * Request:
 * - Content-Type: multipart/form-data
 * - Body Fields:
 *   - userId: string (employee UUID)
 *   - fileupload: file (the actual photo file)
 * - Headers: Authorization (JWT token)
 * 
 * Response (Success - 201):
 * {
 *   success: true,
 *   message: "File uploaded successfully",
 *   data: {
 *     fileName: "uuid.jpg"
 *   }
 * }
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { uploadEmployeePhoto, MulterFile } from '../../services/photos/upload-photo.service';
import { uploadPhotoInputSchema } from '../../schemas/photos/upload-photo.schemas';
import config from '../../../../config';

/**
 * Upload Employee Photo - Express Controller
 * ==========================================
 * 
 * Thin wrapper that validates input and delegates to service layer.
 * 
 * Authorization:
 * - User must be authenticated (middleware)
 * - ORG_USERS (employees can only upload their own photo)
 * - Service layer enforces userId === logged-in user
 * 
 * Multer Middleware:
 * - File upload handled by multer middleware (attached before this controller)
 * - File available in req.file
 * - Form fields available in req.body
 * 
 * @param req - Express request with multipart/form-data
 * @param res - Express response
 */
export async function uploadPhotoExpressController(req: Request, res: Response) {
  try {
    // ==========================================================================
    // STEP 1: Log Incoming Request
    // ==========================================================================
    logger.info('📤 Photo upload request received (Express)', {
      userId: req.body.userId,
      hasFile: !!req.file,
      requestedBy: (req as any).user?.uuid,
      endpoint: 'POST /employees/photo/upload'
    });

    // ==========================================================================
    // STEP 2: Validate File Exists
    // ==========================================================================
    // Matches old code lines 418-419
    if (!req.file || Object.keys(req.file).length === 0) {
      logger.warn('⛔ No file uploaded', {
        userId: req.body.userId
      });

      return res.status(400).json({
        success: false,
        message: 'No files were uploaded.',
        timestamp: new Date().toISOString()
      });
    }

    // ==========================================================================
    // STEP 3: Extract and Validate User Context
    // ==========================================================================
    const user = (req as any).user;
    
    if (!user) {
      logger.warn('⛔ Unauthenticated upload attempt', {
        userId: req.body.userId
      });

      return res.status(401).json({
        success: false,
        message: 'Unauthorized - User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    // ==========================================================================
    // STEP 4: Validate Input Schema
    // ==========================================================================
    const validatedInput = uploadPhotoInputSchema.parse({
      userId: req.body.userId,
    });

    // ==========================================================================
    // STEP 5: Get Service Configuration
    // ==========================================================================
    // Matches old code lines 421, 436
    const assetPath = config.asset.path;
    const allowUpload = config.asset.allowUpload;

    const serviceConfig = {
      assetPath,
      allowUpload,
    };

    // ==========================================================================
    // STEP 6: Call Service Layer
    // ==========================================================================
    const result = await uploadEmployeePhoto(
      validatedInput,
      req.file as MulterFile,
      {
        uuid: user.uuid,
        role: user.role,
        email: user.email || ''
      },
      serviceConfig
    );

    // ==========================================================================
    // STEP 7: Send Success Response
    // ==========================================================================
    logger.info('✅ Photo uploaded successfully (Express)', {
      userId: validatedInput.userId,
      fileName: result.fileName
    });

    // Match old response format: res.status(201).send(message)
    return res.status(201).json({
      success: true,
      message: result.message,
      data: {
        fileName: result.fileName,
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    // ==========================================================================
    // STEP 8: Error Handling
    // ==========================================================================
    logger.error('💥 Upload photo controller error', {
      type: 'UPLOAD_PHOTO_CONTROLLER_ERROR',
      userId: req.body?.userId,
      error: error?.message,
      stack: error?.stack
    });

    // Map error codes to HTTP status codes
    let statusCode = 500;
    let errorMessage = error?.message || 'Failed to upload photo';

    if (error?.name === 'ZodError') {
      statusCode = 400;
      errorMessage = 'Invalid upload parameters';
    } else if (error?.message?.includes('Access denied')) {
      statusCode = 403;
    } else if (error?.message?.includes('Uploads are not allowed')) {
      statusCode = 403;
    }

    // Send error response
    return res.status(statusCode).json({
      success: false,
      message: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
}
