/**
 * Check User Exists Controller
 * =============================
 * Thin wrapper controller for Express routes.
 * Delegates to the service layer for business logic.
 * 
 * Pattern: Controller (thin wrapper) → Service (business logic) → Store (database)
 * Based on old backend: POST /user/check-exists endpoint
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { handleCheckUserExists } from '../../services/crud/check-user-exists.service';

/**
 * Check User Exists - Express Controller
 * =======================================
 * Thin wrapper that delegates to the service layer.
 * Matches the existing codebase pattern.
 * 
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @returns {Promise<Response>} - Response from service
 */
export async function checkUserExistsExpressController(req: Request, res: Response) {
  try {
    return await handleCheckUserExists(req, res);
  } catch (error: any) {
    logger.error('💥 CheckUserExists controller error', {
      type: 'CHECK_USER_EXISTS_CONTROLLER_ERROR',
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
