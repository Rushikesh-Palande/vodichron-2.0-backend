/**
 * Update User Activity Controller
 * ================================
 * Thin wrapper controller for Express routes.
 * Delegates to the service layer for business logic.
 * 
 * Pattern: Controller (thin wrapper) → Service (business logic) → Store (database)
 * Based on old backend: POST /user/activity endpoint
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { handleUpdateUserActivity } from '../../services/activity/update-user-activity.service';

/**
 * Update User Activity - Express Controller
 * ==========================================
 * Thin wrapper that delegates to the service layer.
 */
export async function updateUserActivityExpressController(req: Request, res: Response) {
  try {
    return await handleUpdateUserActivity(req, res);
  } catch (error: any) {
    logger.error('💥 UpdateUserActivity controller error', {
      type: 'UPDATE_USER_ACTIVITY_CONTROLLER_ERROR',
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
