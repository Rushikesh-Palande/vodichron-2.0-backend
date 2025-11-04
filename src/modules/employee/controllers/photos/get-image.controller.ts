/**
 * Get Employee Image Controller (Express REST API)
 * ================================================
 * 
 * Controller for employee image retrieval.
 * Based on: old vodichron getEmployeeImage controller (lines 457-471)
 * 
 * Pattern:
 * Controller (Express) → Service (business logic) → Store (database)
 * 
 * Endpoint: GET /api/employees/image/:id
 * 
 * Authorization:
 * - Any authenticated user can view any employee's photo
 * - No explicit authorization check (public within org)
 * 
 * Response:
 * - Binary image file (JPEG, PNG, etc.)
 * - Or default nouser.png if no photo uploaded
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { getEmployeeImage } from '../../services/photos/get-image.service';
import { getImageInputSchema } from '../../schemas/photos/get-image.schemas';
import config from '../../../../config';

/**
 * Get Employee Image - Express Controller
 * =======================================
 * 
 * Thin wrapper that validates input and delegates to service layer.
 * 
 * @param req - Express request with employee ID in params
 * @param res - Express response (will send file)
 */
export async function getImageExpressController(req: Request, res: Response) {
  try {
    // ==========================================================================
    // STEP 1: Log Incoming Request
    // ==========================================================================
    logger.info('🖼️ Get image request received (Express)', {
      employeeId: req.params.id,
      requestedBy: (req as any).user?.uuid,
      endpoint: 'GET /employees/image/:id'
    });

    // ==========================================================================
    // STEP 2: Validate Input Schema
    // ==========================================================================
    const validatedInput = getImageInputSchema.parse({
      id: req.params.id,
    });

    // ==========================================================================
    // STEP 3: Get Service Configuration
    // ==========================================================================
    const assetPath = config.asset.path;

    const serviceConfig = {
      assetPath,
    };

    // ==========================================================================
    // STEP 4: Call Service Layer (Service handles response)
    // ==========================================================================
    await getEmployeeImage(req, res, serviceConfig);

  } catch (error: any) {
    // ==========================================================================
    // STEP 5: Error Handling
    // ==========================================================================
    logger.error('💥 Get image controller error', {
      type: 'GET_IMAGE_CONTROLLER_ERROR',
      employeeId: req.params?.id,
      error: error?.message,
      stack: error?.stack
    });

    // Map error codes to HTTP status codes
    let statusCode = 500;
    let errorMessage = error?.message || 'Failed to retrieve employee image';

    if (error?.name === 'ZodError') {
      statusCode = 400;
      errorMessage = 'Invalid employee ID';
    }

    // Send error response (only if response not already sent by service)
    if (!res.headersSent) {
      return res.status(statusCode).json({
        success: false,
        message: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  }
}
