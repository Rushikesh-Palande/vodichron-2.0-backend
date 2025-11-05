/**
 * Update Leave Status Store
 * ==========================
 * Database operations for updating leave approval status
 * 
 * Responsibilities:
 * - Update leave approvers and approval status
 */

import { QueryTypes } from 'sequelize';
import moment from 'moment';
import { sequelize } from '../../../../database';
import { logger, logDatabase, PerformanceTimer } from '../../../../utils/logger';
import { LeaveApprover } from '../../types/employee-leave.types';
import { LeaveApprovalStatus } from '../../constants/leave.constants';

/**
 * Update Leave Status By Leave ID
 * ===============================
 * Updates leave approval status and approvers list
 * 
 * Process:
 * 1. Format current timestamp
 * 2. Stringify leaveApprovers array to JSON
 * 3. Execute UPDATE query
 * 4. Return success
 * 
 * Updates:
 * - leaveApprovers (JSON field with all approver statuses)
 * - leaveApprovalStatus (overall status: REQUESTED/PENDING/APPROVED/REJECTED)
 * - updatedAt timestamp
 * - updatedBy user UUID
 * 
 * @param loggedInUserId - UUID of user performing the update
 * @param leaveId - UUID of leave to update
 * @param leaveApprovers - Updated array of approvers with their statuses
 * @param leaveApprovalStatus - Updated overall approval status
 * @returns True on success
 */
export async function updateLeaveStatusByLeaveId(
  loggedInUserId: string,
  leaveId: string,
  leaveApprovers: LeaveApprover[],
  leaveApprovalStatus: LeaveApprovalStatus
): Promise<boolean> {
  const timer = new PerformanceTimer('updateLeaveStatusByLeaveId');
  
  try {
    logger.info('📝 Updating leave status', {
      leaveId,
      leaveApprovalStatus,
      updatedBy: loggedInUserId,
      operation: 'updateLeaveStatusByLeaveId'
    });

    // Format current timestamp
    const currentDateTime = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');

    // Build UPDATE SQL
    const sql = `
      UPDATE employee_leaves
      SET 
        leaveApprovers = :leaveApprovers,
        leaveApprovalStatus = :leaveApprovalStatus,
        updatedAt = :updatedAt,
        updatedBy = :updatedBy
      WHERE uuid = :leaveId
    `;

    // Execute UPDATE query
    await sequelize.query(sql, {
      replacements: {
        leaveApprovers: JSON.stringify(leaveApprovers),
        leaveApprovalStatus,
        updatedAt: currentDateTime,
        updatedBy: loggedInUserId,
        leaveId,
      },
      type: QueryTypes.UPDATE,
    });

    const duration = timer.end();
    logDatabase('UPDATE_LEAVE_STATUS', leaveId, duration);

    logger.info('✅ Leave status updated successfully', {
      leaveId,
      leaveApprovalStatus,
      duration: `${duration}ms`
    });

    return true;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('UPDATE_LEAVE_STATUS_ERROR', leaveId, duration, error);

    logger.error('❌ Failed to update leave status', {
      leaveId,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while updating leave status: ${error.message}`);
  }
}
