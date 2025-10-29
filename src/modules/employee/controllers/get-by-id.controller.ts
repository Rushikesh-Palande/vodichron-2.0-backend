/**
 * Get Employee By ID Controller
 * ==============================
 * 
 * Thin wrapper controller for Express routes.
 * Delegates to the service layer for business logic.
 * 
 * Pattern:
 * Controller (thin wrapper) → Service (business logic)
 * 
 * Note: tRPC routers have their own implementation and don't use this controller.
 */

import { Request, Response } from 'express';
import { logger } from '../../../utils/logger';
import { handleGetEmployeeById } from '../services/get-by-id.service';

/**
 * Get Employee By ID - Express Controller
 * =======================================
 * Thin wrapper that delegates to the service layer.
 * Matches the auth module pattern.
 */
export async function getEmployeeByIdExpressController(req: Request, res: Response) {
  try {
    return await handleGetEmployeeById(req, res);
  } catch (error: any) {
    logger.error('💥 GetEmployeeById controller error', {
      type: 'EMPLOYEE_GETBYID_CONTROLLER_ERROR',
      error: error?.message,
      stack: error?.stack
    });
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
}
