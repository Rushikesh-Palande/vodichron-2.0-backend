/**
 * Get User By ID Controller
 * ==========================
 * Thin wrapper controller for Express routes.
 * Delegates to the service layer for business logic.
 * 
 * Pattern: Controller (thin wrapper) → Service (business logic) → Store (database)
 * Based on old backend: GET /user/:id endpoint
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { handleGetUserById } from '../../services/crud/get-user-by-id.service';

/**
 * Get User By ID - Express Controller
 * ====================================
 * Thin wrapper that delegates to the service layer.
 */
export async function getUserByIdExpressController(req: Request, res: Response) {
  try {
    return await handleGetUserById(req, res);
  } catch (error: any) {
    logger.error('💥 GetUserById controller error', {
      type: 'GET_USER_BY_ID_CONTROLLER_ERROR',
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
