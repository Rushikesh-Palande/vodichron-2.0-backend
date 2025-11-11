/**
 * List Weekly Timesheets Controller
 * ===================================
 * Thin wrapper controller for Express routes.
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { getEmployeeWeeklyTimesheets } from '../../services/weekly/list-weekly-timesheets.service';
import { ApplicationUserRole } from '../../types/timesheet.types';

/**
 * List Weekly Timesheets - Express Controller
 * ============================================
 * 
 * @param {Request} req - Express request object
 * @param {string} req.params.employeeId - UUID of employee
 * @param {object} req.body.pagination - Pagination options
 * @param {number} req.body.pagination.page - Page number (default: 0)
 * @param {number} req.body.pagination.pageLimit - Items per page (default: 20)
 * @param {object} req.body.filters - Optional filters
 * @param {string} req.body.filters.month - Month filter (01-12)
 * @param {string} req.body.filters.year - Year filter (YYYY)
 * @param {string} req.body.filters.approvalStatus - Status filter
 * @param {Response} res - Express response object
 * 
 * @returns {Promise<Response>} JSON response with array of weekly timesheets
 * 
 * @throws {401} Unauthorized - User not authenticated
 * @throws {403} Forbidden - User cannot view another employee's timesheets
 * @throws {500} Internal Server Error - Unexpected error
 */
export async function listWeeklyTimesheetsExpressController(req: Request, res: Response) {
  try {
    const { employeeId } = req.params;
    const { pagination, filters } = req.body;

    logger.info('📥 List weekly timesheets request received (Express)', {
      userId: (req as any).user?.uuid,
      employeeId,
      endpoint: '/timesheet/weekly/:employeeId'
    });

    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    const result = await getEmployeeWeeklyTimesheets(
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
      message: 'Weekly timesheets fetched successfully',
      data: result.data,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('💥 List weekly timesheets controller error', {
      type: 'LIST_WEEKLY_TIMESHEETS_CONTROLLER_ERROR',
      error: error?.message
    });

    const statusCode = error.code === 'FORBIDDEN' ? 403 : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch weekly timesheets',
      timestamp: new Date().toISOString()
    });
  }
}
