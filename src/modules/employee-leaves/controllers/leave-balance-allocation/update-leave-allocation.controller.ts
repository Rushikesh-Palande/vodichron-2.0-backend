/**
 * Update Leave Allocation Controller
 * ===================================
 * Thin wrapper controller for Express routes.
 * Delegates to the service layer for business logic.
 * 
 * Purpose:
 * - Handle HTTP requests for updating employee leave allocations
 * - Only HR and SuperUser can perform this operation
 * - Used for bulk updating leave allocations and carry forwards
 * 
 * Pattern:
 * Controller (thin wrapper) → Service (business logic)
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { updateLeaveAllocation } from '../../services/update-leave-allocation.service';
import { UpdateLeaveAllocationInput } from '../../schemas/leave-balance-allocation.schemas';
import { ApplicationUserRole } from '../../types/employee-leave.types';

/**
 * Update Leave Allocation - Express Controller
 * =============================================
 * Thin wrapper that delegates to the service layer.
 * 
 * Authorization:
 * - Only HR and SuperUser can update leave allocations
 * - All other roles are forbidden
 * 
 * Request Body:
 * - leaveAllocation: Array of allocation records to update
 *   - uuid: UUID of allocation record
 *   - leavesAllocated: Number of leaves allocated
 *   - leavesCarryForwarded: Number of leaves carried forward
 * 
 * Response:
 * - 200: Success with update confirmation
 * - 401: Unauthorized (not authenticated)
 * - 403: Forbidden (not HR/SuperUser)
 * - 400: Bad request (validation error)
 * - 500: Internal server error
 */
export async function updateLeaveAllocationExpressController(req: Request, res: Response) {
  try {
    logger.info('📥 Update leave allocation request received (Express)', {
      userId: (req as any).user?.uuid,
      userRole: (req as any).user?.role,
      count: req.body.leaveAllocation?.length,
      endpoint: '/employee-leaves/allocation'
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

    // Build input from body
    const input: UpdateLeaveAllocationInput = {
      leaveAllocation: req.body.leaveAllocation
    };

    // Call service layer
    const result = await updateLeaveAllocation(input, {
      uuid: user.uuid,
      role: user.role as ApplicationUserRole,
      email: user.email || ''
    });

    logger.info('✅ Leave allocation updated successfully (Express)', {
      count: result.count,
      userId: user.uuid
    });

    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        count: result.count
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('💥 Update leave allocation controller error', {
      type: 'UPDATE_LEAVE_ALLOCATION_CONTROLLER_ERROR',
      error: error?.message,
      stack: error?.stack
    });

    const statusCode = error.code === 'FORBIDDEN' ? 403 
      : error.code === 'BAD_REQUEST' ? 400 
      : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update leave allocation',
      timestamp: new Date().toISOString()
    });
  }
}
