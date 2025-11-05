/**
 * Get Application Users List Controller
 * ======================================
 * 
 * Thin wrapper controller for Express routes.
 * Delegates to the service layer for business logic.
 * 
 * Pattern:
 * Controller (thin wrapper) → Service (business logic) → Store (database)
 * 
 * Based on old vodichron: POST /user/list endpoint
 */

import { Request, Response } from 'express';
import { logger } from '../../../utils/logger';
import { handleGetApplicationUsersList } from '../services/user-list.service';

/**
 * Get Application Users List - Express Controller
 * ===============================================
 * 
 * Thin wrapper that delegates to the service layer.
 * Matches the employee module pattern.
 * 
 * Request body:
 * {
 *   pagination: { page: 1, pageLimit: 20 },
 *   filters: { role?: string }
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   message: string,
 *   data: ApplicationUser[],
 *   pagination: { page, pageLimit, totalRecords },
 *   timestamp: ISO string
 * }
 */
export async function getApplicationUsersListExpressController(req: Request, res: Response) {
  try {
    return await handleGetApplicationUsersList(req, res);
  } catch (error: any) {
    logger.error('💥 GetApplicationUsersList controller error', {
      type: 'USER_LIST_CONTROLLER_ERROR',
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
