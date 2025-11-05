/**
 * Get Employee Leaves Controller
 * ===============================
 * Thin wrapper controller for Express routes.
 * Delegates to the service layer for business logic.
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { getEmployeeLeaves } from '../../services/get-employee-leaves.service';
import { GetEmployeeLeavesInput } from '../../schemas/get-employee-leaves.schemas';
import { ApplicationUserRole } from '../../types/employee-leave.types';

/**
 * Get Employee Leaves - Express Controller
 */
export async function getEmployeeLeavesExpressController(req: Request, res: Response) {
  try {
    logger.info('📥 Get employee leaves request received (Express)', {
      userId: (req as any).user?.uuid,
      employeeId: req.params.employeeId,
      endpoint: '/employee-leaves/:employeeId'
    });

    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    // Build input from params and body
    const input: GetEmployeeLeavesInput = {
      employeeId: req.params.employeeId,
      pagination: req.body.pagination || { page: 0, pageLimit: 10 },
      filters: req.body.filters
    };

    // Call service layer
    const result = await getEmployeeLeaves(input, {
      uuid: user.uuid,
      role: user.role as ApplicationUserRole,
      email: user.email || ''
    });

    logger.info('✅ Employee leaves fetched successfully (Express)', {
      count: result.length,
      userId: user.uuid
    });

    return res.status(200).json({
      success: true,
      message: 'Employee leaves fetched successfully',
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('💥 Get employee leaves controller error', {
      type: 'GET_EMPLOYEE_LEAVES_CONTROLLER_ERROR',
      error: error?.message,
      stack: error?.stack
    });

    const statusCode = error.code === 'FORBIDDEN' ? 403 
      : error.code === 'BAD_REQUEST' ? 400 
      : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch employee leaves',
      timestamp: new Date().toISOString()
    });
  }
}
