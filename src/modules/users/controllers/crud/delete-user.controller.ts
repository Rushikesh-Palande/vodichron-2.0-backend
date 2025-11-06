/**
 * Delete User Controller
 * =======================
 * Thin wrapper controller for Express routes.
 * Delegates to the service layer for business logic.
 * 
 * Pattern: Controller (thin wrapper) → Service (business logic) → Store (database)
 * Based on old backend: DELETE /user/:id endpoint
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { handleDeleteUser } from '../../services/crud/delete-user.service';

/**
 * Delete User - Express Controller
 * =================================
 * Thin wrapper that delegates to the service layer.
 */
export async function deleteUserExpressController(req: Request, res: Response) {
  try {
    return await handleDeleteUser(req, res);
  } catch (error: any) {
    logger.error('💥 DeleteUser controller error', {
      type: 'DELETE_USER_CONTROLLER_ERROR',
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
