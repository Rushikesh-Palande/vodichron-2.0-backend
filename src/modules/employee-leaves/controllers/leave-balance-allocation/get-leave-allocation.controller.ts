/**
 * Get Leave Allocation Controller
 * ================================
 * Thin wrapper controller for Express routes.
 * Delegates to the service layer for business logic.
 * 
 * Purpose:
 * - Handle HTTP requests for fetching employee leave allocation records
 * - Shows allocated leaves, applied leaves, and balance by leave type for a year
 * 
 * Pattern:
 * Controller (thin wrapper) → Service (business logic)
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { getLeaveAllocation } from '../../services/get-leave-allocation.service';
import { GetLeaveAllocationInput } from '../../schemas/leave-balance-allocation.schemas';
import { ApplicationUserRole } from '../../types/employee-leave.types';

/**
 * Get Leave Allocation - Express Controller
 * ==========================================
 * Thin wrapper that delegates to the service layer.
 * 
 * Authorization:
 * - Regular employees can only view their own allocation
 * - Managers/Directors/HR/SuperUser can view any employee's allocation
 * 
 * Request Params:
 * - employeeId: UUID of the employee
 * 
 * Request Body:
 * - filters: { year?: string }
 * 
 * Response:
 * - 200: Success with leave allocation records
 * - 401: Unauthorized (not authenticated)
 * - 403: Forbidden (employee viewing another's allocation)
 * - 500: Internal server error
 */
export async function getLeaveAllocationExpressController(req: Request, res: Response) {
  try {
    logger.info('📥 Get leave allocation request received (Express)', {
      userId: (req as any).user?.uuid,
      employeeId: req.params.employeeId,
      endpoint: '/employee-leaves/:employeeId/allocation'
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
    const input: GetLeaveAllocationInput = {
      employeeId: req.params.employeeId,
      filters: req.body.filters
    };

    // Call service layer
    const result = await getLeaveAllocation(input, {
      uuid: user.uuid,
      role: user.role as ApplicationUserRole,
      email: user.email || ''
    });

    logger.info('✅ Leave allocation fetched successfully (Express)', {
      employeeId: req.params.employeeId,
      count: result.length,
      userId: user.uuid
    });

    return res.status(200).json({
      success: true,
      message: 'Leave allocation fetched successfully',
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('💥 Get leave allocation controller error', {
      type: 'GET_LEAVE_ALLOCATION_CONTROLLER_ERROR',
      employeeId: req.params.employeeId,
      error: error?.message,
      stack: error?.stack
    });

    const statusCode = error.code === 'FORBIDDEN' ? 403 
      : error.code === 'BAD_REQUEST' ? 400 
      : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch leave allocation',
      timestamp: new Date().toISOString()
    });
  }
}
