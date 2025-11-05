/**
 * Create Employee Controller
 * ==========================
 * Thin wrapper controller for Express routes.
 * Delegates to the service layer for business logic.
 * 
 * Pattern:
 * Controller (thin wrapper) → Service (business logic)
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { createEmployee } from '../../services/crud/create.service';
import { CreateEmployeeInput } from '../../schemas/crud/create.schemas';
import { ApplicationUserRole } from '../../types/employee.types';

/**
 * Create Employee - Express Controller
 * ====================================
 * Thin wrapper that delegates to the service layer.
 * Matches the auth module pattern.
 */
export async function createEmployeeExpressController(req: Request, res: Response) {
  try {
    logger.info('📥 Create employee request received (Express)', {
      userId: (req as any).user?.uuid,
      userRole: (req as any).user?.role,
      endpoint: '/employee/register'
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
    const result = await createEmployee(req.body as CreateEmployeeInput, {
      uuid: user.uuid,
      role: user.role as ApplicationUserRole,
      email: user.email || ''
    });

    logger.info('✅ Employee created successfully (Express)', {
      employeeUuid: result.employeeUuid,
      userId: user.uuid
    });

    // Send success response
    return res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('💥 Create employee controller error', {
      type: 'EMPLOYEE_CREATE_CONTROLLER_ERROR',
      error: error?.message,
      stack: error?.stack
    });

    // Send error response
    const statusCode = error.code === 'FORBIDDEN' ? 403 
      : error.code === 'BAD_REQUEST' ? 400 
      : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to create employee',
      timestamp: new Date().toISOString()
    });
  }
}
