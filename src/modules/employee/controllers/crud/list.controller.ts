/**
 * Get Employees List Controller
 * ==============================
 * 
 * Thin wrapper controller for Express routes.
 * Delegates to the service layer for business logic.
 * 
 * Pattern:
 * Controller (thin wrapper) → Service (business logic)
 * 
 * Note: tRPC routers have their own implementation and don't use this controller.
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { handleGetEmployeesList } from '../../services/crud/list.service';

/**
 * Get Employees List - Express Controller
 * ========================================
 * Thin wrapper that delegates to the service layer.
 * Matches the auth module pattern.
 */
export async function getEmployeesListExpressController(req: Request, res: Response) {
  try {
    return await handleGetEmployeesList(req, res);
  } catch (error: any) {
    logger.error('💥 GetEmployeesList controller error', {
      type: 'EMPLOYEE_LIST_CONTROLLER_ERROR',
      error: error?.message,
      stack: error?.stack
    });
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
}
