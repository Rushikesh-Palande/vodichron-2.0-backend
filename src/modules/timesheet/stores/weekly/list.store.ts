/**
 * Weekly Timesheet Store - List Operations
 * ==========================================
 * Database operations for retrieving weekly timesheets with pagination and filtering
 * 
 * Based on old vodichron employeeWeeklyTimesheet.ts store
 * Updated with new Sequelize pattern and comprehensive logging
 */

import { QueryTypes } from 'sequelize';
import moment from 'moment';
import { sequelize } from '../../../../database';
import { logger, logDatabase, PerformanceTimer } from '../../../../utils/logger';
import { WeeklyTimesheet, WeeklyTimesheetFilters } from '../../types/timesheet.types';

/**
 * Get Paginated Weekly Timesheets by Employee ID
 * -----------------------------------------------
 * Retrieves weekly timesheets for a specific employee with optional filtering and pagination
 * 
 * @param filters - Optional filters (month, year, approvalStatus)
 * @param employeeId - UUID of the employee
 * @param page - Page number (1-indexed for offset calculation)
 * @param limit - Number of records per page
 * @returns Array of weekly timesheet records with joined employee and approver details
 */
export async function getPaginatedEmployeeWeeklyTimesheetByEmployeeId(
  filters: WeeklyTimesheetFilters,
  employeeId: string,
  page?: number,
  limit?: number
): Promise<WeeklyTimesheet[]> {
  const timer = new PerformanceTimer('getPaginatedEmployeeWeeklyTimesheetByEmployeeId');
  
  try {
    logger.debug('📋 Fetching paginated weekly timesheets', {
      employeeId,
      filters,
      page,
      limit,
      operation: 'getPaginatedEmployeeWeeklyTimesheetByEmployeeId'
    });

    const queryParams: any[] = [];
    const filterClauses: string[] = [];
    
    // ============================================================================
    // Build Date Range Filter
    // ============================================================================
    let startDate: string | undefined;
    let endDate: string | undefined;
    
    if (filters.month && filters.year) {
      // Both month and year provided
      startDate = `${filters.year}-${filters.month.padStart(2, '0')}-01`;
      endDate = moment(startDate).endOf('month').format('YYYY-MM-DD');
    } else if (filters.month) {
      // Only month provided (use current year)
      startDate = `${moment().format('YYYY')}-${filters.month.padStart(2, '0')}-01`;
      endDate = moment(startDate).endOf('month').format('YYYY-MM-DD');
    } else if (filters.year) {
      // Only year provided
      startDate = `${filters.year}-01-01`;
      endDate = `${filters.year}-12-31`;
    }
    
    if (startDate && endDate) {
      filterClauses.push(`(employee_weekly_timesheets.weekStartDate BETWEEN '${startDate}' AND '${endDate}')`);
    }
    
    // ============================================================================
    // Build Approval Status Filter
    // ============================================================================
    if (filters && filters.approvalStatus) {
      filterClauses.push('employee_weekly_timesheets.approvalStatus = ?');
      queryParams.push(filters.approvalStatus);
    }
    
    // ============================================================================
    // Build Pagination
    // ============================================================================
    if (page && limit) {
      const offset = (page - 1) * limit;
      queryParams.push(limit, offset);
    }
    
    // ============================================================================
    // Build WHERE Clause
    // ============================================================================
    const whereClause = `WHERE employee_weekly_timesheets.employeeId = ? ${
      filterClauses.length > 0 ? `AND ${filterClauses.join(' AND ')}` : ''
    }`;
    
    // ============================================================================
    // Execute Query
    // ============================================================================
    const sql = `
      SELECT 
        employee_weekly_timesheets.*,
        CASE 
          WHEN employee_weekly_timesheets.approverRole = 'customer' THEN 'Customer'
          ELSE CONCAT(approver.name, " <", approver.officialEmailId, ">")
        END AS approverDetail,
        employee_detail.name as employeeName
      FROM employee_weekly_timesheets 
        LEFT JOIN employees as approver ON employee_weekly_timesheets.approverId = approver.uuid
        LEFT JOIN employees as employee_detail ON employee_weekly_timesheets.employeeId = employee_detail.uuid
      ${whereClause}
      ORDER BY employee_weekly_timesheets.createdAt ASC
      ${queryParams.length > 0 ? 'LIMIT ? OFFSET ?' : ''}
    `;
    
    const result = await sequelize.query<WeeklyTimesheet>(sql, {
      replacements: [employeeId, ...queryParams],
      type: QueryTypes.SELECT,
      raw: true,
    });

    const duration = timer.end();
    logDatabase('GET_WEEKLY_TIMESHEETS_LIST', employeeId, duration);

    logger.debug('✅ Weekly timesheets fetched successfully', {
      employeeId,
      count: result.length,
      duration: `${duration}ms`
    });

    return result;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('GET_WEEKLY_TIMESHEETS_LIST_ERROR', employeeId, duration, error);
    
    logger.error('❌ Failed to fetch weekly timesheets', {
      employeeId,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while fetching timesheets: ${error.message}`);
  }
}

/**
 * Get Weekly Timesheet Details by ID
 * -----------------------------------
 * Retrieves a single weekly timesheet record by UUID
 * 
 * @param timesheetId - UUID of the timesheet
 * @returns Weekly timesheet record or false if not found
 */
export async function getWeeklyTimesheetDetailsById(
  timesheetId: string
): Promise<WeeklyTimesheet | false> {
  const timer = new PerformanceTimer('getWeeklyTimesheetDetailsById');
  
  try {
    logger.debug('🔍 Fetching weekly timesheet by ID', {
      timesheetId,
      operation: 'getWeeklyTimesheetDetailsById'
    });

    const sql = `
      SELECT
        employee_weekly_timesheets.*,
        DATE_FORMAT(employee_weekly_timesheets.weekStartDate,'%Y-%m-%d') as weekStartDate,
        DATE_FORMAT(employee_weekly_timesheets.weekEndDate,'%Y-%m-%d') as weekEndDate
      FROM employee_weekly_timesheets 
      WHERE uuid = ?
    `;
    
    const result = await sequelize.query<WeeklyTimesheet>(sql, {
      replacements: [timesheetId],
      type: QueryTypes.SELECT,
      raw: true,
    });

    const duration = timer.end();
    logDatabase('GET_WEEKLY_TIMESHEET_BY_ID', timesheetId, duration);

    if (result.length > 0) {
      logger.debug('✅ Weekly timesheet found', {
        timesheetId,
        duration: `${duration}ms`
      });
      return result[0];
    }

    logger.debug('❌ Weekly timesheet not found', {
      timesheetId,
      duration: `${duration}ms`
    });

    return false;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('GET_WEEKLY_TIMESHEET_BY_ID_ERROR', timesheetId, duration, error);
    
    logger.error('❌ Failed to fetch weekly timesheet', {
      timesheetId,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while fetching timesheet: ${error.message}`);
  }
}

/**
 * Get Paginated Reportee Weekly Timesheets
 * -----------------------------------------
 * Retrieves weekly timesheets for employees reporting to the logged-in user
 * Only returns timesheets that are not in SAVED status
 * 
 * @param filters - Optional filters (month, year, approvalStatus)
 * @param loggedInUserId - UUID of the manager/director
 * @param page - Page number (1-indexed for offset calculation)
 * @param limit - Number of records per page
 * @returns Array of weekly timesheet records for reportees
 */
export async function getPaginatedReporteeWeeklyTimesheet(
  filters: WeeklyTimesheetFilters,
  loggedInUserId: string,
  page?: number,
  limit?: number
): Promise<WeeklyTimesheet[]> {
  const timer = new PerformanceTimer('getPaginatedReporteeWeeklyTimesheet');
  
  try {
    logger.debug('📋 Fetching paginated reportee weekly timesheets', {
      loggedInUserId,
      filters,
      page,
      limit,
      operation: 'getPaginatedReporteeWeeklyTimesheet'
    });

    const queryParams: any[] = [];
    const filterClauses: string[] = [];
    
    // Exclude SAVED status timesheets
    filterClauses.push(`employee_weekly_timesheets.timeSheetStatus != ?`);
    queryParams.push('SAVED');
    
    // ============================================================================
    // Build Date Range Filter
    // ============================================================================
    let startDate: string | undefined;
    let endDate: string | undefined;
    
    if (filters.month && filters.year) {
      startDate = `${filters.year}-${filters.month.padStart(2, '0')}-01`;
      endDate = moment(startDate).endOf('month').format('YYYY-MM-DD');
    } else if (filters.month) {
      startDate = `${moment().format('YYYY')}-${filters.month.padStart(2, '0')}-01`;
      endDate = moment(startDate).endOf('month').format('YYYY-MM-DD');
    } else if (filters.year) {
      startDate = `${filters.year}-01-01`;
      endDate = `${filters.year}-12-31`;
    }
    
    if (startDate && endDate) {
      filterClauses.push(`(employee_weekly_timesheets.weekStartDate BETWEEN '${startDate}' AND '${endDate}')`);
    }
    
    // ============================================================================
    // Build Approval Status Filter
    // ============================================================================
    if (filters && filters.approvalStatus) {
      filterClauses.push('employee_weekly_timesheets.approvalStatus = ?');
      queryParams.push(filters.approvalStatus);
    }
    
    // ============================================================================
    // Build Pagination
    // ============================================================================
    if (page && limit) {
      const offset = (page - 1) * limit;
      queryParams.push(limit, offset);
    }
    
    // ============================================================================
    // Build WHERE Clause (Manager or Director)
    // ============================================================================
    const whereClause = `WHERE (director.uuid = ? OR manager.uuid = ?) ${
      filterClauses.length > 0 ? `AND ${filterClauses.join(' AND ')}` : ''
    }`;
    
    // ============================================================================
    // Execute Query
    // ============================================================================
    const sql = `
      SELECT 
        employee_weekly_timesheets.*,
        CASE 
          WHEN employee_weekly_timesheets.approverRole = 'customer' THEN 'Customer'
          ELSE CONCAT(approver.name, " <", approver.officialEmailId, ">")
        END AS approverDetail,
        employee_detail.name as employeeName
      FROM employee_weekly_timesheets 
        LEFT JOIN employees as approver ON employee_weekly_timesheets.approverId = approver.uuid
        LEFT JOIN employees as employee_detail ON employee_weekly_timesheets.employeeId = employee_detail.uuid
        LEFT JOIN employees AS manager ON employee_detail.reportingManagerId = manager.uuid
        LEFT JOIN employees AS director ON employee_detail.reportingDirectorId = director.uuid      
      ${whereClause}
      ORDER BY employee_weekly_timesheets.createdAt ASC
      ${queryParams.length > 0 ? 'LIMIT ? OFFSET ?' : ''}
    `;
    
    const result = await sequelize.query<WeeklyTimesheet>(sql, {
      replacements: [loggedInUserId, loggedInUserId, ...queryParams],
      type: QueryTypes.SELECT,
      raw: true,
    });

    const duration = timer.end();
    logDatabase('GET_REPORTEE_WEEKLY_TIMESHEETS', loggedInUserId, duration);

    logger.debug('✅ Reportee weekly timesheets fetched successfully', {
      loggedInUserId,
      count: result.length,
      duration: `${duration}ms`
    });

    return result;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('GET_REPORTEE_WEEKLY_TIMESHEETS_ERROR', loggedInUserId, duration, error);
    
    logger.error('❌ Failed to fetch reportee weekly timesheets', {
      loggedInUserId,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while fetching timesheets: ${error.message}`);
  }
}

/**
 * Get Paginated All Weekly Timesheets (Except Self)
 * --------------------------------------------------
 * Retrieves all weekly timesheets except those belonging to the logged-in user
 * Only returns timesheets that are not in SAVED status
 * Used by Super User and HR roles
 * 
 * @param filters - Optional filters (month, year, approvalStatus)
 * @param employeeId - UUID of the logged-in user (to exclude)
 * @param page - Page number (1-indexed for offset calculation)
 * @param limit - Number of records per page
 * @returns Array of weekly timesheet records
 */
export async function getPaginatedAllWeeklyTimesheet(
  filters: WeeklyTimesheetFilters,
  employeeId: string,
  page?: number,
  limit?: number
): Promise<WeeklyTimesheet[]> {
  const timer = new PerformanceTimer('getPaginatedAllWeeklyTimesheet');
  
  try {
    logger.debug('📋 Fetching all weekly timesheets (except self)', {
      employeeId,
      filters,
      page,
      limit,
      operation: 'getPaginatedAllWeeklyTimesheet'
    });

    const queryParams: any[] = [];
    const filterClauses: string[] = [];
    
    // Exclude SAVED status timesheets
    filterClauses.push(`employee_weekly_timesheets.timeSheetStatus != ?`);
    queryParams.push('SAVED');
    
    // ============================================================================
    // Build Date Range Filter
    // ============================================================================
    let startDate: string | undefined;
    let endDate: string | undefined;
    
    if (filters.month && filters.year) {
      startDate = `${filters.year}-${filters.month.padStart(2, '0')}-01`;
      endDate = moment(startDate).endOf('month').format('YYYY-MM-DD');
    } else if (filters.month) {
      startDate = `${moment().format('YYYY')}-${filters.month.padStart(2, '0')}-01`;
      endDate = moment(startDate).endOf('month').format('YYYY-MM-DD');
    } else if (filters.year) {
      startDate = `${filters.year}-01-01`;
      endDate = `${filters.year}-12-31`;
    }
    
    if (startDate && endDate) {
      filterClauses.push(`(employee_weekly_timesheets.weekStartDate BETWEEN '${startDate}' AND '${endDate}')`);
    }
    
    // ============================================================================
    // Build Approval Status Filter
    // ============================================================================
    if (filters && filters.approvalStatus) {
      filterClauses.push('employee_weekly_timesheets.approvalStatus = ?');
      queryParams.push(filters.approvalStatus);
    }
    
    // ============================================================================
    // Build Pagination
    // ============================================================================
    if (page && limit) {
      const offset = (page - 1) * limit;
      queryParams.push(limit, offset);
    }
    
    // ============================================================================
    // Build WHERE Clause (Exclude Self)
    // ============================================================================
    const whereClause = `WHERE employee_weekly_timesheets.employeeId != ? ${
      filterClauses.length > 0 ? `AND ${filterClauses.join(' AND ')}` : ''
    }`;
    
    // ============================================================================
    // Execute Query
    // ============================================================================
    const sql = `
      SELECT 
        employee_weekly_timesheets.*,
        CASE 
          WHEN employee_weekly_timesheets.approverRole = 'customer' THEN 'Customer'
          ELSE CONCAT(approver.name, " <", approver.officialEmailId, ">")
        END AS approverDetail,
        employee_detail.name as employeeName
      FROM employee_weekly_timesheets 
        LEFT JOIN employees as approver ON employee_weekly_timesheets.approverId = approver.uuid
        LEFT JOIN employees as employee_detail ON employee_weekly_timesheets.employeeId = employee_detail.uuid
      ${whereClause}
      ORDER BY employee_weekly_timesheets.createdAt ASC
      ${queryParams.length > 0 ? 'LIMIT ? OFFSET ?' : ''}
    `;
    
    const result = await sequelize.query<WeeklyTimesheet>(sql, {
      replacements: [employeeId, ...queryParams],
      type: QueryTypes.SELECT,
      raw: true,
    });

    const duration = timer.end();
    logDatabase('GET_ALL_WEEKLY_TIMESHEETS', employeeId, duration);

    logger.debug('✅ All weekly timesheets fetched successfully', {
      excludedEmployeeId: employeeId,
      count: result.length,
      duration: `${duration}ms`
    });

    return result;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('GET_ALL_WEEKLY_TIMESHEETS_ERROR', employeeId, duration, error);
    
    logger.error('❌ Failed to fetch all weekly timesheets', {
      employeeId,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while fetching timesheets: ${error.message}`);
  }
}

/**
 * Get Paginated Timesheets by Customer Approver ID
 * -------------------------------------------------
 * Retrieves weekly timesheets for employees allocated to projects for a specific customer
 * Only returns timesheets for active project allocations where customer is an approver
 * 
 * @param filters - Optional filters (month, year, approvalStatus)
 * @param customerId - UUID of the customer
 * @param page - Page number (1-indexed for offset calculation)
 * @param limit - Number of records per page
 * @returns Array of weekly timesheet records
 */
export async function getPaginatedEmployeeTimesheetByCustomerApproverId(
  filters: WeeklyTimesheetFilters,
  customerId: string,
  page?: number,
  limit?: number
): Promise<WeeklyTimesheet[]> {
  const timer = new PerformanceTimer('getPaginatedEmployeeTimesheetByCustomerApproverId');
  
  try {
    logger.debug('📋 Fetching timesheets for customer approver', {
      customerId,
      filters,
      page,
      limit,
      operation: 'getPaginatedEmployeeTimesheetByCustomerApproverId'
    });

    const queryParams: any[] = [];
    const filterClauses: string[] = [];
    
    // Exclude SAVED status timesheets
    filterClauses.push(`employee_weekly_timesheets.timeSheetStatus != ?`);
    queryParams.push('SAVED');
    
    // ============================================================================
    // Build Date Range Filter
    // ============================================================================
    let startDate: string | undefined;
    let endDate: string | undefined;
    
    if (filters.month && filters.year) {
      startDate = `${filters.year}-${filters.month.padStart(2, '0')}-01`;
      endDate = moment(startDate).endOf('month').format('YYYY-MM-DD');
    } else if (filters.month) {
      startDate = `${moment().format('YYYY')}-${filters.month.padStart(2, '0')}-01`;
      endDate = moment(startDate).endOf('month').format('YYYY-MM-DD');
    } else if (filters.year) {
      startDate = `${filters.year}-01-01`;
      endDate = `${filters.year}-12-31`;
    }
    
    if (startDate && endDate) {
      filterClauses.push(`(employee_weekly_timesheets.weekStartDate BETWEEN '${startDate}' AND '${endDate}')`);
    }
    
    // ============================================================================
    // Build Approval Status Filter
    // ============================================================================
    if (filters && filters.approvalStatus) {
      filterClauses.push('employee_weekly_timesheets.approvalStatus = ?');
      queryParams.push(filters.approvalStatus);
    }
    
    // ============================================================================
    // Build Pagination
    // ============================================================================
    if (page && limit) {
      const offset = (page - 1) * limit;
      queryParams.push(limit, offset);
    }
    
    // ============================================================================
    // Build WHERE Clause (Customer Filter)
    // ============================================================================
    const whereClause = `WHERE (project_resource_allocation.customerId = ? 
      AND project_resource_allocation.customerApprover = 1  
      AND project_resource_allocation.status = 'ACTIVE') ${
        filterClauses.length > 0 ? `AND ${filterClauses.join(' AND ')}` : ''
      }`;
    
    // ============================================================================
    // Execute Query
    // ============================================================================
    const sql = `
      SELECT 
        employee_weekly_timesheets.*,
        CASE 
          WHEN employee_weekly_timesheets.approverRole = 'customer' THEN 'Customer'
          ELSE CONCAT(approver.name, " <", approver.officialEmailId, ">")
        END AS approverDetail,
        employee_detail.name as employeeName
      FROM employee_weekly_timesheets 
        LEFT JOIN employees as approver ON employee_weekly_timesheets.approverId = approver.uuid
        LEFT JOIN employees as employee_detail ON employee_weekly_timesheets.employeeId = employee_detail.uuid
        LEFT JOIN project_resource_allocation ON employee_weekly_timesheets.employeeId = project_resource_allocation.employeeId
      ${whereClause}
      ORDER BY employee_weekly_timesheets.createdAt ASC
      ${queryParams.length > 0 ? 'LIMIT ? OFFSET ?' : ''}
    `;
    
    const result = await sequelize.query<WeeklyTimesheet>(sql, {
      replacements: [customerId, ...queryParams],
      type: QueryTypes.SELECT,
      raw: true,
    });

    const duration = timer.end();
    logDatabase('GET_CUSTOMER_TIMESHEETS', customerId, duration);

    logger.debug('✅ Customer timesheets fetched successfully', {
      customerId,
      count: result.length,
      duration: `${duration}ms`
    });

    return result;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('GET_CUSTOMER_TIMESHEETS_ERROR', customerId, duration, error);
    
    logger.error('❌ Failed to fetch customer timesheets', {
      customerId,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while fetching timesheets: ${error.message}`);
  }
}
