/**
 * Update Password Controller
 * ===========================
 * Thin wrapper controller for Express routes.
 * Delegates to the service layer for business logic.
 * 
 * Pattern: Controller (thin wrapper) → Service (business logic) → Store (database)
 * Based on old backend: POST /user/update-password endpoint
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { handleUpdatePassword } from '../../services/crud/update-password.service';

/**
 * Update Password - Express Controller
 * =====================================
 * Thin wrapper that delegates to the service layer.
 */
export async function updatePasswordExpressController(req: Request, res: Response) {
  try {
    return await handleUpdatePassword(req, res);
  } catch (error: any) {
    logger.error('💥 UpdatePassword controller error', {
      type: 'UPDATE_PASSWORD_CONTROLLER_ERROR',
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
