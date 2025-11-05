/**
 * Update Employee Controller
 * ==========================
 * Thin wrapper controller for Express routes.
 * Delegates to the service layer for business logic.
 * 
 * Pattern:
 * Controller (thin wrapper) → Service (business logic)
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { updateEmployee } from '../../services/crud/update.service';
import { UpdateEmployeeInput } from '../../schemas/crud/update.schemas';
import { ApplicationUserRole } from '../../types/employee.types';

/**
 * Update Employee - Express Controller
 * ====================================
 * Thin wrapper that delegates to the service layer.
 * Matches the auth and employee module pattern.
 */
export async function updateEmployeeExpressController(req: Request, res: Response) {
  try {
    logger.info('📥 Update employee request received (Express)', {
      userId: (req as any).user?.uuid,
      userRole: (req as any).user?.role,
      employeeUuid: req.body.uuid,
      endpoint: '/employee/update'
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
    const result = await updateEmployee(req.body as UpdateEmployeeInput, {
      uuid: user.uuid,
      role: user.role as ApplicationUserRole,
      email: user.email || ''
    });

    logger.info('✅ Employee updated successfully (Express)', {
      employeeUuid: req.body.uuid,
      userId: user.uuid
    });

    // Send success response
    return res.status(200).json({
      success: true,
      message: 'Employee updated successfully',
      data: result.data,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('💥 Update employee controller error', {
      type: 'EMPLOYEE_UPDATE_CONTROLLER_ERROR',
      error: error?.message,
      stack: error?.stack
    });

    // Send error response
    const statusCode = error.code === 'FORBIDDEN' ? 403 
      : error.code === 'BAD_REQUEST' ? 400 
      : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update employee',
      timestamp: new Date().toISOString()
    });
  }
}
