/**
 * Weekly Timesheet Store - Dashboard Operations
 * ==============================================
 * Database operations for dashboard reporting and pending status tracking
 * 
 * Based on old vodichron employeeWeeklyTimesheet.ts store
 * Provides insights for managers, directors, HR, and customers
 */

import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../../database';
import { logger, logDatabase, PerformanceTimer } from '../../../../utils/logger';

/**
 * Pending Timesheet Approval Interface
 * -------------------------------------
 * Structure for pending approval records
 */
interface PendingTimesheetApproval {
  requestNumber: number;
  employeeName: string;
  weekEndingDate: string;
}

/**
 * Pending Timesheet Submission Interface
 * ---------------------------------------
 * Structure for pending submission records
 */
interface PendingTimesheetSubmission {
  employeeName: string;
}

/**
 * Get Employee Pending Timesheet Approvals
 * -----------------------------------------
 * Retrieves all timesheets pending approval across the organization
 * Used by Super User and HR roles to see all pending approvals
 * 
 * @returns Array of pending timesheet approvals with employee details
 */
export async function getEmployeePendingTimesheetApprovals(): Promise<PendingTimesheetApproval[] | number> {
  const timer = new PerformanceTimer('getEmployeePendingTimesheetApprovals');
  
  try {
    logger.debug('📊 Fetching all pending timesheet approvals', {
      operation: 'getEmployeePendingTimesheetApprovals'
    });

    const sql = `
      SELECT 
        employee_weekly_timesheets.requestNumber, 
        employees.name as employeeName,
        DATE_FORMAT(employee_weekly_timesheets.weekEndDate, '%d-%m-%Y') AS weekEndingDate
      FROM employee_weekly_timesheets  
        LEFT JOIN employees ON employee_weekly_timesheets.employeeId = employees.uuid
      WHERE employee_weekly_timesheets.approvalStatus = 'REQUESTED'
      ORDER BY employees.name ASC
    `;
    
    const result = await sequelize.query<PendingTimesheetApproval>(sql, {
      type: QueryTypes.SELECT,
      raw: true,
    });

    const duration = timer.end();
    logDatabase('GET_PENDING_APPROVALS', 'all', duration);

    logger.debug('✅ Pending approvals fetched successfully', {
      count: result.length,
      duration: `${duration}ms`
    });

    if (result && result.length > 0) {
      return result;
    }
    
    return 0;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('GET_PENDING_APPROVALS_ERROR', 'all', duration, error);
    
    logger.error('❌ Failed to fetch pending approvals', {
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while fetching pending approvals: ${error.message}`);
  }
}

/**
 * Get Employee Pending Timesheet Submission (Last Week)
 * ------------------------------------------------------
 * Retrieves employees who haven't submitted timesheets for last week
 * Used by Super User and HR roles to track submission compliance
 * 
 * @returns Array of employee names who haven't submitted
 */
export async function getEmployeePendingTimesheetSubmissionLastWeek(): Promise<PendingTimesheetSubmission[]> {
  const timer = new PerformanceTimer('getEmployeePendingTimesheetSubmissionLastWeek');
  
  try {
    logger.debug('📊 Fetching pending timesheet submissions from last week', {
      operation: 'getEmployeePendingTimesheetSubmissionLastWeek'
    });

    const sql = `
      SELECT
        e.name AS employeeName
      FROM employees e
        LEFT JOIN (
          SELECT
            employeeId,
            MAX(weekEndDate) AS latestWeekEndDate
          FROM employee_weekly_timesheets
          GROUP BY employeeId
        ) t ON e.uuid = t.employeeId
      WHERE
        t.latestWeekEndDate IS NULL
        OR t.latestWeekEndDate < CURDATE() - INTERVAL 1 WEEK
      ORDER BY employeeName ASC
    `;
    
    const result = await sequelize.query<PendingTimesheetSubmission>(sql, {
      type: QueryTypes.SELECT,
      raw: true,
    });

    const duration = timer.end();
    logDatabase('GET_PENDING_SUBMISSIONS', 'all', duration);

    logger.debug('✅ Pending submissions fetched successfully', {
      count: result.length,
      duration: `${duration}ms`
    });

    return result.length > 0 ? result : [];

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('GET_PENDING_SUBMISSIONS_ERROR', 'all', duration, error);
    
    logger.error('❌ Failed to fetch pending submissions', {
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while fetching pending submissions: ${error.message}`);
  }
}

/**
 * Get Reporting Employee Pending Timesheet Submission (Last Week)
 * ----------------------------------------------------------------
 * Retrieves reportees who haven't submitted timesheets for last week
 * Used by Manager and Director roles to track their team's submission
 * 
 * @param loggedInUserId - UUID of the manager/director
 * @returns Array of employee names who haven't submitted
 */
export async function getReportingEmployeePendingTimesheetSubmissionLastWeek(
  loggedInUserId: string
): Promise<PendingTimesheetSubmission[]> {
  const timer = new PerformanceTimer('getReportingEmployeePendingTimesheetSubmissionLastWeek');
  
  try {
    logger.debug('📊 Fetching reportee pending submissions', {
      loggedInUserId,
      operation: 'getReportingEmployeePendingTimesheetSubmissionLastWeek'
    });

    const sql = `
      SELECT
        e.name AS employeeName
      FROM employees e
        LEFT JOIN (
          SELECT
            employeeId,
            MAX(weekEndDate) AS latestWeekEndDate
          FROM employee_weekly_timesheets
          GROUP BY employeeId
        ) t ON e.uuid = t.employeeId
      WHERE
        (t.latestWeekEndDate IS NULL OR t.latestWeekEndDate < CURDATE() - INTERVAL 1 WEEK)
        AND (e.reportingManagerId = ? OR e.reportingDirectorId = ?)
      ORDER BY employeeName ASC
    `;
    
    const result = await sequelize.query<PendingTimesheetSubmission>(sql, {
      replacements: [loggedInUserId, loggedInUserId],
      type: QueryTypes.SELECT,
      raw: true,
    });

    const duration = timer.end();
    logDatabase('GET_REPORTEE_PENDING_SUBMISSIONS', loggedInUserId, duration);

    logger.debug('✅ Reportee pending submissions fetched successfully', {
      loggedInUserId,
      count: result.length,
      duration: `${duration}ms`
    });

    return result.length > 0 ? result : [];

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('GET_REPORTEE_PENDING_SUBMISSIONS_ERROR', loggedInUserId, duration, error);
    
    logger.error('❌ Failed to fetch reportee pending submissions', {
      loggedInUserId,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while fetching reportee pending submissions: ${error.message}`);
  }
}

/**
 * Get Reporting Employee Pending Timesheet Approvals
 * ---------------------------------------------------
 * Retrieves pending timesheet approvals for employees reporting to logged-in user
 * Used by Manager and Director roles to see their team's pending approvals
 * 
 * @param loggedInUserId - UUID of the manager/director
 * @returns Array of pending approvals or 0 if none
 */
export async function getReportingEmployeePendingTimesheetApprovals(
  loggedInUserId: string
): Promise<PendingTimesheetApproval[] | number> {
  const timer = new PerformanceTimer('getReportingEmployeePendingTimesheetApprovals');
  
  try {
    logger.debug('📊 Fetching reportee pending approvals', {
      loggedInUserId,
      operation: 'getReportingEmployeePendingTimesheetApprovals'
    });

    const sql = `
      SELECT 
        employee_weekly_timesheets.requestNumber, 
        employees.name as employeeName,
        DATE_FORMAT(employee_weekly_timesheets.weekEndDate, '%d-%m-%Y') AS weekEndingDate
      FROM employee_weekly_timesheets 
        INNER JOIN employees ON employee_weekly_timesheets.employeeId = employees.uuid
      WHERE employee_weekly_timesheets.approvalStatus = 'REQUESTED'
        AND (employees.reportingManagerId = ? OR employees.reportingDirectorId = ?)
      ORDER BY employees.name ASC
    `;
    
    const result = await sequelize.query<PendingTimesheetApproval>(sql, {
      replacements: [loggedInUserId, loggedInUserId],
      type: QueryTypes.SELECT,
      raw: true,
    });

    const duration = timer.end();
    logDatabase('GET_REPORTEE_PENDING_APPROVALS', loggedInUserId, duration);

    logger.debug('✅ Reportee pending approvals fetched successfully', {
      loggedInUserId,
      count: result.length,
      duration: `${duration}ms`
    });

    if (result && result.length > 0) {
      return result;
    }
    
    return 0;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('GET_REPORTEE_PENDING_APPROVALS_ERROR', loggedInUserId, duration, error);
    
    logger.error('❌ Failed to fetch reportee pending approvals', {
      loggedInUserId,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while fetching reportee pending approvals: ${error.message}`);
  }
}

/**
 * Get Pending Timesheet Submission by Employee ID (Last Week)
 * ------------------------------------------------------------
 * Checks if a specific employee has pending timesheet submission
 * Used for individual employee dashboard/notifications
 * 
 * @param employeeId - UUID of the employee
 * @returns Array with employee name if pending, empty array otherwise
 */
export async function getPendingTimesheetSubmissionLastWeekByEmployeeId(
  employeeId: string
): Promise<PendingTimesheetSubmission[]> {
  const timer = new PerformanceTimer('getPendingTimesheetSubmissionLastWeekByEmployeeId');
  
  try {
    logger.debug('📊 Checking employee pending submission', {
      employeeId,
      operation: 'getPendingTimesheetSubmissionLastWeekByEmployeeId'
    });

    const sql = `
      SELECT
        e.name AS employeeName
      FROM employees e
        LEFT JOIN (
          SELECT
            employeeId,
            MAX(weekEndDate) AS latestWeekEndDate
          FROM employee_weekly_timesheets
          GROUP BY employeeId
        ) t ON e.uuid = t.employeeId
      WHERE
        (t.latestWeekEndDate IS NULL OR t.latestWeekEndDate < CURDATE() - INTERVAL 1 WEEK)
        AND (e.uuid = ?)
      ORDER BY employeeName ASC
    `;
    
    const result = await sequelize.query<PendingTimesheetSubmission>(sql, {
      replacements: [employeeId],
      type: QueryTypes.SELECT,
      raw: true,
    });

    const duration = timer.end();
    logDatabase('GET_EMPLOYEE_PENDING_SUBMISSION', employeeId, duration);

    logger.debug(result.length > 0 ? '⚠️ Employee has pending submission' : '✅ No pending submissions', {
      employeeId,
      hasPending: result.length > 0,
      duration: `${duration}ms`
    });

    return result.length > 0 ? result : [];

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('GET_EMPLOYEE_PENDING_SUBMISSION_ERROR', employeeId, duration, error);
    
    logger.error('❌ Failed to check employee pending submission', {
      employeeId,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while checking pending submission: ${error.message}`);
  }
}

/**
 * Get Employee Pending Timesheet Approvals by ID
 * -----------------------------------------------
 * Retrieves pending approvals for a specific employee
 * Used for employee's own dashboard to see their pending approvals
 * 
 * @param employeeId - UUID of the employee
 * @returns Array of pending approvals or 0 if none
 */
export async function getEmployeePendingTimesheetApprovalsById(
  employeeId: string
): Promise<Omit<PendingTimesheetApproval, 'employeeName'>[] | number> {
  const timer = new PerformanceTimer('getEmployeePendingTimesheetApprovalsById');
  
  try {
    logger.debug('📊 Fetching employee pending approvals', {
      employeeId,
      operation: 'getEmployeePendingTimesheetApprovalsById'
    });

    const sql = `
      SELECT 
        employee_weekly_timesheets.requestNumber,  
        DATE_FORMAT(employee_weekly_timesheets.weekEndDate, '%d-%m-%Y') AS weekEndingDate
      FROM employee_weekly_timesheets  
      WHERE employee_weekly_timesheets.approvalStatus = 'REQUESTED'
        AND employee_weekly_timesheets.employeeId = ?
    `;
    
    const result = await sequelize.query<Omit<PendingTimesheetApproval, 'employeeName'>>(sql, {
      replacements: [employeeId],
      type: QueryTypes.SELECT,
      raw: true,
    });

    const duration = timer.end();
    logDatabase('GET_EMPLOYEE_PENDING_APPROVALS', employeeId, duration);

    logger.debug('✅ Employee pending approvals fetched successfully', {
      employeeId,
      count: result.length,
      duration: `${duration}ms`
    });

    if (result && result.length > 0) {
      return result;
    }
    
    return 0;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('GET_EMPLOYEE_PENDING_APPROVALS_ERROR', employeeId, duration, error);
    
    logger.error('❌ Failed to fetch employee pending approvals', {
      employeeId,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while fetching employee pending approvals: ${error.message}`);
  }
}

/**
 * Get Resource Pending Timesheet Approvals by Customer ID
 * --------------------------------------------------------
 * Retrieves pending timesheet approvals for resources allocated to a customer
 * Used by Customer role to see pending approvals for their allocated resources
 * 
 * @param customerId - UUID of the customer
 * @returns Array of pending approvals or 0 if none
 */
export async function getResourcePendingTimesheetApprovalsByCustomerId(
  customerId: string
): Promise<Omit<PendingTimesheetApproval, 'employeeName'>[] | number> {
  const timer = new PerformanceTimer('getResourcePendingTimesheetApprovalsByCustomerId');
  
  try {
    logger.debug('📊 Fetching customer resource pending approvals', {
      customerId,
      operation: 'getResourcePendingTimesheetApprovalsByCustomerId'
    });

    const sql = `
      SELECT 
        employee_weekly_timesheets.requestNumber,  
        DATE_FORMAT(employee_weekly_timesheets.weekEndDate, '%d-%m-%Y') AS weekEndingDate
      FROM employee_weekly_timesheets  
        INNER JOIN project_resource_allocation 
          ON employee_weekly_timesheets.employeeId = project_resource_allocation.employeeId
      WHERE 
        employee_weekly_timesheets.approvalStatus = 'REQUESTED'
        AND project_resource_allocation.customerId = ?
        AND project_resource_allocation.status = 'ACTIVE'
    `;
    
    const result = await sequelize.query<Omit<PendingTimesheetApproval, 'employeeName'>>(sql, {
      replacements: [customerId],
      type: QueryTypes.SELECT,
      raw: true,
    });

    const duration = timer.end();
    logDatabase('GET_CUSTOMER_PENDING_APPROVALS', customerId, duration);

    logger.debug('✅ Customer resource pending approvals fetched successfully', {
      customerId,
      count: result.length,
      duration: `${duration}ms`
    });

    if (result && result.length > 0) {
      return result;
    }
    
    return 0;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('GET_CUSTOMER_PENDING_APPROVALS_ERROR', customerId, duration, error);
    
    logger.error('❌ Failed to fetch customer resource pending approvals', {
      customerId,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while fetching customer pending approvals: ${error.message}`);
  }
}
