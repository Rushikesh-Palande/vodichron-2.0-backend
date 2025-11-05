/**
 * Get Reportee Employee Documents Store
 * ======================================
 * 
 * Database operations for retrieving employee documents for HR approval.
 * Based on: old vodichron getPaginatedEmployeeDocumentsAll (employeeStore.ts lines 415-456)
 * 
 * Query Details:
 * - Returns paginated employee documents
 * - Excludes logged-in user's own documents
 * - Includes employee name and HR approver details
 * - Supports filtering by hrApprovalStatus
 * - Orders by approval status ASC, then createdAt ASC
 */

import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../../database';
import { logger, logDatabase, PerformanceTimer } from '../../../../utils/logger';
import { EmployeeDocumentWithDetails, Filters } from '../../schemas/documents/get-reportee-documents.schemas';

/**
 * Get Paginated Employee Documents (All except logged-in user)
 * ============================================================
 * 
 * Retrieves employee documents for HR approval workflow.
 * 
 * EXACT SQL from old code (lines 440-449):
 * ```sql
 * SELECT 
 *     employee_docs.*,
 *     CONCAT(hr.name," <",hr.officialEmailId,">") as hrDetail,
 *     employee_detail.name as employeeName
 * FROM employee_docs 
 *     LEFT JOIN employees as hr ON employee_docs.hrApproverId = hr.uuid
 *     LEFT JOIN employees as employee_detail ON employee_docs.employeeId = employee_detail.uuid
 * WHERE employee_docs.employeeId != ? 
 *   [AND employee_docs.hrApprovalStatus = ?]
 * ORDER BY employee_docs.hrApprovalStatus ASC, employee_docs.createdAt ASC 
 * LIMIT ? OFFSET ?
 * ```
 * 
 * Key Features (lines 413-455):
 * - Comment: "Get all documents for approval, except self documents for logged in user"
 * - Comment: "For Super user and HR role"
 * - Excludes logged-in user's documents (line 436)
 * - Optional filter by hrApprovalStatus (lines 426-429)
 * - Pagination support (lines 431-434)
 * 
 * @param filters - Optional hrApprovalStatus filter
 * @param loggedInUserId - UUID of logged-in user (to exclude their documents)
 * @param page - Page number (0-indexed in old code)
 * @param pageLimit - Number of items per page
 * @returns Array of employee documents with details
 */
export async function getPaginatedEmployeeDocumentsAll(
  filters: Filters | undefined,
  loggedInUserId: string,
  page: number = 0,
  pageLimit: number = 20
): Promise<EmployeeDocumentWithDetails[]> {
  // ============================================================================
  // STEP 1: Initialize Performance Timer
  // ============================================================================
  const timer = new PerformanceTimer('getPaginatedEmployeeDocumentsAll');

  try {
    logger.debug('📄 Fetching reportee employee documents', {
      loggedInUserId,
      page,
      pageLimit,
      filters,
      operation: 'getPaginatedEmployeeDocumentsAll'
    });

    // ==========================================================================
    // STEP 2: Build Query Parameters and Filter Clauses
    // ==========================================================================
    // Matches old code lines 423-434
    const queryParams: any[] = [loggedInUserId]; // First param: exclude logged-in user
    const filterClauses: string[] = [];

    // Optional filter by hrApprovalStatus (lines 426-429)
    if (filters && filters.hrApprovalStatus) {
      filterClauses.push(`employee_docs.hrApprovalStatus = :hrApprovalStatus`);
    }

    // Pagination (lines 431-434)
    const offset = page * pageLimit; // Old code: (page - 1) * limit, but uses page=0 default

    // ==========================================================================
    // STEP 3: Build WHERE Clause
    // ==========================================================================
    // Line 436-438: WHERE employee_docs.employeeId != ? [AND filters]
    const whereClause = `WHERE employee_docs.employeeId != :loggedInUserId ${
      filterClauses.length > 0 ? `AND ${filterClauses.join(' AND ')}` : ''
    }`;

    // ==========================================================================
    // STEP 4: Build Complete SQL Query
    // ==========================================================================
    // EXACT match to old code lines 440-449
    const selectSql = `
      SELECT 
        employee_docs.*,
        CONCAT(hr.name, " <", hr.officialEmailId, ">") as hrDetail,
        employee_detail.name as employeeName
      FROM employee_docs 
        LEFT JOIN employees as hr ON employee_docs.hrApproverId = hr.uuid
        LEFT JOIN employees as employee_detail ON employee_docs.employeeId = employee_detail.uuid
      ${whereClause}
      ORDER BY employee_docs.hrApprovalStatus ASC, employee_docs.createdAt ASC
      LIMIT :pageLimit OFFSET :offset
    `;

    logger.debug('📝 SQL Query built for reportee documents', {
      loggedInUserId,
      hasFilters: !!filters,
      page,
      pageLimit,
      offset
    });

    // ==========================================================================
    // STEP 5: Execute Database Query
    // ==========================================================================
    const replacements: any = {
      loggedInUserId,
      pageLimit,
      offset,
    };

    // Add filter params if present
    if (filters && filters.hrApprovalStatus) {
      replacements.hrApprovalStatus = filters.hrApprovalStatus;
    }

    const documents = await sequelize.query<EmployeeDocumentWithDetails>(selectSql, {
      replacements,
      type: QueryTypes.SELECT,
      raw: true,
    });

    // ==========================================================================
    // STEP 6: Log Performance and Return
    // ==========================================================================
    const duration = timer.end();
    logDatabase('GET_REPORTEE_DOCUMENTS', loggedInUserId, duration);

    logger.info('✅ Reportee documents retrieved successfully', {
      loggedInUserId,
      documentCount: documents.length,
      page,
      pageLimit,
      duration: `${duration}ms`
    });

    return documents;

  } catch (error: any) {
    // ==========================================================================
    // STEP 7: Error Handling
    // ==========================================================================
    const duration = timer.end();
    logDatabase('GET_REPORTEE_DOCUMENTS_ERROR', loggedInUserId, duration, error);

    logger.error('❌ Failed to fetch reportee documents', {
      loggedInUserId,
      page,
      pageLimit,
      error: error.message,
      code: error.code,
      duration: `${duration}ms`,
      stack: error.stack
    });

    // Re-throw error to be handled by service layer
    throw new Error(`Database error while fetching reportee documents: ${error.message}`);
  }
}
