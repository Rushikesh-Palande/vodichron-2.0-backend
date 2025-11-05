/**
 * Get Reportee Employee Documents Controller (Express REST API)
 * ==============================================================
 * 
 * Controller for retrieving employee documents for HR approval.
 * Based on: old vodichron getReporteeEmployeeDocuments controller (lines 393-404)
 * 
 * Pattern:
 * Controller (Express) → Service (business logic) → Store (database)
 * 
 * Endpoint: POST /api/employees/all/documents
 * 
 * Request:
 * - Body:
 *   - pagination: { page?: number, pageLimit?: number }
 *   - filters?: { hrApprovalStatus?: string }
 * - Headers: Authorization (JWT token)
 * 
 * Response (Success - 200):
 * {
 *   success: true,
 *   data: [
 *     {
 *       uuid: "doc-uuid",
 *       employeeId: "emp-uuid",
 *       employeeName: "Employee Name",
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
 * - Intended for HR/SuperUser (route middleware should handle)
 * - Old code has NO explicit auth check
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { getReporteeEmployeeDocuments } from '../../services/documents/get-reportee-documents.service';
import { getReporteeDocumentsInputSchema } from '../../schemas/documents/get-reportee-documents.schemas';

/**
 * Get Reportee Employee Documents - Express Controller
 * ====================================================
 * 
 * Thin wrapper that validates input and delegates to service layer.
 * 
 * Authorization:
 * - User must be authenticated (middleware)
 * - Route should restrict to HR/SuperUser roles
 * - Service has NO auth check (follows old pattern)
 * 
 * @param req - Express request with body {pagination, filters}
 * @param res - Express response
 */
export async function getReporteeDocumentsExpressController(req: Request, res: Response) {
  try {
    // ==========================================================================
    // STEP 1: Log Incoming Request
    // ==========================================================================
    logger.info('📥 Get reportee documents request received (Express)', {
      requestedBy: (req as any).user?.uuid,
      pagination: req.body.pagination,
      filters: req.body.filters,
      endpoint: 'POST /employees/all/documents'
    });

    // ==========================================================================
    // STEP 2: Extract and Validate User Context
    // ==========================================================================
    const user = (req as any).user;
    
    if (!user) {
      logger.warn('⛔ Unauthenticated reportee documents access attempt');

      return res.status(401).json({
        success: false,
        message: 'Unauthorized - User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    // ==========================================================================
    // STEP 3: Validate Input Schema
    // ==========================================================================
    const validatedInput = getReporteeDocumentsInputSchema.parse({
      pagination: req.body.pagination,
      filters: req.body.filters,
    });

    // ==========================================================================
    // STEP 4: Call Service Layer
    // ==========================================================================
    const documents = await getReporteeEmployeeDocuments(
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
    logger.info('✅ Reportee documents retrieved successfully (Express)', {
      documentCount: documents.length,
      requestedBy: user.uuid
    });

    // Match old response format: { data: employeeDocuments }
    return res.status(200).json({
      success: true,
      data: documents,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    // ==========================================================================
    // STEP 6: Error Handling
    // ==========================================================================
    logger.error('💥 Get reportee documents controller error', {
      type: 'GET_REPORTEE_DOCUMENTS_CONTROLLER_ERROR',
      error: error?.message,
      stack: error?.stack
    });

    // Map error codes to HTTP status codes
    let statusCode = 500;
    let errorMessage = error?.message || 'Failed to retrieve documents';

    if (error?.name === 'ZodError') {
      statusCode = 400;
      errorMessage = 'Invalid request parameters';
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
