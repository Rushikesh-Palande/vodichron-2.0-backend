/**
 * Create Customer App Access Controller
 * ======================================
 * Thin wrapper controller for Express routes.
 * Delegates to the service layer for business logic.
 * 
 * Pattern: Controller (thin wrapper) → Service (business logic) → Store (database)
 * Based on old backend: POST /user/customer-access endpoint
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { handleCreateCustomerAppAccess } from '../../services/customer/create-customer-access.service';

/**
 * Create Customer App Access - Express Controller
 * ================================================
 * Thin wrapper that delegates to the service layer.
 */
export async function createCustomerAppAccessExpressController(req: Request, res: Response) {
  try {
    return await handleCreateCustomerAppAccess(req, res);
  } catch (error: any) {
    logger.error('💥 CreateCustomerAppAccess controller error', {
      type: 'CREATE_CUSTOMER_ACCESS_CONTROLLER_ERROR',
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
