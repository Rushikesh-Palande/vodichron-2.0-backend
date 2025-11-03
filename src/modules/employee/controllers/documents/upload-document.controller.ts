/**
 * Upload Document Controller (Express REST API)
 * =============================================
 * 
 * Controller for employee document upload with multer file handling.
 * Based on: old vodichron uploadEmployeeDocument controller (lines 302-344)
 * 
 * Pattern:
 * Controller (Express + Multer) → Service (business logic) → Store (database)
 * 
 * Endpoint: POST /api/employees/document/upload
 * 
 * Request:
 * - Content-Type: multipart/form-data
 * - Body Fields:
 *   - userId: string (employee UUID)
 *   - documentType: string (document type)
 *   - fileupload: file (the actual document file)
 * - Headers: Authorization (JWT token)
 * 
 * Response (Success - 201):
 * {
 *   success: true,
 *   message: "File uploaded successfully",
 *   data: {
 *     documentId: "uuid...",
 *     fileName: "uuid.pdf"
 *   }
 * }
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { uploadEmployeeDocument, MulterFile } from '../../services/documents/upload-document.service';
import { uploadDocumentInputSchema } from '../../schemas/documents/upload-document.schemas';
import config from '../../../../config';

/**
 * Upload Employee Document - Express Controller
 * =============================================
 * 
 * Thin wrapper that validates input and delegates to service layer.
 * 
 * Authorization:
 * - User must be authenticated (middleware)
 * - ORG_USERS (employees can only upload their own documents)
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
export async function uploadDocumentExpressController(req: Request, res: Response) {
  try {
    // ==========================================================================
    // STEP 1: Log Incoming Request
    // ==========================================================================
    logger.info('📤 Document upload request received (Express)', {
      userId: req.body.userId,
      documentType: req.body.documentType,
      hasFile: !!req.file,
      requestedBy: (req as any).user?.uuid,
      endpoint: 'POST /employees/document/upload'
    });

    // ==========================================================================
    // STEP 2: Validate File Exists
    // ==========================================================================
    // Matches old code lines 303-304
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
    const validatedInput = uploadDocumentInputSchema.parse({
      userId: req.body.userId,
      documentType: req.body.documentType,
    });

    // ==========================================================================
    // STEP 5: Get Service Configuration
    // ==========================================================================
    // Matches old code lines 306, 321
    const assetPath = config.asset.path;
    const allowUpload = config.asset.allowUpload;

    const serviceConfig = {
      assetPath,
      allowUpload,
    };

    // ==========================================================================
    // STEP 6: Call Service Layer
    // ==========================================================================
    const result = await uploadEmployeeDocument(
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
    logger.info('✅ Document uploaded successfully (Express)', {
      documentId: result.uuid,
      userId: validatedInput.userId,
      documentType: validatedInput.documentType,
      fileName: result.fileName
    });

    // Match old response format: res.status(201).send(message)
    return res.status(201).json({
      success: true,
      message: result.message,
      data: {
        documentId: result.uuid,
        fileName: result.fileName,
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    // ==========================================================================
    // STEP 8: Error Handling
    // ==========================================================================
    logger.error('💥 Upload document controller error', {
      type: 'UPLOAD_DOCUMENT_CONTROLLER_ERROR',
      userId: req.body?.userId,
      error: error?.message,
      stack: error?.stack
    });

    // Map error codes to HTTP status codes
    let statusCode = 500;
    let errorMessage = error?.message || 'Failed to upload document';

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
