/**
 * Get Weekly Timesheet Detail Controller
 * ========================================
 * Thin wrapper controller for Express routes.
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { getWeeklyTimesheetDetail } from '../../services/weekly/get-weekly-timesheet-detail.service';
import { ApplicationUserRole } from '../../types/timesheet.types';

/**
 * Get Weekly Timesheet Detail - Express Controller
 * =================================================
 * 
 * @param {Request} req - Express request object
 * @param {string} req.params.timesheetId - UUID of timesheet
 * @param {object} req.body - Request body
 * @param {string} req.body.employeeId - UUID of employee who owns the timesheet
 * @param {Response} res - Express response object
 * 
 * @returns {Promise<Response>} JSON response with timesheet details
 * 
 * @throws {401} Unauthorized - User not authenticated
 * @throws {403} Forbidden - User cannot view another employee's timesheet
 * @throws {404} Not Found - Timesheet not found
 * @throws {500} Internal Server Error - Unexpected error
 */
export async function getWeeklyTimesheetDetailExpressController(req: Request, res: Response) {
  try {
    const { timesheetId } = req.params;
    const { employeeId } = req.body;

    logger.info('📥 Get weekly timesheet detail request received (Express)', {
      userId: (req as any).user?.uuid,
      timesheetId,
      employeeId,
      endpoint: '/timesheet/weekly/:timesheetId/detail'
    });

    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    const result = await getWeeklyTimesheetDetail(
      timesheetId,
      employeeId,
      {
        uuid: user.uuid,
        role: user.role as ApplicationUserRole,
        email: user.email || ''
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Weekly timesheet detail fetched successfully',
      data: result.data,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('💥 Get weekly timesheet detail controller error', {
      type: 'GET_WEEKLY_TIMESHEET_DETAIL_CONTROLLER_ERROR',
      error: error?.message
    });

    const statusCode = error.code === 'FORBIDDEN' ? 403 
      : error.code === 'NOT_FOUND' ? 404 
      : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch weekly timesheet detail',
      timestamp: new Date().toISOString()
    });
  }
}
