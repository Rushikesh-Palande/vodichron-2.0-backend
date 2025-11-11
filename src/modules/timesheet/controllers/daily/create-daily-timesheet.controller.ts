/**
 * Create Daily Timesheet Controller
 * ===================================
 * Thin wrapper controller for Express routes.
 * Delegates to the service layer for business logic.
 * 
 * Pattern:
 * Controller (thin wrapper) → Service (business logic)
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { createDailyTimesheet } from '../../services/daily/create-daily-timesheet.service';
import { CreateDailyTimesheetInput } from '../../types/timesheet.types';
import { ApplicationUserRole } from '../../types/timesheet.types';

/**
 * Create Daily Timesheet - Express Controller
 * ============================================
 * Thin wrapper that delegates to the service layer.
 * 
 * @param {Request} req - Express request object
 * @param {Request} req.body - Timesheet data
 * @param {string} req.body.employeeId - UUID of employee creating timesheet
 * @param {string} req.body.timesheetDate - Date in YYYY-MM-DD format
 * @param {Array} req.body.taskDetails - Array of daily task entries
 * @param {number} req.body.totalHours - Total hours worked
 * @param {Response} res - Express response object
 * 
 * @returns {Promise<Response>} JSON response with created timesheet UUID
 * 
 * @throws {401} Unauthorized - User not authenticated
 * @throws {403} Forbidden - User cannot create timesheet for another employee
 * @throws {400} Bad Request - Validation failed or duplicate timesheet exists
 * @throws {500} Internal Server Error - Unexpected error
 * 
 * @example
 * POST /api/timesheet/daily/create
 * Authorization: Bearer <JWT_TOKEN>
 * Body: { "employeeId": "uuid", "timesheetDate": "2024-01-15", "taskDetails": [...], "totalHours": 8 }
 */
export async function createDailyTimesheetExpressController(req: Request, res: Response) {
  try {
    logger.info('📥 Create daily timesheet request received (Express)', {
      userId: (req as any).user?.uuid,
      userRole: (req as any).user?.role,
      endpoint: '/timesheet/daily/create'
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
    const result = await createDailyTimesheet(req.body as CreateDailyTimesheetInput, {
      uuid: user.uuid,
      role: user.role as ApplicationUserRole,
      email: user.email || ''
    });

    logger.info('✅ Daily timesheet created successfully (Express)', {
      timesheetUuid: result.timesheetUuid,
      userId: user.uuid
    });

    // Send success response
    return res.status(201).json({
      success: true,
      message: 'Daily timesheet created successfully',
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('💥 Create daily timesheet controller error', {
      type: 'CREATE_DAILY_TIMESHEET_CONTROLLER_ERROR',
      error: error?.message,
      stack: error?.stack
    });

    // Send error response
    const statusCode = error.code === 'FORBIDDEN' ? 403 
      : error.code === 'BAD_REQUEST' ? 400 
      : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to create daily timesheet',
      timestamp: new Date().toISOString()
    });
  }
}
