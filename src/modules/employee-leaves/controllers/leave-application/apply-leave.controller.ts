/**
 * Apply Leave Controller
 * =======================
 * Thin wrapper controller for Express routes.
 * Delegates to the service layer for business logic.
 * 
 * Pattern:
 * Controller (thin wrapper) → Service (business logic)
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { applyLeave } from '../../services/apply-leave.service';
import { ApplyLeaveInput } from '../../schemas/apply-leave.schemas';
import { ApplicationUserRole } from '../../types/employee-leave.types';

/**
 * Apply Leave - Express Controller
 * =================================
 * Thin wrapper that delegates to the service layer.
 */
export async function applyLeaveExpressController(req: Request, res: Response) {
  try {
    logger.info('📥 Apply leave request received (Express)', {
      userId: (req as any).user?.uuid,
      userRole: (req as any).user?.role,
      endpoint: '/employee-leaves/apply'
    });

    // Extract user from request (added by auth middleware)
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    // Call service layer
    const result = await applyLeave(req.body as ApplyLeaveInput, {
      uuid: user.uuid,
      role: user.role as ApplicationUserRole,
      email: user.email || ''
    });

    logger.info('✅ Leave applied successfully (Express)', {
      leaveUuid: result.leaveUuid,
      requestNumber: result.requestNumber,
      userId: user.uuid
    });

    // Send success response
    return res.status(201).json({
      success: true,
      message: 'Leave application submitted successfully',
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('💥 Apply leave controller error', {
      type: 'APPLY_LEAVE_CONTROLLER_ERROR',
      error: error?.message,
      stack: error?.stack
    });

    // Send error response
    const statusCode = error.code === 'FORBIDDEN' ? 403 
      : error.code === 'BAD_REQUEST' ? 400 
      : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to apply leave',
      timestamp: new Date().toISOString()
    });
  }
}
