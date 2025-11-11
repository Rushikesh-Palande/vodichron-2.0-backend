/**
 * List Reportee Weekly Timesheets Controller
 * ===========================================
 * Thin wrapper controller for Express routes.
 * For managers/HR to view reportee timesheets.
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { getReporteeWeeklyTimesheets } from '../../services/weekly/list-reportee-weekly-timesheets.service';
import { ApplicationUserRole } from '../../types/timesheet.types';

/**
 * List Reportee Weekly Timesheets - Express Controller
 * =====================================================
 * 
 * @param {Request} req - Express request object
 * @param {object} req.body.pagination - Pagination options
 * @param {number} req.body.pagination.page - Page number (default: 0)
 * @param {number} req.body.pagination.pageLimit - Items per page (default: 20)
 * @param {object} req.body.filters - Optional filters
 * @param {string} req.body.filters.month - Month filter (01-12)
 * @param {string} req.body.filters.year - Year filter (YYYY)
 * @param {string} req.body.filters.approvalStatus - Status filter
 * @param {Response} res - Express response object
 * 
 * @returns {Promise<Response>} JSON response with array of reportee timesheets
 * 
 * @throws {401} Unauthorized - User not authenticated
 * @throws {403} Forbidden - User not authorized (must be HR/Manager/Director)
 * @throws {500} Internal Server Error - Unexpected error
 * 
 * @description
 * - HR/SuperUser: Get ALL employee timesheets
 * - Manager/Director: Get reportee timesheets only
 */
export async function listReporteeWeeklyTimesheetsExpressController(req: Request, res: Response) {
  try {
    const { pagination, filters } = req.body;

    logger.info('📥 List reportee weekly timesheets request received (Express)', {
      userId: (req as any).user?.uuid,
      userRole: (req as any).user?.role,
      endpoint: '/timesheet/weekly/reportee'
    });

    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    const result = await getReporteeWeeklyTimesheets(
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
      message: 'Reportee timesheets fetched successfully',
      data: result.data,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('💥 List reportee timesheets controller error', {
      type: 'LIST_REPORTEE_TIMESHEETS_CONTROLLER_ERROR',
      error: error?.message
    });

    const statusCode = error.code === 'FORBIDDEN' ? 403 : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch reportee timesheets',
      timestamp: new Date().toISOString()
    });
  }
}
