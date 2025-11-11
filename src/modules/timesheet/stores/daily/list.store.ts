/**
 * Daily Timesheet Store - List Operations
 * ========================================
 * Database operations for retrieving daily timesheets with pagination and filtering
 * 
 * Based on old vodichron employeeTimesheet.ts store
 */

import { QueryTypes } from 'sequelize';
import moment from 'moment';
import { sequelize } from '../../../../database';
import { logger, logDatabase, PerformanceTimer } from '../../../../utils/logger';
import { DailyTimesheet, DailyTimesheetFilters } from '../../types/timesheet.types';

/**
 * Get Paginated Daily Timesheets by Employee ID
 * ----------------------------------------------
 * Retrieves daily timesheets for a specific employee with optional filtering and pagination
 * 
 * @param filters - Optional filters (month, year, approvalStatus)
 * @param employeeId - UUID of the employee
 * @param page - Page number (0-indexed)
 * @param limit - Number of records per page
 * @returns Array of daily timesheet records with joined employee and approver details
 */
export async function getPaginatedDailyTimesheetsByEmployeeId(
  filters: DailyTimesheetFilters,
  employeeId: string,
  page?: number,
  limit?: number
): Promise<DailyTimesheet[]> {
  const timer = new PerformanceTimer('getPaginatedDailyTimesheetsByEmployeeId');
  
  try {
    logger.debug('📋 Fetching paginated daily timesheets', {
      employeeId,
      filters,
      page,
      limit,
      operation: 'getPaginatedDailyTimesheetsByEmployeeId'
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
    // Build WHERE Clause
    // ============================================================================
    const whereClause = `WHERE employee_timesheets.employeeId = ? ${
      filterClauses.length > 0 ? `AND ${filterClauses.join(' AND ')}` : ''
    }`;
    
    // ============================================================================
    // Execute Query
    // ============================================================================
    const sql = `
      SELECT 
        employee_timesheets.*,
        CONCAT(approver.name, " <", approver.officialEmailId, ">") as approverDetail,
        employee_detail.name as employeeName
      FROM employee_timesheets 
        LEFT JOIN employees as approver ON employee_timesheets.approverId = approver.uuid
        LEFT JOIN employees as employee_detail ON employee_timesheets.employeeId = employee_detail.uuid
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
    logDatabase('GET_DAILY_TIMESHEETS_LIST', employeeId, duration);

    logger.debug('✅ Daily timesheets fetched successfully', {
      employeeId,
      count: result.length,
      duration: `${duration}ms`
    });

    return result;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('GET_DAILY_TIMESHEETS_LIST_ERROR', employeeId, duration, error);
    
    logger.error('❌ Failed to fetch daily timesheets', {
      employeeId,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while fetching timesheets: ${error.message}`);
  }
}
