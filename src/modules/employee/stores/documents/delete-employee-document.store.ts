/**
 * Delete Employee Document Store
 * ===============================
 * 
 * Database operations for deleting employee documents.
 * Based on: old vodichron deleteEmployeeDocumentById (employeeDocuments.ts lines 58-66)
 * 
 * SQL Query:
 * - Deletes document record from employee_docs table
 * - Note: Old code has TODO comment "Delete document from the folder" (not implemented)
 */

import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../../database';
import { logger, logDatabase, PerformanceTimer } from '../../../../utils/logger';

/**
 * Delete Employee Document By ID
 * ===============================
 * 
 * Deletes a document record from the database.
 * 
 * EXACT SQL from old code (lines 60-61):
 * ```sql
 * DELETE FROM employee_docs WHERE employee_docs.uuid=?
 * ```
 * 
 * Note from old code (line 367):
 * - TODO: Delete document from the folder (not implemented yet)
 * - This only deletes the database record, not the physical file
 * 
 * @param documentId - Document UUID to delete
 * @returns void
 * @throws Error if database operation fails
 */
export async function deleteEmployeeDocumentById(documentId: string): Promise<void> {
  // ============================================================================
  // STEP 1: Initialize Performance Timer
  // ============================================================================
  const timer = new PerformanceTimer('deleteEmployeeDocumentById');

  try {
    logger.debug('🗑️ Deleting employee document', {
      documentId,
      operation: 'deleteEmployeeDocumentById'
    });

    // ==========================================================================
    // STEP 2: Build SQL Query (EXACT match to old code)
    // ==========================================================================
    const deleteSql = `DELETE FROM employee_docs WHERE employee_docs.uuid = :documentId`;

    logger.debug('📝 SQL Query built for document deletion', {
      documentId
    });

    // ==========================================================================
    // STEP 3: Execute Database Query
    // ==========================================================================
    await sequelize.query(deleteSql, {
      replacements: {
        documentId
      },
      type: QueryTypes.DELETE,
    });

    // ==========================================================================
    // STEP 4: Log Performance and Return
    // ==========================================================================
    const duration = timer.end();
    logDatabase('DELETE_EMPLOYEE_DOCUMENT', documentId, duration);

    logger.info('✅ Employee document deleted successfully', {
      documentId,
      duration: `${duration}ms`
    });

    // Note: Old code has TODO to delete physical file from folder
    // TODO: Implement file deletion from storage
    // const assetPath = config.get('asset.path');
    // const filePath = `${assetPath}/employee_documents/${fileName}`;
    // fs.unlinkSync(filePath);

  } catch (error: any) {
    // ==========================================================================
    // STEP 5: Error Handling
    // ==========================================================================
    const duration = timer.end();
    logDatabase('DELETE_EMPLOYEE_DOCUMENT_ERROR', documentId, duration, error);

    logger.error('❌ Failed to delete employee document', {
      documentId,
      error: error.message,
      code: error.code,
      duration: `${duration}ms`,
      stack: error.stack
    });

    // Re-throw error to be handled by service layer
    throw new Error(`Database error while deleting document: ${error.message}`);
  }
}
