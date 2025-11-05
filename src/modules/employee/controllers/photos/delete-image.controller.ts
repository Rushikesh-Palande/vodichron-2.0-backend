/**
 * Delete Employee Image Controller (Express REST API)
 * ===================================================
 * 
 * Controller for employee image deletion.
 * Based on: old vodichron deleteEmployeeImage controller (lines 473-488)
 * 
 * Pattern:
 * Controller (Express) → Service (business logic) → Store (database)
 * 
 * Endpoint: DELETE /api/employees/image/:id
 * 
 * Authorization:
 * - No explicit authorization in old code
 * - Should be restricted to self or HR/Admin
 * 
 * Response (Success - 200):
 * {
 *   success: true,
 *   message: "Employee image deleted successfully"
 * }
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { deleteEmployeeImage } from '../../services/photos/delete-image.service';
import { deleteImageInputSchema } from '../../schemas/photos/delete-image.schemas';
import config from '../../../../config';

/**
 * Delete Employee Image - Express Controller
 * ==========================================
 * 
 * Thin wrapper that validates input and delegates to service layer.
 * 
 * @param req - Express request with employee ID in params
 * @param res - Express response
 */
export async function deleteImageExpressController(req: Request, res: Response) {
  try {
    // ==========================================================================
    // STEP 1: Log Incoming Request
    // ==========================================================================
    logger.info('🗑️ Delete image request received (Express)', {
      employeeId: req.params.id,
      requestedBy: (req as any).user?.uuid,
      endpoint: 'DELETE /employees/image/:id'
    });

    // ==========================================================================
    // STEP 2: Extract and Validate User Context
    // ==========================================================================
    const user = (req as any).user;
    
    if (!user) {
      logger.warn('⛔ Unauthenticated delete attempt', {
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
    const validatedInput = deleteImageInputSchema.parse({
      id: req.params.id,
    });

    // ==========================================================================
    // STEP 4: Get Service Configuration
    // ==========================================================================
    const assetPath = config.asset.path;

    const serviceConfig = {
      assetPath,
    };

    // ==========================================================================
    // STEP 5: Call Service Layer
    // ==========================================================================
    const result = await deleteEmployeeImage(
      validatedInput,
      {
        uuid: user.uuid,
        role: user.role,
        email: user.email || ''
      },
      serviceConfig
    );

    // ==========================================================================
    // STEP 6: Send Success Response
    // ==========================================================================
    logger.info('✅ Image deleted successfully (Express)', {
      employeeId: validatedInput.id,
      requestedBy: user.uuid
    });

    // Match old response format: res.status(200).send('OK')
    return res.status(200).json({
      success: result.success,
      message: result.message,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    // ==========================================================================
    // STEP 7: Error Handling
    // ==========================================================================
    logger.error('💥 Delete image controller error', {
      type: 'DELETE_IMAGE_CONTROLLER_ERROR',
      employeeId: req.params?.id,
      error: error?.message,
      stack: error?.stack
    });

    // Map error codes to HTTP status codes
    let statusCode = 500;
    let errorMessage = error?.message || 'Failed to delete employee image';

    if (error?.name === 'ZodError') {
      statusCode = 400;
      errorMessage = 'Invalid employee ID';
    } else if (error?.message?.includes('Unable to find the employee')) {
      statusCode = 404;
      errorMessage = 'Employee not found';
    }

    // Send error response
    return res.status(statusCode).json({
      success: false,
      message: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
}
