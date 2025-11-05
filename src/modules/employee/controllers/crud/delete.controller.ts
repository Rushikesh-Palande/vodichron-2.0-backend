/**
 * Delete Employee Controller (Express REST API)
 * =============================================
 * 
 * Thin wrapper controller for Express routes.
 * Delegates to the service layer for business logic.
 * 
 * Based on: old vodichron deleteEmployee controller
 * Location: vodichron-backend-master/src/controllers/employeeController.ts (line 163-171)
 * 
 * Pattern:
 * Controller (thin wrapper) → Service (business logic) → Store (database)
 * 
 * Endpoint: DELETE /api/employees/:id
 * 
 * Request:
 * - URL Parameter: id (employee UUID)
 * - Headers: Authorization (JWT token)
 * 
 * Response (Success - 200):
 * {
 *   success: true,
 *   message: "Employee deleted successfully",
 *   timestamp: "2024-01-01T00:00:00.000Z"
 * }
 * 
 * Response (Error - 403/404/500):
 * {
 *   success: false,
 *   message: "Error message",
 *   timestamp: "2024-01-01T00:00:00.000Z"
 * }
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { deleteEmployee } from '../../services/crud/delete.service';
import { deleteEmployeeSchema } from '../../schemas/crud/delete.schemas';
import { ApplicationUserRole } from '../../types/employee.types';

/**
 * Delete Employee - Express Controller
 * ====================================
 * 
 * Thin wrapper that delegates to the service layer.
 * Matches the employee module pattern.
 * 
 * Authorization:
 * - User must be authenticated (middleware)
 * - Only HR and SuperUser can delete
 * 
 * @param req - Express request with params.id and user context
 * @param res - Express response
 */
export async function deleteEmployeeExpressController(req: Request, res: Response) {
  try {
    // ==========================================================================
    // STEP 1: Log Incoming Request
    // ==========================================================================
    logger.info('📥 Delete employee request received (Express)', {
      employeeUuid: req.params.id,
      userId: (req as any).user?.uuid,
      userRole: (req as any).user?.role,
      endpoint: 'DELETE /employee/:id'
    });

    // ==========================================================================
    // STEP 2: Extract and Validate User Context
    // ==========================================================================
    const user = (req as any).user;
    
    if (!user) {
      logger.warn('⛔ Unauthenticated delete attempt', {
        employeeUuid: req.params.id
      });

      return res.status(401).json({
        success: false,
        message: 'Unauthorized - User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    // ==========================================================================
    // STEP 3: Validate Input
    // ==========================================================================
    // Validate employee UUID from URL parameter
    const validatedInput = deleteEmployeeSchema.parse({
      employeeUuid: req.params.id
    });

    // ==========================================================================
    // STEP 4: Call Service Layer
    // ==========================================================================
    const result = await deleteEmployee(validatedInput, {
      uuid: user.uuid,
      role: user.role as ApplicationUserRole,
      email: user.email || ''
    });

    // ==========================================================================
    // STEP 5: Send Success Response
    // ==========================================================================
    logger.info('✅ Employee deleted successfully (Express)', {
      employeeUuid: req.params.id,
      deletedBy: user.uuid
    });

    return res.status(200).json({
      success: true,
      message: result.message,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    // ==========================================================================
    // STEP 6: Error Handling
    // ==========================================================================
    logger.error('💥 Delete employee controller error', {
      type: 'EMPLOYEE_DELETE_CONTROLLER_ERROR',
      employeeUuid: req.params.id,
      error: error?.message,
      code: error?.code,
      stack: error?.stack
    });

    // Map error codes to HTTP status codes
    let statusCode = 500;
    let errorMessage = error?.message || 'Failed to delete employee';

    if (error?.code === 'FORBIDDEN') {
      statusCode = 403;
    } else if (error?.code === 'NOT_FOUND') {
      statusCode = 404;
    } else if (error?.code === 'BAD_REQUEST' || error?.name === 'ZodError') {
      statusCode = 400;
      errorMessage = 'Invalid employee UUID';
    }

    // Send error response
    return res.status(statusCode).json({
      success: false,
      message: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
}
