/**
 * Download Employee Document Controller (Express REST API)
 * =========================================================
 * 
 * Controller for downloading employee documents as file attachments.
 * Based on: old vodichron downloadEmployeeDocument controller (lines 373-390)
 * 
 * Pattern:
 * Controller (Express) → Service (business logic) → Store (database)
 * 
 * Endpoint: GET /api/employees/document/download/:empid/:docid
 * 
 * Request:
 * - URL Parameters: 
 *   - empid: Employee UUID who owns the document
 *   - docid: Document UUID to download
 * - Headers: Authorization (JWT token)
 * 
 * Response:
 * - Binary file download (application/octet-stream or specific MIME type)
 * - Content-Disposition header for file download
 * - Uses res.sendFile() to stream file to client
 * 
 * Authorization:
 * - Employees can download their own documents
 * - HR/SuperUser can download any employee's documents
 */

import { Request, Response } from 'express';
import path from 'path';
import { logger } from '../../../../utils/logger';
import { downloadEmployeeDocument } from '../../services/documents/download-employee-document.service';
import { downloadEmployeeDocumentInputSchema } from '../../schemas/documents/download-employee-document.schemas';
import config from '../../../../config';

/**
 * Download Employee Document - Express Controller
 * ===============================================
 * 
 * Sends document file as download to client.
 * 
 * Authorization:
 * - User must be authenticated (middleware)
 * - Service layer enforces: self OR HR/SuperUser
 * 
 * Old code (lines 388-389):
 * - res.contentType(path.basename(filePath));
 * - res.sendFile(filePath);
 * 
 * @param req - Express request with params.empid and params.docid
 * @param res - Express response
 */
export async function downloadEmployeeDocumentExpressController(req: Request, res: Response) {
  try {
    // ==========================================================================
    // STEP 1: Log Incoming Request
    // ==========================================================================
    logger.info('📥 Download employee document request received (Express)', {
      employeeId: req.params.empid,
      documentId: req.params.docid,
      requestedBy: (req as any).user?.uuid,
      endpoint: 'GET /employees/document/download/:empid/:docid'
    });

    // ==========================================================================
    // STEP 2: Extract and Validate User Context
    // ==========================================================================
    const user = (req as any).user;
    
    if (!user) {
      logger.warn('⛔ Unauthenticated document download attempt', {
        employeeId: req.params.empid,
        documentId: req.params.docid
      });

      return res.status(401).json({
        success: false,
        message: 'Unauthorized - User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    // ==========================================================================
    // STEP 3: Validate Input Schema
    // ==========================================================================
    const validatedInput = downloadEmployeeDocumentInputSchema.parse({
      employeeId: req.params.empid,
      documentId: req.params.docid,
    });

    // ==========================================================================
    // STEP 4: Get Asset Path from Config (line 386)
    // ==========================================================================
    const assetPath = config.asset.path;

    if (!assetPath) {
      logger.error('❌ Asset path not configured', {
        documentId: req.params.docid
      });

      return res.status(500).json({
        success: false,
        message: 'Server configuration error - asset path not configured',
        timestamp: new Date().toISOString()
      });
    }

    // ==========================================================================
    // STEP 5: Call Service Layer
    // ==========================================================================
    const result = await downloadEmployeeDocument(
      validatedInput,
      {
        uuid: user.uuid,
        role: user.role,
        email: user.email || ''
      },
      assetPath
    );

    // ==========================================================================
    // STEP 6: Send File to Client (lines 388-389)
    // ==========================================================================
    logger.info('✅ Sending document file to client', {
      employeeId: req.params.empid,
      documentId: req.params.docid,
      fileName: result.document.fileName,
      filePath: result.filePath,
      downloadedBy: user.uuid
    });

    // Set content type based on file extension (old code line 388)
    res.contentType(path.basename(result.filePath));

    // Send file as download (old code line 389)
    res.sendFile(result.filePath, (err) => {
      if (err) {
        logger.error('💥 Error sending file', {
          employeeId: req.params.empid,
          documentId: req.params.docid,
          filePath: result.filePath,
          error: err.message
        });

        // Check if response was already sent
        if (!res.headersSent) {
          return res.status(500).json({
            success: false,
            message: 'Error downloading file - file may not exist on server',
            timestamp: new Date().toISOString()
          });
        }
      } else {
        logger.info('✅ File sent successfully', {
          employeeId: req.params.empid,
          documentId: req.params.docid,
          fileName: result.document.fileName
        });
      }
    });

  } catch (error: any) {
    // ==========================================================================
    // STEP 7: Error Handling
    // ==========================================================================
    logger.error('💥 Download employee document controller error', {
      type: 'DOWNLOAD_EMPLOYEE_DOCUMENT_CONTROLLER_ERROR',
      employeeId: req.params?.empid,
      documentId: req.params?.docid,
      error: error?.message,
      stack: error?.stack
    });

    // Map error codes to HTTP status codes
    let statusCode = 500;
    let errorMessage = error?.message || 'Failed to download document';

    if (error?.name === 'ZodError') {
      statusCode = 400;
      errorMessage = 'Invalid employee ID or document ID';
    } else if (error?.message?.includes('Access denied')) {
      statusCode = 403;
    } else if (error?.message?.includes('not found')) {
      statusCode = 404;
      errorMessage = 'Document not found';
    }

    // Send error response
    return res.status(statusCode).json({
      success: false,
      message: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
}
