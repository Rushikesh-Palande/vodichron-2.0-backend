/**
 * List Daily Timesheets Controller
 * ==================================
 * Thin wrapper controller for Express routes.
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { getEmployeeDailyTimesheets } from '../../services/daily/list-daily-timesheets.service';
import { ApplicationUserRole } from '../../types/timesheet.types';

/**
 * List Daily Timesheets - Express Controller
 * ===========================================
 * 
 * @param {Request} req - Express request object
 * @param {string} req.params.employeeId - UUID of employee
 * @param {object} req.body.pagination - Pagination options
 * @param {object} req.body.filters - Optional filters (month, year, approvalStatus)
 * @param {Response} res - Express response object
 * 
 * @returns {Promise<Response>} JSON response with array of daily timesheets
 * 
 * @throws {401} Unauthorized - User not authenticated
 * @throws {403} Forbidden - User cannot view another employee's timesheets
 * @throws {500} Internal Server Error - Unexpected error
 */
export async function listDailyTimesheetsExpressController(req: Request, res: Response) {
  try {
    const { employeeId } = req.params;
    const { pagination, filters } = req.body;

    logger.info('📥 List daily timesheets request received (Express)', {
      userId: (req as any).user?.uuid,
      employeeId,
      endpoint: '/timesheet/daily/:employeeId'
    });

    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    const timesheets = await getEmployeeDailyTimesheets(
      employeeId,
      pagination || {},
      filters,
      {
        uuid: user.uuid,
        role: user.role as ApplicationUserRole,
        email: user.email || ''
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Daily timesheets fetched successfully',
      data: timesheets,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('💥 List daily timesheets controller error', {
      type: 'LIST_DAILY_TIMESHEETS_CONTROLLER_ERROR',
      error: error?.message
    });

    const statusCode = error.code === 'FORBIDDEN' ? 403 : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch daily timesheets',
      timestamp: new Date().toISOString()
    });
  }
}
