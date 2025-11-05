/**
 * Get Leaves Store
 * =================
 * Database operations for fetching leave records
 * 
 * Responsibilities:
 * - Get leave by ID
 * - Get employee leaves (paginated with filters)
 * - Get reportee leaves for managers
 * - Get all leaves for HR/Super User
 */

import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../../database';
import { logger, logDatabase, PerformanceTimer } from '../../../../utils/logger';
import {
  EmployeeLeave,
  ReporteeLeave,
  EmployeeLeaveFilters,
  AppliedLeaves,
} from '../../types/employee-leave.types';
import { LeaveApprovalStatus } from '../../constants/leave.constants';

/**
 * Get Leave Details By ID
 * =======================
 * Fetches leave record by UUID
 * 
 * Process:
 * 1. Query employee_leaves table by UUID
 * 2. Parse JSON leaveApprovers field
 * 3. Return leave or null if not found
 * 
 * @param leaveId - UUID of leave
 * @returns Leave record or null if not found
 */
export async function getLeaveDetailsById(leaveId: string): Promise<EmployeeLeave | null> {
  const timer = new PerformanceTimer('getLeaveDetailsById');
  
  try {
    logger.debug('🔍 Fetching leave details by ID', {
      leaveId,
      operation: 'getLeaveDetailsById'
    });

    // Query leave by ID
    const sql = `
      SELECT *
      FROM employee_leaves
      WHERE uuid = :leaveId
      LIMIT 1
    `;

    const result = await sequelize.query<EmployeeLeave>(sql, {
      replacements: { leaveId },
      type: QueryTypes.SELECT,
      raw: true,
    });

    const duration = timer.end();
    logDatabase('GET_LEAVE_BY_ID', leaveId, duration);

    // Parse JSON field and return
    if (result.length > 0) {
      const leave = result[0];
      leave.leaveApprovers = JSON.parse(leave.leaveApprovers as any);
      
      logger.debug('✅ Leave details found', {
        leaveId,
        duration: `${duration}ms`
      });
      
      return leave;
    }

    logger.debug('❌ Leave not found', {
      leaveId,
      duration: `${duration}ms`
    });

    return null;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('GET_LEAVE_BY_ID_ERROR', leaveId, duration, error);

    logger.error('❌ Failed to fetch leave details', {
      leaveId,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while fetching leave: ${error.message}`);
  }
}

/**
 * Get Paginated Employee Leaves By Employee ID
 * ============================================
 * Fetches leave records for a specific employee with pagination and filters
 * 
 * Process:
 * 1. Build filter clauses (leaveType, year, status)
 * 2. Build pagination (LIMIT/OFFSET)
 * 3. Execute query with JOIN to get employee name
 * 4. Parse JSON fields
 * 5. Return leave array
 * 
 * @param employeeId - UUID of employee
 * @param filters - Filter criteria (leaveType, year, status)
 * @param page - Page number (0-indexed)
 * @param pageLimit - Number of records per page
 * @returns Array of leave records
 */
export async function getPaginatedEmployeeLeavesByEmployeeId(
  employeeId: string,
  filters: EmployeeLeaveFilters = {},
  page: number = 0,
  pageLimit: number = 10
): Promise<EmployeeLeave[]> {
  const timer = new PerformanceTimer('getPaginatedEmployeeLeavesByEmployeeId');
  
  try {
    logger.debug('🔍 Fetching paginated employee leaves', {
      employeeId,
      filters,
      page,
      pageLimit,
      operation: 'getPaginatedEmployeeLeavesByEmployeeId'
    });

    // Build filter clauses
    const queryParams: any = { employeeId };
    const filterClauses: string[] = [];
    
    const selectedYear = filters.year ?? new Date().getFullYear().toString();
    const startDate = `${selectedYear}-01-01`;
    const endDate = `${selectedYear}-12-31`;
    
    filterClauses.push(
      `(employee_leaves.leaveStartDate BETWEEN '${startDate}' AND '${endDate}' 
       OR employee_leaves.leaveEndDate BETWEEN '${startDate}' AND '${endDate}')`
    );

    if (filters.leaveType) {
      filterClauses.push('employee_leaves.leaveType = :leaveType');
      queryParams.leaveType = filters.leaveType;
    }

    if (filters.leaveApprovalStatus) {
      filterClauses.push('employee_leaves.leaveApprovalStatus = :leaveApprovalStatus');
      queryParams.leaveApprovalStatus = filters.leaveApprovalStatus;
    }

    // Build pagination
    const offset = page * pageLimit;
    queryParams.pageLimit = pageLimit;
    queryParams.offset = offset;

    // Build and execute SQL with JOIN
    const whereClause = `WHERE employee_leaves.employeeId = :employeeId ${
      filterClauses.length > 0 ? `AND ${filterClauses.join(' AND ')}` : ''
    }`;

    const sql = `
      SELECT 
        employee_leaves.*,
        employees.name as employeeName
      FROM employee_leaves
      LEFT JOIN employees ON employee_leaves.employeeId = employees.uuid
      ${whereClause}
      ORDER BY employee_leaves.createdAt DESC
      LIMIT :pageLimit OFFSET :offset
    `;

    const result = await sequelize.query<EmployeeLeave>(sql, {
      replacements: queryParams,
      type: QueryTypes.SELECT,
      raw: true,
    });

    // Parse JSON fields
    const leaves = result.map(leave => ({
      ...leave,
      leaveApprovers: JSON.parse(leave.leaveApprovers as any),
    }));

    const duration = timer.end();
    logDatabase('GET_EMPLOYEE_LEAVES', employeeId, duration);

    logger.debug('✅ Employee leaves fetched', {
      employeeId,
      count: leaves.length,
      duration: `${duration}ms`
    });

    return leaves;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('GET_EMPLOYEE_LEAVES_ERROR', employeeId, duration, error);

    logger.error('❌ Failed to fetch employee leaves', {
      employeeId,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while fetching employee leaves: ${error.message}`);
  }
}

/**
 * Get Paginated Employee Leaves All
 * =================================
 * Fetches all employee leaves except logged-in user's own leaves
 * Used by HR and Super User roles
 * 
 * Process:
 * 1. Build filter clauses (excluding logged-in user)
 * 2. Build pagination
 * 3. Execute query with JOIN for employee name
 * 4. Parse JSON and return
 * 
 * @param employeeId - UUID of logged-in user (to exclude)
 * @param filters - Filter criteria
 * @param page - Page number (0-indexed)
 * @param pageLimit - Number of records per page
 * @returns Array of reportee leave records
 */
export async function getPaginatedEmployeeLeavesAll(
  employeeId: string,
  filters: EmployeeLeaveFilters = {},
  page: number = 0,
  pageLimit: number = 10
): Promise<ReporteeLeave[]> {
  const timer = new PerformanceTimer('getPaginatedEmployeeLeavesAll');
  
  try {
    logger.debug('🔍 Fetching all employee leaves (HR/Super User)', {
      excludeEmployeeId: employeeId,
      filters,
      page,
      pageLimit,
      operation: 'getPaginatedEmployeeLeavesAll'
    });

    // Build filter clauses
    const queryParams: any = { employeeId };
    const filterClauses: string[] = [];
    
    const selectedYear = filters.year ?? new Date().getFullYear().toString();
    const startDate = `${selectedYear}-01-01`;
    const endDate = `${selectedYear}-12-31`;
    
    filterClauses.push(
      `(employee_leaves.leaveStartDate BETWEEN '${startDate}' AND '${endDate}' 
       OR employee_leaves.leaveEndDate BETWEEN '${startDate}' AND '${endDate}')`
    );

    if (filters.leaveType) {
      filterClauses.push('employee_leaves.leaveType = :leaveType');
      queryParams.leaveType = filters.leaveType;
    }

    if (filters.leaveApprovalStatus) {
      filterClauses.push('employee_leaves.leaveApprovalStatus = :leaveApprovalStatus');
      queryParams.leaveApprovalStatus = filters.leaveApprovalStatus;
    }

    // Build pagination
    const offset = page * pageLimit;
    queryParams.pageLimit = pageLimit;
    queryParams.offset = offset;

    // Build and execute SQL (exclude logged-in user's leaves)
    const whereClause = `WHERE employee_leaves.employeeId != :employeeId ${
      filterClauses.length > 0 ? `AND ${filterClauses.join(' AND ')}` : ''
    }`;

    const sql = `
      SELECT 
        employee_leaves.*,
        employees.name as employeeName
      FROM employee_leaves
      LEFT JOIN employees ON employee_leaves.employeeId = employees.uuid
      ${whereClause}
      ORDER BY employee_leaves.createdAt DESC
      LIMIT :pageLimit OFFSET :offset
    `;

    const result = await sequelize.query<ReporteeLeave>(sql, {
      replacements: queryParams,
      type: QueryTypes.SELECT,
      raw: true,
    });

    // Parse JSON fields
    const leaves = result.map(leave => ({
      ...leave,
      leaveApprovers: JSON.parse(leave.leaveApprovers as any),
    }));

    const duration = timer.end();
    logDatabase('GET_ALL_EMPLOYEE_LEAVES', employeeId, duration);

    logger.debug('✅ All employee leaves fetched', {
      excludeEmployeeId: employeeId,
      count: leaves.length,
      duration: `${duration}ms`
    });

    return leaves;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('GET_ALL_EMPLOYEE_LEAVES_ERROR', employeeId, duration, error);

    logger.error('❌ Failed to fetch all employee leaves', {
      employeeId,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while fetching all employee leaves: ${error.message}`);
  }
}

/**
 * Get Paginated Employee Leaves By Approver ID
 * ============================================
 * Fetches leaves where the user is one of the approvers
 * Used by Manager and Director roles
 * 
 * Process:
 * 1. Build filter clauses
 * 2. Use JSON_CONTAINS to find leaves where user is approver
 * 3. Build pagination
 * 4. Execute query with JOIN
 * 5. Parse JSON and return
 * 
 * Logic from old vodichron:
 * - Uses json_contains(leaveApprovers->'$[*].approverId', json_array(:approverId))
 * 
 * @param approverId - UUID of approver
 * @param filters - Filter criteria
 * @param page - Page number (0-indexed)
 * @param pageLimit - Number of records per page
 * @returns Array of reportee leave records
 */
export async function getPaginatedEmployeeLeavesByApproverId(
  approverId: string,
  filters: EmployeeLeaveFilters = {},
  page: number = 0,
  pageLimit: number = 10
): Promise<ReporteeLeave[]> {
  const timer = new PerformanceTimer('getPaginatedEmployeeLeavesByApproverId');
  
  try {
    logger.debug('🔍 Fetching leaves by approver ID', {
      approverId,
      filters,
      page,
      pageLimit,
      operation: 'getPaginatedEmployeeLeavesByApproverId'
    });

    // Build filter clauses
    const queryParams: any = {};
    const filterClauses: string[] = [];
    
    const selectedYear = filters.year ?? new Date().getFullYear().toString();
    const startDate = `${selectedYear}-01-01`;
    const endDate = `${selectedYear}-12-31`;
    
    filterClauses.push(
      `(employee_leaves.leaveStartDate BETWEEN '${startDate}' AND '${endDate}' 
       OR employee_leaves.leaveEndDate BETWEEN '${startDate}' AND '${endDate}')`
    );

    if (filters.leaveType) {
      filterClauses.push('employee_leaves.leaveType = :leaveType');
      queryParams.leaveType = filters.leaveType;
    }

    if (filters.leaveApprovalStatus) {
      filterClauses.push('employee_leaves.leaveApprovalStatus = :leaveApprovalStatus');
      queryParams.leaveApprovalStatus = filters.leaveApprovalStatus;
    }

    // Build pagination
    const offset = page * pageLimit;
    queryParams.pageLimit = pageLimit;
    queryParams.offset = offset;

    // Build SQL with JSON_CONTAINS for approver check
    const whereClause = `WHERE json_contains(leaveApprovers->'$[*].approverId', json_array("${approverId}")) ${
      filterClauses.length > 0 ? `AND ${filterClauses.join(' AND ')}` : ''
    }`;

    const sql = `
      SELECT 
        employee_leaves.*,
        employees.name as employeeName
      FROM employee_leaves
      LEFT JOIN employees ON employee_leaves.employeeId = employees.uuid
      ${whereClause}
      ORDER BY employee_leaves.createdAt ASC
      LIMIT :pageLimit OFFSET :offset
    `;

    const result = await sequelize.query<ReporteeLeave>(sql, {
      replacements: queryParams,
      type: QueryTypes.SELECT,
      raw: true,
    });

    // Parse JSON fields
    const leaves = result.map(leave => ({
      ...leave,
      leaveApprovers: JSON.parse(leave.leaveApprovers as any),
    }));

    const duration = timer.end();
    logDatabase('GET_LEAVES_BY_APPROVER', approverId, duration);

    logger.debug('✅ Leaves by approver fetched', {
      approverId,
      count: leaves.length,
      duration: `${duration}ms`
    });

    return leaves;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('GET_LEAVES_BY_APPROVER_ERROR', approverId, duration, error);

    logger.error('❌ Failed to fetch leaves by approver', {
      approverId,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while fetching leaves by approver: ${error.message}`);
  }
}

/**
 * Get Employee Leaves By Status Group By Leave Type
 * =================================================
 * Aggregates applied leaves by leave type for a specific status
 * Used for calculating leave balance
 * 
 * Process:
 * 1. Filter by employee, year, and status
 * 2. GROUP BY leaveType and SUM(leaveDays)
 * 3. Return aggregated data
 * 
 * @param employeeId - UUID of employee
 * @param leaveApprovalStatus - Status to filter (typically APPROVED)
 * @param year - Year to filter (optional, defaults to current year)
 * @returns Array of applied leaves grouped by type
 */
export async function getEmployeeLeavesByStatusGroupByLeaveType(
  employeeId: string,
  leaveApprovalStatus: LeaveApprovalStatus,
  year?: string
): Promise<AppliedLeaves[]> {
  const timer = new PerformanceTimer('getEmployeeLeavesByStatusGroupByLeaveType');
  
  try {
    logger.debug('🔍 Fetching leaves grouped by type', {
      employeeId,
      leaveApprovalStatus,
      year,
      operation: 'getEmployeeLeavesByStatusGroupByLeaveType'
    });

    // Build date range for year
    const selectedYear = year ?? new Date().getFullYear().toString();
    const startDate = `${selectedYear}-01-01`;
    const endDate = `${selectedYear}-12-31`;

    // Execute GROUP BY query
    const sql = `
      SELECT 
        leaveType, 
        SUM(leaveDays) as leavesApplied
      FROM employee_leaves
      WHERE employeeId = :employeeId
        AND leaveApprovalStatus = :leaveApprovalStatus
        AND (leaveStartDate BETWEEN :startDate AND :endDate 
             OR leaveEndDate BETWEEN :startDate AND :endDate)
      GROUP BY leaveType
    `;

    const result = await sequelize.query<AppliedLeaves>(sql, {
      replacements: {
        employeeId,
        leaveApprovalStatus,
        startDate,
        endDate,
      },
      type: QueryTypes.SELECT,
      raw: true,
    });

    const duration = timer.end();
    logDatabase('GET_LEAVES_BY_STATUS_GROUPED', employeeId, duration);

    logger.debug('✅ Leaves grouped by type fetched', {
      employeeId,
      count: result.length,
      duration: `${duration}ms`
    });

    return result;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('GET_LEAVES_BY_STATUS_GROUPED_ERROR', employeeId, duration, error);

    logger.error('❌ Failed to fetch leaves grouped by type', {
      employeeId,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while fetching grouped leaves: ${error.message}`);
  }
}
