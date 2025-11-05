/**
 * Get User Profile Controller
 * ============================
 * 
 * Thin wrapper controller for Express routes.
 * Delegates to the service layer for business logic.
 * 
 * Pattern:
 * Controller (thin wrapper) → Service (business logic)
 */

import { Request, Response } from 'express';
import { logger } from '../../../utils/logger';
import { handleGetUserProfile } from '../services/profile.service';

/**
 * Get User Profile - Express Controller
 * =====================================
 * Thin wrapper that delegates to the service layer.
 * Matches the auth module pattern.
 */
export async function getUserProfileExpressController(req: Request, res: Response) {
  try {
    return await handleGetUserProfile(req, res);
  } catch (error: any) {
    logger.error('💥 GetUserProfile controller error', {
      type: 'USER_PROFILE_CONTROLLER_ERROR',
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
