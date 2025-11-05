/**
 * Apply Leave Store
 * ==================
 * Database operations for leave application
 * 
 * Responsibilities:
 * - Insert new leave requests
 * - Check for leave overlaps
 */

import { QueryTypes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import { sequelize } from '../../../../database';
import { logger, logDatabase, PerformanceTimer } from '../../../../utils/logger';
import { EmployeeLeaveInsert } from '../../types/employee-leave.types';

/**
 * Insert Employee Leave
 * =====================
 * Creates a new leave request in the database
 * 
 * Process:
 * 1. Generate UUID and format dates
 * 2. Build INSERT SQL with all leave fields
 * 3. Execute query with JSON stringified approvers
 * 4. Return leave UUID
 * 
 * @param requestNumber - Random 6-digit request number
 * @param leaveDetails - Leave application data
 * @param createdBy - UUID of user creating the leave
 * @returns UUID of created leave
 */
export async function insertEmployeeLeave(
  requestNumber: number,
  leaveDetails: EmployeeLeaveInsert,
  createdBy: string
): Promise<string> {
  const timer = new PerformanceTimer('insertEmployeeLeave');
  
  try {
    // Generate UUID for new leave
    const leaveUuid = uuidv4();
    
    // Format dates
    const leaveStartDate = moment(leaveDetails.leaveStartDate).format('YYYY-MM-DD');
    const leaveEndDate = moment(leaveDetails.leaveEndDate).format('YYYY-MM-DD');
    const requestedDate = moment(new Date()).format('YYYY-MM-DD');
    
    logger.info('📝 Inserting employee leave request', {
      leaveUuid,
      requestNumber,
      employeeId: leaveDetails.employeeId,
      leaveType: leaveDetails.leaveType,
      operation: 'insertEmployeeLeave'
    });

    // Build INSERT SQL
    const sql = `
      INSERT INTO employee_leaves (
        uuid,
        requestNumber,
        employeeId,
        leaveType,
        reason,
        leaveApprovers,
        leaveApprovalStatus,
        leaveStartDate,
        leaveEndDate,
        leaveDays,
        isHalfDay,
        requestedDate,
        createdAt,
        createdBy,
        updatedBy
      ) VALUES (
        :uuid,
        :requestNumber,
        :employeeId,
        :leaveType,
        :reason,
        :leaveApprovers,
        :leaveApprovalStatus,
        :leaveStartDate,
        :leaveEndDate,
        :leaveDays,
        :isHalfDay,
        :requestedDate,
        CURRENT_TIMESTAMP,
        :createdBy,
        :createdBy
      )
    `;

    // Execute INSERT query
    await sequelize.query(sql, {
      replacements: {
        uuid: leaveUuid,
        requestNumber,
        employeeId: leaveDetails.employeeId,
        leaveType: leaveDetails.leaveType,
        reason: leaveDetails.reason,
        leaveApprovers: JSON.stringify(leaveDetails.leaveApprovers),
        leaveApprovalStatus: leaveDetails.leaveApprovalStatus,
        leaveStartDate,
        leaveEndDate,
        leaveDays: leaveDetails.leaveDays,
        isHalfDay: leaveDetails.isHalfDay,
        requestedDate,
        createdBy,
      },
      type: QueryTypes.INSERT,
    });

    const duration = timer.end();
    logDatabase('INSERT_EMPLOYEE_LEAVE', leaveUuid, duration);

    logger.info('✅ Employee leave inserted successfully', {
      leaveUuid,
      requestNumber,
      duration: `${duration}ms`
    });

    return leaveUuid;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('INSERT_EMPLOYEE_LEAVE_ERROR', 'N/A', duration, error);

    logger.error('❌ Failed to insert employee leave', {
      error: error.message,
      requestNumber,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while inserting leave: ${error.message}`);
  }
}

/**
 * Check Leave Overlap
 * ===================
 * Checks if the requested leave dates overlap with existing approved/requested leaves
 * 
 * Process:
 * 1. Format dates for comparison
 * 2. Query for overlapping leaves (APPROVED or REQUESTED status)
 * 3. Return true if overlap exists
 * 
 * Logic:
 * - Checks if start or end date falls within existing leave period
 * - Only considers APPROVED and REQUESTED leaves
 * - Ignores REJECTED leaves
 * 
 * @param employeeId - UUID of employee
 * @param leaveStartDate - Start date (YYYY-MM-DD)
 * @param leaveEndDate - End date (YYYY-MM-DD)
 * @returns True if overlap exists, false otherwise
 */
export async function checkLeaveOverlap(
  employeeId: string,
  leaveStartDate: string,
  leaveEndDate: string
): Promise<boolean> {
  const timer = new PerformanceTimer('checkLeaveOverlap');
  
  try {
    logger.debug('🔍 Checking for leave overlap', {
      employeeId,
      leaveStartDate,
      leaveEndDate,
      operation: 'checkLeaveOverlap'
    });

    // Format dates
    const startDate = moment(leaveStartDate).format('YYYY-MM-DD');
    const endDate = moment(leaveEndDate).format('YYYY-MM-DD');

    // Query for overlapping leaves
    const sql = `
      SELECT uuid
      FROM employee_leaves
      WHERE employeeId = :employeeId
        AND (
          leaveStartDate BETWEEN :startDate AND :endDate
          OR leaveEndDate BETWEEN :startDate AND :endDate
        )
        AND (leaveApprovalStatus = 'APPROVED' OR leaveApprovalStatus = 'REQUESTED')
      LIMIT 1
    `;

    const result = await sequelize.query<{ uuid: string }>(sql, {
      replacements: { employeeId, startDate, endDate },
      type: QueryTypes.SELECT,
      raw: true,
    });

    const duration = timer.end();
    logDatabase('CHECK_LEAVE_OVERLAP', employeeId, duration);

    const hasOverlap = result.length > 0;

    logger.debug(hasOverlap ? '⚠️ Leave overlap detected' : '✅ No leave overlap', {
      employeeId,
      hasOverlap,
      duration: `${duration}ms`
    });

    return hasOverlap;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('CHECK_LEAVE_OVERLAP_ERROR', employeeId, duration, error);

    logger.error('❌ Failed to check leave overlap', {
      employeeId,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while checking leave overlap: ${error.message}`);
  }
}
