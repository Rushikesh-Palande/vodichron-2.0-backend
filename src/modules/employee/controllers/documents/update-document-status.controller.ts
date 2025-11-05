/**
 * Update Document Status Controller (Express REST API)
 * =====================================================
 * 
 * Controller for HR approval/rejection of employee documents.
 * Based on: old vodichron updateDocumentStatus controller (lines 406-415)
 * 
 * Pattern:
 * Controller (Express) → Service (business logic) → Store (database)
 * 
 * Endpoint: PATCH /api/employees/document/approve/:docid
 * 
 * Request:
 * - URL Parameter: docid (document UUID)
 * - Body: { approvalStatus: 'APPROVED' | 'REJECTED', comment: string }
 * - Headers: Authorization (JWT token)
 * 
 * Response (Success - 200):
 * {
 *   success: true,
 *   message: "Document status updated successfully"
 * }
 * 
 * Authorization:
 * - ONLY HR/SuperUser roles
 * - Service layer enforces authorization
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { updateDocumentStatus } from '../../services/documents/update-document-status.service';
import { updateDocumentStatusInputSchema } from '../../schemas/documents/update-document-status.schemas';

/**
 * Update Document Status - Express Controller
 * ===========================================
 * 
 * Thin wrapper that validates input and delegates to service layer.
 * 
 * Authorization:
 * - User must be authenticated (middleware)
 * - Service enforces HR/SuperUser only
 * 
 * @param req - Express request with params.docid and body {approvalStatus, comment}
 * @param res - Express response
 */
export async function updateDocumentStatusExpressController(req: Request, res: Response) {
  try {
    // ==========================================================================
    // STEP 1: Log Incoming Request
    // ==========================================================================
    logger.info('📥 Update document status request received (Express)', {
      documentId: req.params.docid,
      approvalStatus: req.body.approvalStatus,
      requestedBy: (req as any).user?.uuid,
      endpoint: 'PATCH /employees/document/approve/:docid'
    });

    // ==========================================================================
    // STEP 2: Extract and Validate User Context
    // ==========================================================================
    const user = (req as any).user;
    
    if (!user) {
      logger.warn('⛔ Unauthenticated document status update attempt', {
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
    const validatedInput = updateDocumentStatusInputSchema.parse({
      documentId: req.params.docid,
      approvalStatus: req.body.approvalStatus,
      comment: req.body.comment,
    });

    // ==========================================================================
    // STEP 4: Call Service Layer
    // ==========================================================================
    const result = await updateDocumentStatus(
      validatedInput,
      {
        uuid: user.uuid,
        role: user.role,
        email: user.email || ''
      }
    );

    // ==========================================================================
    // STEP 5: Send Success Response
    // ==========================================================================
    logger.info('✅ Document status updated successfully (Express)', {
      documentId: req.params.docid,
      approvalStatus: req.body.approvalStatus,
      updatedBy: user.uuid
    });

    // Match old response: res.status(200).send('OK')
    return res.status(200).json({
      success: true,
      message: result.message,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    // ==========================================================================
    // STEP 6: Error Handling
    // ==========================================================================
    logger.error('💥 Update document status controller error', {
      type: 'UPDATE_DOCUMENT_STATUS_CONTROLLER_ERROR',
      documentId: req.params?.docid,
      error: error?.message,
      stack: error?.stack
    });

    // Map error codes to HTTP status codes
    let statusCode = 500;
    let errorMessage = error?.message || 'Failed to update document status';

    if (error?.name === 'ZodError') {
      statusCode = 400;
      errorMessage = 'Invalid request parameters';
    } else if (error?.message?.includes('Access denied')) {
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
