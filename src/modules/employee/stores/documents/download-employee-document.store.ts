/**
 * Download Employee Document Store
 * =================================
 * 
 * Database operations for retrieving document metadata for download.
 * Based on: old vodichron getEmployeeDocumentByDocumentId (employeeDocuments.ts lines 68-76)
 * 
 * Query Details:
 * - Uses getOne() helper to fetch document by UUID
 * - Returns fileName which is used to construct file path
 */

import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../../database';
import { logger, logDatabase, PerformanceTimer } from '../../../../utils/logger';
import { EmployeeDocumentFile } from '../../schemas/documents/download-employee-document.schemas';

/**
 * Get Employee Document By Document ID
 * ====================================
 * 
 * Retrieves document metadata (especially fileName) for download.
 * 
 * Old code (lines 68-76):
 * ```typescript
 * const record = await getOne<EmployeeDocument>(`employee_docs`, { uuid: documentId }, ['fileName']);
 * return record;
 * ```
 * 
 * Returns:
 * - Document record with fileName needed to construct file path
 * - Used in download flow: `${assetPath}/employee_documents/${fileName}`
 * 
 * @param documentId - Document UUID
 * @returns Document record with fileName
 * @throws Error if document not found or database error
 */
export async function getEmployeeDocumentByDocumentId(
  documentId: string
): Promise<EmployeeDocumentFile | null> {
  // ============================================================================
  // STEP 1: Initialize Performance Timer
  // ============================================================================
  const timer = new PerformanceTimer('getEmployeeDocumentByDocumentId');

  try {
    logger.debug('📄 Fetching document metadata for download', {
      documentId,
      operation: 'getEmployeeDocumentByDocumentId'
    });

    // ==========================================================================
    // STEP 2: Build SQL Query
    // ==========================================================================
    // Old code uses getOne() which translates to a SELECT with WHERE clause
    const selectSql = `
      SELECT 
        uuid,
        employeeId,
        fileName,
        documentType,
        createdAt,
        createdBy,
        updatedAt,
        updatedBy
      FROM employee_docs
      WHERE uuid = :documentId
      LIMIT 1
    `;

    logger.debug('📝 SQL Query built for document metadata', {
      documentId
    });

    // ==========================================================================
    // STEP 3: Execute Database Query
    // ==========================================================================
    const documents = await sequelize.query<EmployeeDocumentFile>(selectSql, {
      replacements: {
        documentId
      },
      type: QueryTypes.SELECT,
      raw: true,
    });

    // ==========================================================================
    // STEP 4: Check if Document Exists
    // ==========================================================================
    if (!documents || documents.length === 0) {
      const duration = timer.end();
      logDatabase('GET_DOCUMENT_NOT_FOUND', documentId, duration);
      
      logger.warn('⚠️ Document not found', {
        documentId,
        duration: `${duration}ms`
      });
      
      return null;
    }

    const document = documents[0];

    // ==========================================================================
    // STEP 5: Log Performance and Return
    // ==========================================================================
    const duration = timer.end();
    logDatabase('GET_DOCUMENT_METADATA', documentId, duration);

    logger.info('✅ Document metadata retrieved successfully', {
      documentId,
      fileName: document.fileName,
      duration: `${duration}ms`
    });

    return document;

  } catch (error: any) {
    // ==========================================================================
    // STEP 6: Error Handling
    // ==========================================================================
    const duration = timer.end();
    logDatabase('GET_DOCUMENT_METADATA_ERROR', documentId, duration, error);

    logger.error('❌ Failed to fetch document metadata', {
      documentId,
      error: error.message,
      code: error.code,
      duration: `${duration}ms`,
      stack: error.stack
    });

    // Re-throw error to be handled by service layer
    throw new Error(`Database error while fetching document: ${error.message}`);
  }
}
