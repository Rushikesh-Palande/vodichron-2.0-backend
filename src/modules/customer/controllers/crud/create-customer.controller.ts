/**
 * Create Customer Controller
 * ==========================
 * Thin wrapper controller for Express routes.
 * Delegates to the service layer for business logic.
 * 
 * Pattern:
 * Controller (thin wrapper) → Service (business logic)
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { createCustomer } from '../../services/crud/create-customer.service';
import { CreateCustomerInput } from '../../schemas/crud/create-customer.schemas';
import { ApplicationUserRole } from '../../types/customer.types';

/**
 * Create Customer - Express Controller
 * ====================================
 * Thin wrapper that delegates to the service layer.
 */
export async function createCustomerExpressController(req: Request, res: Response) {
  try {
    logger.info('📥 Create customer request received (Express)', {
      userId: (req as any).user?.uuid,
      userRole: (req as any).user?.role,
      endpoint: '/customer/create'
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
    const result = await createCustomer(req.body as CreateCustomerInput, {
      uuid: user.uuid,
      role: user.role as ApplicationUserRole,
      email: user.email || ''
    });

    logger.info('✅ Customer created successfully (Express)', {
      customerUuid: result.customerUuid,
      userId: user.uuid
    });

    // Send success response
    return res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('💥 Create customer controller error', {
      type: 'CUSTOMER_CREATE_CONTROLLER_ERROR',
      error: error?.message,
      stack: error?.stack
    });

    // Send error response
    const statusCode = error.code === 'FORBIDDEN' ? 403 
      : error.code === 'BAD_REQUEST' ? 400 
      : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to create customer',
      timestamp: new Date().toISOString()
    });
  }
}
