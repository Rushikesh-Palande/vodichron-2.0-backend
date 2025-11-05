/**
 * Update Leave Status Controller
 * ===============================
 * Thin wrapper controller for Express routes.
 * Delegates to the service layer for business logic.
 * 
 * Purpose:
 * - Handle HTTP requests for approving/rejecting leave requests
 * - Used by managers, directors, HR, and customers
 * 
 * Pattern:
 * Controller (thin wrapper) → Service (business logic)
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { updateLeaveStatus } from '../../services/update-leave-status.service';
import { UpdateLeaveStatusInput } from '../../schemas/update-leave-status.schemas';
import { ApplicationUserRole } from '../../types/employee-leave.types';

/**
 * Update Leave Status - Express Controller
 * =========================================
 * Thin wrapper that delegates to the service layer.
 * 
 * Authorization:
 * - Only approvers, managers, directors, HR, superUser, and customers can update
 * - Regular employees cannot update leave status
 * 
 * Request Params:
 * - leaveId: UUID of the leave request to update
 * 
 * Request Body:
 * - approvalStatus: 'APPROVED' | 'REJECTED' | 'PENDING'
 * - comment: Optional approver comment
 * 
 * Response:
 * - 200: Success with confirmation message
 * - 401: Unauthorized (not authenticated)
 * - 403: Forbidden (not an approver)
 * - 400: Bad request (validation error)
 * - 500: Internal server error
 */
export async function updateLeaveStatusExpressController(req: Request, res: Response) {
  try {
    logger.info('📥 Update leave status request received (Express)', {
      userId: (req as any).user?.uuid,
      userRole: (req as any).user?.role,
      leaveId: req.params.leaveId,
      endpoint: '/employee-leaves/:leaveId/status'
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

    // Build input from params and body
    const input: UpdateLeaveStatusInput = {
      leaveId: req.params.leaveId,
      approvalStatus: req.body.approvalStatus,
      comment: req.body.comment
    };

    // Call service layer
    const result = await updateLeaveStatus(input, {
      uuid: user.uuid,
      role: user.role as ApplicationUserRole,
      email: user.email || ''
    });

    logger.info('✅ Leave status updated successfully (Express)', {
      leaveId: req.params.leaveId,
      userId: user.uuid,
      approvalStatus: input.approvalStatus
    });

    return res.status(200).json({
      success: true,
      message: result.message,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('💥 Update leave status controller error', {
      type: 'UPDATE_LEAVE_STATUS_CONTROLLER_ERROR',
      leaveId: req.params.leaveId,
      error: error?.message,
      stack: error?.stack
    });

    const statusCode = error.code === 'FORBIDDEN' ? 403 
      : error.code === 'BAD_REQUEST' ? 400 
      : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update leave status',
      timestamp: new Date().toISOString()
    });
  }
}
