import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { handleUnifiedRegister } from '../../services/unified/unified-register.service';

/**
 * Unified Registration Controller
 * ================================
 * Thin wrapper controller for Express routes.
 * Delegates to the service layer for business logic.
 * 
 * Pattern: Controller (thin wrapper) → Service (business logic) → Store (database)
 * Endpoint: POST /employee/unified-register
 */

/**
 * Unified Register - Express Controller
 * ======================================
 * Thin wrapper that delegates to the service layer.
 * 
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @returns {Promise<Response>} - Response from service
 */
export async function unifiedRegisterExpressController(req: Request, res: Response) {
  try {
    return await handleUnifiedRegister(req, res);
  } catch (error: any) {
    logger.error('💥 UnifiedRegister controller error', {
      type: 'UNIFIED_REGISTER_CONTROLLER_ERROR',
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
