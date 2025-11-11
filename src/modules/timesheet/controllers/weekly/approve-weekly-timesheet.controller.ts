/**
 * Approve Weekly Timesheet Controller
 * ====================================
 * Thin wrapper controller for Express routes.
 * Handles approval/rejection of weekly timesheets.
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { approveWeeklyTimesheet, ApprovalStatus } from '../../services/weekly/approve-weekly-timesheet.service';
import { ApplicationUserRole } from '../../types/timesheet.types';

/**
 * Approve Weekly Timesheet - Express Controller
 * ==============================================
 * 
 * @param {Request} req - Express request object
 * @param {string} req.params.timesheetId - UUID of timesheet
 * @param {object} req.body - Approval data
 * @param {string} req.body.approvalStatus - 'APPROVED' or 'REJECTED'
 * @param {string} req.body.comment - Optional approver comment/feedback
 * @param {object} req.body.employeeDetails - Employee information for email notification
 * @param {string} req.body.employeeDetails.uuid - Employee UUID
 * @param {string} req.body.employeeDetails.name - Employee name
 * @param {string} req.body.employeeDetails.officialEmailId - Employee email
 * @param {Response} res - Express response object
 * 
 * @returns {Promise<Response>} JSON response with success status
 * 
 * @throws {401} Unauthorized - User not authenticated
 * @throws {403} Forbidden - User not authorized to approve timesheets
 * @throws {400} Bad Request - Invalid approval status or timesheet already processed
 * @throws {500} Internal Server Error - Unexpected error
 * 
 * @description
 * - Unlocks all task cells if timesheet is rejected
 * - Sends approval/rejection email notification to employee
 * - Records approver information and timestamp
 */
export async function approveWeeklyTimesheetExpressController(req: Request, res: Response) {
  try {
    const { timesheetId } = req.params;
    const { approvalStatus, comment, employeeDetails } = req.body;

    logger.info('📥 Approve weekly timesheet request received (Express)', {
      userId: (req as any).user?.uuid,
      userRole: (req as any).user?.role,
      timesheetId,
      approvalStatus,
      endpoint: '/timesheet/weekly/:timesheetId/approve'
    });

    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    const result = await approveWeeklyTimesheet(
      {
        timesheetId,
        approvalStatus: approvalStatus as ApprovalStatus,
        comment
      },
      employeeDetails,
      {
        uuid: user.uuid,
        role: user.role as ApplicationUserRole,
        email: user.email || '',
        name: user.email
      }
    );

    logger.info('✅ Weekly timesheet approval updated successfully (Express)', {
      timesheetId,
      approvalStatus,
      userId: user.uuid
    });

    return res.status(200).json({
      success: true,
      message: 'Weekly timesheet approval updated successfully',
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('💥 Approve weekly timesheet controller error', {
      type: 'APPROVE_WEEKLY_TIMESHEET_CONTROLLER_ERROR',
      error: error?.message,
      stack: error?.stack
    });

    const statusCode = error.code === 'FORBIDDEN' ? 403 
      : error.code === 'BAD_REQUEST' ? 400 
      : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to approve weekly timesheet',
      timestamp: new Date().toISOString()
    });
  }
}
