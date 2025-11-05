/**
 * Get Reportee Leaves Controller
 * ===============================
 * Thin wrapper controller for Express routes.
 * Delegates to the service layer for business logic.
 * 
 * Purpose:
 * - Handle HTTP requests for fetching reportee leave records
 * - Used by managers, directors, and HR to view team leaves
 * 
 * Pattern:
 * Controller (thin wrapper) → Service (business logic)
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { getReporteeLeaves } from '../../services/get-reportee-leaves.service';
import { GetReporteeLeavesInput } from '../../schemas/get-reportee-leaves.schemas';
import { ApplicationUserRole } from '../../types/employee-leave.types';

/**
 * Get Reportee Leaves - Express Controller
 * =========================================
 * Thin wrapper that delegates to the service layer.
 * 
 * Authorization:
 * - Only managers, directors, HR, and superUser can access
 * - Regular employees are forbidden
 * 
 * Request Body:
 * - pagination: { page: number, pageLimit: number }
 * - filters: Optional filters for leave status, type, etc.
 * 
 * Response:
 * - 200: Success with reportee leave records
 * - 401: Unauthorized (not authenticated)
 * - 403: Forbidden (regular employee)
 * - 500: Internal server error
 */
export async function getReporteeLeavesExpressController(req: Request, res: Response) {
  try {
    logger.info('📥 Get reportee leaves request received (Express)', {
      userId: (req as any).user?.uuid,
      userRole: (req as any).user?.role,
      endpoint: '/employee-leaves/reportee'
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
    const input: GetReporteeLeavesInput = {
      pagination: req.body.pagination || { page: 0, pageLimit: 10 },
      filters: req.body.filters
    };

    // Call service layer
    const result = await getReporteeLeaves(input, {
      uuid: user.uuid,
      role: user.role as ApplicationUserRole,
      email: user.email || ''
    });

    logger.info('✅ Reportee leaves fetched successfully (Express)', {
      count: result.length,
      userId: user.uuid,
      userRole: user.role
    });

    return res.status(200).json({
      success: true,
      message: 'Reportee leaves fetched successfully',
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('💥 Get reportee leaves controller error', {
      type: 'GET_REPORTEE_LEAVES_CONTROLLER_ERROR',
      error: error?.message,
      stack: error?.stack
    });

    const statusCode = error.code === 'FORBIDDEN' ? 403 
      : error.code === 'BAD_REQUEST' ? 400 
      : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch reportee leaves',
      timestamp: new Date().toISOString()
    });
  }
}
