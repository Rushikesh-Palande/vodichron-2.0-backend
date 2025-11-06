/**
 * Update Customer Controller
 * ==========================
 * Thin wrapper controller for updating and deleting customer records
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { updateCustomerData, deleteCustomer } from '../../services/crud/update-customer.service';
import { UpdateCustomerInput } from '../../schemas/crud/create-customer.schemas';
import { ApplicationUserRole } from '../../types/customer.types';

/**
 * Update Customer
 */
export async function updateCustomerController(req: Request, res: Response) {
  try {
    logger.info('📥 Update customer request received', {
      customerId: req.body.uuid,
      userId: (req as any).user?.uuid
    });

    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    const customerData = req.body as UpdateCustomerInput;

    const result = await updateCustomerData(customerData, {
      uuid: user.uuid,
      role: user.role as ApplicationUserRole,
      email: user.email || ''
    });

    logger.info('✅ Customer updated successfully', {
      customerId: customerData.uuid,
      userId: user.uuid
    });

    return res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('💥 Update customer controller error', {
      error: error?.message
    });

    const statusCode = error.code === 'FORBIDDEN' ? 403
      : error.code === 'NOT_FOUND' ? 404
      : error.code === 'BAD_REQUEST' ? 400
      : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update customer',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Delete Customer
 */
export async function deleteCustomerController(req: Request, res: Response) {
  try {
    logger.info('📥 Delete customer request received', {
      customerId: req.params.id,
      userId: (req as any).user?.uuid
    });

    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    await deleteCustomer(req.params.id, {
      uuid: user.uuid,
      role: user.role as ApplicationUserRole,
      email: user.email || ''
    });

    logger.info('✅ Customer deleted successfully', {
      customerId: req.params.id,
      userId: user.uuid
    });

    return res.status(204).send();

  } catch (error: any) {
    logger.error('💥 Delete customer controller error', {
      error: error?.message
    });

    const statusCode = error.code === 'NOT_FOUND' ? 404
      : error.code === 'FORBIDDEN' ? 403
      : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to delete customer',
      timestamp: new Date().toISOString()
    });
  }
}
