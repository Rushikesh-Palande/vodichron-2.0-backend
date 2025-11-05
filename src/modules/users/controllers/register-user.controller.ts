import { Request, Response } from 'express';
import { logger } from '../../../utils/logger';
import { handleRegisterUser } from '../services/register-user.service';

/**
 * Register User Controller
 * =========================
 * Thin wrapper controller for Express routes.
 * Delegates to the service layer for business logic.
 * 
 * Pattern: Controller (thin wrapper) → Service (business logic) → Store (database)
 * Based on old backend: POST /user/register
 */

/**
 * Register User - Express Controller
 * ===================================
 * Thin wrapper that delegates to the service layer.
 * Matches the auth module pattern.
 * 
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @returns {Promise<Response>} - Response from service
 */
export async function registerUserExpressController(req: Request, res: Response) {
  try {
    return await handleRegisterUser(req, res);
  } catch (error: any) {
    logger.error('💥 RegisterUser controller error', {
      type: 'USER_REGISTER_CONTROLLER_ERROR',
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
