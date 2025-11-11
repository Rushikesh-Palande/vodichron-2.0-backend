/**
 * Create Weekly Timesheet Controller
 * ====================================
 * Thin wrapper controller for Express routes.
 * Delegates to the service layer for business logic.
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { createWeeklyTimesheet } from '../../services/weekly/create-weekly-timesheet.service';
import { ApplicationUserRole } from '../../types/timesheet.types';

/**
 * Create Weekly Timesheet - Express Controller
 * =============================================
 * 
 * @param {Request} req - Express request object
 * @param {object} req.body - Request body containing timesheet data and employee details
 * @param {object} req.body.timesheetData - Weekly timesheet data
 * @param {string} req.body.timesheetData.employeeId - UUID of employee
 * @param {string} req.body.timesheetData.weekStartDate - Week start date (YYYY-MM-DD)
 * @param {string} req.body.timesheetData.weekEndDate - Week end date (YYYY-MM-DD)
 * @param {Array} req.body.timesheetData.taskDetails - Array of weekly task entries
 * @param {number} req.body.timesheetData.totalHours - Total hours for the week
 * @param {string} req.body.timesheetData.timeSheetStatus - Status (REQUESTED, SAVED, etc.)
 * @param {object} req.body.employeeDetails - Employee information for notifications
 * @param {string} req.body.employeeDetails.uuid - Employee UUID
 * @param {string} req.body.employeeDetails.name - Employee name
 * @param {string} req.body.employeeDetails.officialEmailId - Employee email
 * @param {string} req.body.employeeDetails.managerDetail - Manager details (optional)
 * @param {string} req.body.employeeDetails.directorDetail - Director details (optional)
 * @param {Response} res - Express response object
 * 
 * @returns {Promise<Response>} JSON response with created timesheet UUID and request number
 * 
 * @throws {401} Unauthorized - User not authenticated
 * @throws {403} Forbidden - User cannot create timesheet for another employee
 * @throws {400} Bad Request - Validation failed or duplicate timesheet exists
 * @throws {500} Internal Server Error - Unexpected error
 * 
 * @example
 * POST /api/timesheet/weekly/create
 * Authorization: Bearer <JWT_TOKEN>
 * Body: {
 *   "timesheetData": { "employeeId": "uuid", "weekStartDate": "2024-01-15", ... },
 *   "employeeDetails": { "uuid": "uuid", "name": "John Doe", ... }
 * }
 */
export async function createWeeklyTimesheetExpressController(req: Request, res: Response) {
  try {
    logger.info('📥 Create weekly timesheet request received (Express)', {
      userId: (req as any).user?.uuid,
      userRole: (req as any).user?.role,
      endpoint: '/timesheet/weekly/create'
    });

    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    const { timesheetData, employeeDetails } = req.body;

    const result = await createWeeklyTimesheet(
      timesheetData,
      employeeDetails,
      {
        uuid: user.uuid,
        role: user.role as ApplicationUserRole,
        email: user.email || '',
        name: user.email
      }
    );

    logger.info('✅ Weekly timesheet created successfully (Express)', {
      timesheetUuid: result.timesheetUuid,
      requestNumber: result.requestNumber,
      userId: user.uuid
    });

    return res.status(201).json({
      success: true,
      message: 'Weekly timesheet created successfully',
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('💥 Create weekly timesheet controller error', {
      type: 'CREATE_WEEKLY_TIMESHEET_CONTROLLER_ERROR',
      error: error?.message,
      stack: error?.stack
    });

    const statusCode = error.code === 'FORBIDDEN' ? 403 
      : error.code === 'BAD_REQUEST' ? 400 
      : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to create weekly timesheet',
      timestamp: new Date().toISOString()
    });
  }
}
