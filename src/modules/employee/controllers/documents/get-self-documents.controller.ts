/**
 * Get Self Documents Controller (Express REST API)
 * ================================================
 * 
 * Controller for retrieving employee's own documents.
 * Based on: old vodichron getEmployeeSelfDocuments controller (lines 346-355)
 * 
 * Pattern:
 * Controller (Express) → Service (business logic) → Store (database)
 * 
 * Endpoint: GET /api/employees/documents/:id
 * 
 * Request:
 * - URL Parameter: id (employee UUID)
 * - Headers: Authorization (JWT token)
 * 
 * Response (Success - 200):
 * {
 *   success: true,
 *   data: [
 *     {
 *       uuid: "doc-uuid",
 *       documentType: "PAN Card",
 *       fileName: "uuid.pdf",
 *       hrApprovalStatus: "REQUESTED",
 *       hrDetail: "HR Name <hr@email.com>",
 *       ...
 *     }
 *   ]
 * }
 * 
 * Authorization:
 * - Employees can only view their own documents
 * - params.id must match logged-in user UUID
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { getEmployeeSelfDocuments } from '../../services/documents/get-self-documents.service';
import { getSelfDocumentsInputSchema } from '../../schemas/documents/get-self-documents.schemas';

/**
 * Get Self Documents - Express Controller
 * =======================================
 * 
 * Thin wrapper that validates input and delegates to service layer.
 * 
 * Authorization:
 * - User must be authenticated (middleware)
 * - Service layer enforces employeeId === logged-in user
 * 
 * @param req - Express request with params.id
 * @param res - Express response
 */
export async function getSelfDocumentsExpressController(req: Request, res: Response) {
  try {
    // ==========================================================================
    // STEP 1: Log Incoming Request
    // ==========================================================================
    logger.info('📥 Get self documents request received (Express)', {
      employeeId: req.params.id,
      requestedBy: (req as any).user?.uuid,
      endpoint: 'GET /employees/documents/:id'
    });

    // ==========================================================================
    // STEP 2: Extract and Validate User Context
    // ==========================================================================
    const user = (req as any).user;
    
    if (!user) {
      logger.warn('⛔ Unauthenticated document access attempt', {
        employeeId: req.params.id
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
    const validatedInput = getSelfDocumentsInputSchema.parse({
      employeeId: req.params.id,
    });

    // ==========================================================================
    // STEP 4: Call Service Layer
    // ==========================================================================
    const documents = await getEmployeeSelfDocuments(
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
    logger.info('✅ Self documents retrieved successfully (Express)', {
      employeeId: req.params.id,
      documentCount: documents.length,
      userId: user.uuid
    });

    // Match old response format: { data: [...] }
    return res.status(200).json({
      success: true,
      data: documents,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    // ==========================================================================
    // STEP 6: Error Handling
    // ==========================================================================
    logger.error('💥 Get self documents controller error', {
      type: 'GET_SELF_DOCUMENTS_CONTROLLER_ERROR',
      employeeId: req.params?.id,
      error: error?.message,
      stack: error?.stack
    });

    // Map error codes to HTTP status codes
    let statusCode = 500;
    let errorMessage = error?.message || 'Failed to retrieve documents';

    if (error?.name === 'ZodError') {
      statusCode = 400;
      errorMessage = 'Invalid employee ID';
    } else if (error?.message?.includes('Access denied')) {
      statusCode = 403;
    }

    // Send error response
    return res.status(statusCode).json({
      success: false,
      message: errorMessage,
      data: [],
      timestamp: new Date().toISOString()
    });
  }
}
