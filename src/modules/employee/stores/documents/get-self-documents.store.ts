/**
 * Get Self Documents Store
 * ========================
 * 
 * Database operations for retrieving employee's own documents.
 * Based on: old vodichron getEmployeeDocumentsByEmployeeId (employeeDocuments.ts lines 42-56)
 * 
 * SQL Query:
 * - Returns all documents for a specific employee
 * - Includes HR approval details (LEFT JOIN with employees table)
 * - Shows formatted HR detail: "Name <email>"
 */

import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../../database';
import { logger, logDatabase, PerformanceTimer } from '../../../../utils/logger';
import { EmployeeDocumentResult } from '../../schemas/documents/get-self-documents.schemas';

/**
 * Get Employee Documents By Employee ID
 * =====================================
 * 
 * Retrieves all documents uploaded by an employee.
 * 
 * EXACT SQL from old code (lines 44-50):
 * ```sql
 * SELECT 
 *   employee_docs.*,
 *   CONCAT(hr.name, " <", hr.officialEmailId, ">") as hrDetail
 * FROM employee_docs 
 *   LEFT JOIN employees as hr ON employee_docs.hrApproverId = hr.uuid
 * WHERE employee_docs.employeeId = ?
 * ```
 * 
 * Features:
 * - Returns all document types for the employee
 * - Includes HR approval status and comments
 * - Shows HR approver name and email (if approved/rejected)
 * - Ordered by creation date (newest first)
 * 
 * @param employeeId - Employee UUID
 * @returns Array of employee documents with HR details
 */
export async function getEmployeeDocumentsByEmployeeId(
  employeeId: string
): Promise<EmployeeDocumentResult[]> {
  // ============================================================================
  // STEP 1: Initialize Performance Timer
  // ============================================================================
  const timer = new PerformanceTimer('getEmployeeDocumentsByEmployeeId');

  try {
    logger.debug('📄 Fetching employee documents', {
      employeeId,
      operation: 'getEmployeeDocumentsByEmployeeId'
    });

    // ==========================================================================
    // STEP 2: Build SQL Query (EXACT match to old code)
    // ==========================================================================
    // LEFT JOIN to get HR approver details if document was reviewed
    const selectSql = `
      SELECT 
        employee_docs.*,
        CONCAT(hr.name, " <", hr.officialEmailId, ">") as hrDetail
      FROM employee_docs 
        LEFT JOIN employees as hr ON employee_docs.hrApproverId = hr.uuid
      WHERE employee_docs.employeeId = :employeeId
      ORDER BY employee_docs.createdAt DESC
    `;

    logger.debug('📝 SQL Query built for employee documents', {
      employeeId
    });

    // ==========================================================================
    // STEP 3: Execute Database Query
    // ==========================================================================
    const documents = await sequelize.query<EmployeeDocumentResult>(selectSql, {
      replacements: {
        employeeId
      },
      type: QueryTypes.SELECT,
      raw: true,
    });

    // ==========================================================================
    // STEP 4: Log Performance and Return
    // ==========================================================================
    const duration = timer.end();
    logDatabase('GET_SELF_DOCUMENTS', employeeId, duration);

    logger.info('✅ Employee documents retrieved successfully', {
      employeeId,
      documentCount: documents.length,
      duration: `${duration}ms`
    });

    return documents;

  } catch (error: any) {
    // ==========================================================================
    // STEP 5: Error Handling
    // ==========================================================================
    const duration = timer.end();
    logDatabase('GET_SELF_DOCUMENTS_ERROR', employeeId, duration, error);

    logger.error('❌ Failed to fetch employee documents', {
      employeeId,
      error: error.message,
      code: error.code,
      duration: `${duration}ms`,
      stack: error.stack
    });

    // Re-throw error to be handled by service layer
    throw new Error(`Database error while fetching documents: ${error.message}`);
  }
}
