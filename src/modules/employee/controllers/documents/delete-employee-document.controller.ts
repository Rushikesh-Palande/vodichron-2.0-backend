/**
 * Delete Employee Document Controller (Express REST API)
 * ======================================================
 * 
 * Controller for deleting employee documents.
 * Based on: old vodichron deleteEmployeeDocument controller (lines 357-371)
 * 
 * Pattern:
 * Controller (Express) → Service (business logic) → Store (database)
 * 
 * Endpoint: DELETE /api/employees/document/:empid/:docid
 * 
 * Request:
 * - URL Parameters: 
 *   - empid: Employee UUID who owns the document
 *   - docid: Document UUID to delete
 * - Headers: Authorization (JWT token)
 * 
 * Response (Success - 200):
 * {
 *   success: true,
 *   message: "Document deleted successfully",
 *   data: { ... }
 * }
 * 
 * Authorization:
 * - Employees can delete their own documents
 * - HR/SuperUser can delete any employee's documents
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { deleteEmployeeDocument } from '../../services/documents/delete-employee-document.service';
import { deleteEmployeeDocumentInputSchema } from '../../schemas/documents/delete-employee-document.schemas';

/**
 * Delete Employee Document - Express Controller
 * =============================================
 * 
 * Thin wrapper that validates input and delegates to service layer.
 * 
 * Authorization:
 * - User must be authenticated (middleware)
 * - Service layer enforces: self OR HR/SuperUser
 * 
 * @param req - Express request with params.empid and params.docid
 * @param res - Express response
 */
export async function deleteEmployeeDocumentExpressController(req: Request, res: Response) {
  try {
    // ==========================================================================
    // STEP 1: Log Incoming Request
    // ==========================================================================
    logger.info('📥 Delete employee document request received (Express)', {
      employeeId: req.params.empid,
      documentId: req.params.docid,
      requestedBy: (req as any).user?.uuid,
      endpoint: 'DELETE /employees/document/:empid/:docid'
    });

    // ==========================================================================
    // STEP 2: Extract and Validate User Context
    // ==========================================================================
    const user = (req as any).user;
    
    if (!user) {
      logger.warn('⛔ Unauthenticated document deletion attempt', {
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
    const validatedInput = deleteEmployeeDocumentInputSchema.parse({
      employeeId: req.params.empid,
      documentId: req.params.docid,
    });

    // ==========================================================================
    // STEP 4: Call Service Layer
    // ==========================================================================
    const result = await deleteEmployeeDocument(
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
    logger.info('✅ Employee document deleted successfully (Express)', {
      employeeId: req.params.empid,
      documentId: req.params.docid,
      deletedBy: user.uuid
    });

    // Match old response format: { data: employeeDocuments }
    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    // ==========================================================================
    // STEP 6: Error Handling
    // ==========================================================================
    logger.error('💥 Delete employee document controller error', {
      type: 'DELETE_EMPLOYEE_DOCUMENT_CONTROLLER_ERROR',
      employeeId: req.params?.empid,
      documentId: req.params?.docid,
      error: error?.message,
      stack: error?.stack
    });

    // Map error codes to HTTP status codes
    let statusCode = 500;
    let errorMessage = error?.message || 'Failed to delete document';

    if (error?.name === 'ZodError') {
      statusCode = 400;
      errorMessage = 'Invalid employee ID or document ID';
    } else if (error?.message?.includes('Access denied')) {
      statusCode = 403;
    } else if (error?.message?.includes('not found')) {
      statusCode = 404;
    }

    // Send error response
    return res.status(statusCode).json({
      success: false,
      message: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
}
