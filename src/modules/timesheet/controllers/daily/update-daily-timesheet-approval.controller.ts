/**
 * Update Daily Timesheet Approval Controller
 * ===========================================
 * Thin wrapper controller for Express routes.
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { updateDailyTimesheetApproval, ApprovalStatus } from '../../services/daily/update-daily-timesheet-approval.service';
import { ApplicationUserRole } from '../../types/timesheet.types';

/**
 * Update Daily Timesheet Approval - Express Controller
 * =====================================================
 * 
 * @param {Request} req - Express request object
 * @param {string} req.params.timesheetUuid - UUID of timesheet
 * @param {object} req.body - Approval data
 * @param {string} req.body.approvalStatus - 'APPROVED' or 'REJECTED'
 * @param {string} req.body.comment - Optional approver comment
 * @param {string} req.body.employeeName - Employee name for email notification
 * @param {string} req.body.employeeEmail - Employee email for notification
 * @param {Response} res - Express response object
 * 
 * @returns {Promise<Response>} JSON response with success status
 * 
 * @throws {401} Unauthorized - User not authenticated
 * @throws {403} Forbidden - User not authorized to approve timesheets
 * @throws {400} Bad Request - Invalid approval status
 * @throws {500} Internal Server Error - Unexpected error
 */
export async function updateDailyTimesheetApprovalExpressController(req: Request, res: Response) {
  try {
    const { timesheetUuid } = req.params;
    const { approvalStatus, comment, employeeName, employeeEmail, requestNumber, totalHours, timesheetDate } = req.body;

    logger.info('📥 Update daily timesheet approval request received (Express)', {
      userId: (req as any).user?.uuid,
      timesheetUuid,
      approvalStatus,
      endpoint: '/timesheet/daily/:timesheetUuid/approval'
    });

    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    const result = await updateDailyTimesheetApproval(
      {
        timesheetUuid,
        approvalStatus: approvalStatus as ApprovalStatus,
        comment,
        employeeName,
        employeeEmail,
        requestNumber,
        totalHours,
        timesheetDate
      },
      {
        uuid: user.uuid,
        role: user.role as ApplicationUserRole,
        email: user.email || '',
        name: user.email
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Daily timesheet approval updated successfully',
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('💥 Update daily timesheet approval controller error', {
      type: 'UPDATE_DAILY_TIMESHEET_APPROVAL_CONTROLLER_ERROR',
      error: error?.message
    });

    const statusCode = error.code === 'FORBIDDEN' ? 403 
      : error.code === 'BAD_REQUEST' ? 400 
      : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update daily timesheet approval',
      timestamp: new Date().toISOString()
    });
  }
}
