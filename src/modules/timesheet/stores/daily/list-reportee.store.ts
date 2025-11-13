/**
 * Daily Reportee Timesheet Store - List Operations
 * =================================================
 * Database operations for managers/HR to view reportee daily timesheets
 * 
 * Based on weekly reportee timesheet store pattern
 */

import { QueryTypes } from 'sequelize';
import moment from 'moment';
import { sequelize } from '../../../../database';
import { logger, logDatabase, PerformanceTimer } from '../../../../utils/logger';
import { DailyTimesheet, DailyTimesheetFilters } from '../../types/timesheet.types';

/**
 * Get Paginated Reportee Daily Timesheets
 * ----------------------------------------
 * Retrieves daily timesheets for employees reporting to the logged-in user
 * 
 * @param filters - Optional filters (month, year, approvalStatus, startDate, endDate)
 * @param loggedInUserId - UUID of the manager/director
 * @param page - Page number (0-indexed)
 * @param limit - Number of records per page
 * @returns Array of daily timesheet records for reportees
 */
export async function getPaginatedReporteeDailyTimesheet(
  filters: DailyTimesheetFilters,
  loggedInUserId: string,
  page?: number,
  limit?: number
): Promise<DailyTimesheet[]> {
  const timer = new PerformanceTimer('getPaginatedReporteeDailyTimesheet');
  
  try {
    logger.debug('📋 Fetching paginated reportee daily timesheets', {
      loggedInUserId,
      filters,
      page,
      limit,
      operation: 'getPaginatedReporteeDailyTimesheet'
    });

    const queryParams: any[] = [];
    const filterClauses: string[] = [];
    
    // ============================================================================
    // Build Date Range Filter
    // ============================================================================
    let startDate: string | undefined;
    let endDate: string | undefined;
    
    // Priority: Direct date filters > Month/Year filters
    if (filters.startDate && filters.endDate) {
      // Date range provided (from frontend Day/Range filters)
      startDate = filters.startDate;
      endDate = filters.endDate;
    } else if (filters.startDate) {
      // Only start date (single day filter)
      startDate = filters.startDate;
      endDate = filters.startDate;
    } else if (filters.month && filters.year) {
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
      filterClauses.push(`(employee_timesheets.timesheetDate BETWEEN '${startDate}' AND '${endDate}')`);
    }
    
    // ============================================================================
    // Build Approval Status Filter
    // ============================================================================
    if (filters.approvalStatus) {
      filterClauses.push('employee_timesheets.approvalStatus = ?');
      queryParams.push(filters.approvalStatus);
    }
    
    // ============================================================================
    // Build Pagination
    // ============================================================================
    if (page !== undefined && limit) {
      const offset = page * limit;
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
        employee_timesheets.*,
        CONCAT(approver.name, " <", approver.officialEmailId, ">") as approverDetail,
        employee_detail.name as employeeName,
        employee_detail.employeeId as employeeIdReadable,
        employee_detail.officialEmailId as employeeEmail
      FROM employee_timesheets
        LEFT JOIN employees as approver ON employee_timesheets.approverId = approver.uuid
        LEFT JOIN employees as employee_detail ON employee_timesheets.employeeId = employee_detail.employeeId
        LEFT JOIN employees AS manager ON employee_detail.reportingManagerId = manager.uuid
        LEFT JOIN employees AS director ON employee_detail.reportingDirectorId = director.uuid      
      ${whereClause}
      ORDER BY employee_timesheets.createdAt DESC
      ${page !== undefined && limit ? 'LIMIT ? OFFSET ?' : ''}
    `;
    
    const result = await sequelize.query<DailyTimesheet>(sql, {
      replacements: [loggedInUserId, loggedInUserId, ...queryParams],
      type: QueryTypes.SELECT,
      raw: true,
    });

    const duration = timer.end();
    logDatabase('GET_REPORTEE_DAILY_TIMESHEETS', loggedInUserId, duration);

    logger.debug('✅ Reportee daily timesheets fetched successfully', {
      loggedInUserId,
      count: result.length,
      duration: `${duration}ms`
    });

    return result;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('GET_REPORTEE_DAILY_TIMESHEETS_ERROR', loggedInUserId, duration, error);
    
    logger.error('❌ Failed to fetch reportee daily timesheets', {
      loggedInUserId,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while fetching timesheets: ${error.message}`);
  }
}

/**
 * Get Paginated All Daily Timesheets (Except Self)
 * -------------------------------------------------
 * Retrieves all daily timesheets except those belonging to the logged-in user
 * Used by Super User and HR roles
 * 
 * @param filters - Optional filters (month, year, approvalStatus, startDate, endDate)
 * @param employeeId - UUID of the logged-in user (to exclude)
 * @param page - Page number (0-indexed)
 * @param limit - Number of records per page
 * @returns Array of daily timesheet records
 */
export async function getPaginatedAllDailyTimesheet(
  filters: DailyTimesheetFilters,
  employeeId: string,
  page?: number,
  limit?: number
): Promise<DailyTimesheet[]> {
  const timer = new PerformanceTimer('getPaginatedAllDailyTimesheet');
  
  try {
    logger.debug('📋 Fetching all daily timesheets (except self)', {
      employeeId,
      filters,
      page,
      limit,
      operation: 'getPaginatedAllDailyTimesheet'
    });

    const queryParams: any[] = [];
    const filterClauses: string[] = [];
    
    // ============================================================================
    // Build Date Range Filter
    // ============================================================================
    let startDate: string | undefined;
    let endDate: string | undefined;
    
    // Priority: Direct date filters > Month/Year filters
    if (filters.startDate && filters.endDate) {
      startDate = filters.startDate;
      endDate = filters.endDate;
    } else if (filters.startDate) {
      startDate = filters.startDate;
      endDate = filters.startDate;
    } else if (filters.month && filters.year) {
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
      filterClauses.push(`(employee_timesheets.timesheetDate BETWEEN '${startDate}' AND '${endDate}')`);
    }
    
    // ============================================================================
    // Build Approval Status Filter
    // ============================================================================
    if (filters.approvalStatus) {
      filterClauses.push('employee_timesheets.approvalStatus = ?');
      queryParams.push(filters.approvalStatus);
    }
    
    // ============================================================================
    // Build Pagination
    // ============================================================================
    if (page !== undefined && limit) {
      const offset = page * limit;
      queryParams.push(limit, offset);
    }
    
    // ============================================================================
    // Build WHERE Clause (Exclude Self)
    // ============================================================================
    const whereClause = `WHERE employee_timesheets.employeeId != ? ${
      filterClauses.length > 0 ? `AND ${filterClauses.join(' AND ')}` : ''
    }`;
    
    // ============================================================================
    // Execute Query
    // ============================================================================
    const sql = `
      SELECT 
        employee_timesheets.*,
        CONCAT(approver.name, " <", approver.officialEmailId, ">") as approverDetail,
        employee_detail.name as employeeName,
        employee_detail.employeeId as employeeIdReadable,
        employee_detail.officialEmailId as employeeEmail
      FROM employee_timesheets 
        LEFT JOIN employees as approver ON employee_timesheets.approverId = approver.uuid
        LEFT JOIN employees as employee_detail ON employee_timesheets.employeeId = employee_detail.employeeId
      ${whereClause}
      ORDER BY employee_timesheets.createdAt DESC
      ${page !== undefined && limit ? 'LIMIT ? OFFSET ?' : ''}
    `;
    
    const result = await sequelize.query<DailyTimesheet>(sql, {
      replacements: [employeeId, ...queryParams],
      type: QueryTypes.SELECT,
      raw: true,
    });

    const duration = timer.end();
    logDatabase('GET_ALL_DAILY_TIMESHEETS', employeeId, duration);

    logger.debug('✅ All daily timesheets fetched successfully', {
      excludedEmployeeId: employeeId,
      count: result.length,
      duration: `${duration}ms`
    });

    return result;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('GET_ALL_DAILY_TIMESHEETS_ERROR', employeeId, duration, error);
    
    logger.error('❌ Failed to fetch all daily timesheets', {
      employeeId,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while fetching timesheets: ${error.message}`);
  }
}
