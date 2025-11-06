/**
 * Update User Controller
 * =======================
 * Thin wrapper controller for Express routes.
 * Delegates to the service layer for business logic.
 * 
 * Pattern: Controller (thin wrapper) → Service (business logic) → Store (database)
 * Based on old backend: PATCH /user endpoint
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { handleUpdateUser } from '../../services/crud/update-user.service';

/**
 * Update User - Express Controller
 * =================================
 * Thin wrapper that delegates to the service layer.
 */
export async function updateUserExpressController(req: Request, res: Response) {
  try {
    return await handleUpdateUser(req, res);
  } catch (error: any) {
    logger.error('💥 UpdateUser controller error', {
      type: 'UPDATE_USER_CONTROLLER_ERROR',
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
