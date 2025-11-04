/**
 * Upload Document Store
 * =====================
 * 
 * Database operations for employee document upload.
 * Based on: old vodichron insertEmployeeDocument (employeeDocuments.ts lines 9-40)
 * 
 * Logic:
 * 1. Check if document type already exists for employee (SELECT)
 * 2. If exists: UPDATE existing record with new file
 * 3. If not exists: INSERT new record
 * 
 * This allows employees to replace documents of the same type.
 */

import { QueryTypes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { sequelize } from '../../../../database';
import { logger, logDatabase, PerformanceTimer } from '../../../../utils/logger';
import { DocumentInsert } from '../../schemas/documents/upload-document.schemas';

/**
 * Insert or Update Employee Document
 * ==================================
 * 
 * Inserts new document or updates existing document of same type.
 * 
 * EXACT SQL from old code (lines 13-34):
 * - First checks if document type exists for employee
 * - If exists: UPDATE fileName (replaces old document)
 * - If not: INSERT new record with REQUESTED status
 * 
 * @param employeeDocument - Document type and filename
 * @param userId - Employee UUID (both employeeId and createdBy)
 * @returns Document UUID (existing or new)
 */
export async function insertEmployeeDocument(
  employeeDocument: DocumentInsert,
  userId: string
): Promise<string> {
  // ============================================================================
  // STEP 1: Initialize Performance Timer
  // ============================================================================
  const timer = new PerformanceTimer('insertEmployeeDocument');

  try {
    logger.info('💾 Inserting/updating employee document', {
      userId,
      documentType: employeeDocument.documentType,
      operation: 'insertEmployeeDocument'
    });

    // ==========================================================================
    // STEP 2: Check if Document Type Already Exists
    // ==========================================================================
    // Matches old code lines 13-14
    const selectSql = `
      SELECT * 
      FROM employee_docs 
      WHERE employeeId = :userId 
        AND documentType = :documentType
    `;

    const existingRecords = await sequelize.query<{ uuid: string }>(selectSql, {
      replacements: {
        userId,
        documentType: employeeDocument.documentType
      },
      type: QueryTypes.SELECT,
      raw: true,
    });

    logger.debug('🔍 Checked for existing document', {
      userId,
      documentType: employeeDocument.documentType,
      found: existingRecords.length > 0
    });

    // ==========================================================================
    // STEP 3: UPDATE Existing Record (if found)
    // ==========================================================================
    if (existingRecords.length > 0) {
      // Matches old code lines 16-22
      const existingUuid = existingRecords[0].uuid;

      const updateSql = `
        UPDATE employee_docs 
        SET documentType = :documentType,
            fileName = :fileName,
            updatedAt = NOW(),
            updatedBy = :userId
        WHERE uuid = :uuid
      `;

      await sequelize.query(updateSql, {
        replacements: {
          documentType: employeeDocument.documentType,
          fileName: employeeDocument.fileName,
          userId,
          uuid: existingUuid
        },
        type: QueryTypes.UPDATE,
      });

      const duration = timer.end();
      logDatabase('UPDATE_EMPLOYEE_DOCUMENT', userId, duration);

      logger.info('✅ Document updated successfully', {
        documentId: existingUuid,
        userId,
        documentType: employeeDocument.documentType,
        duration: `${duration}ms`
      });

      return existingUuid;
    }

    // ==========================================================================
    // STEP 4: INSERT New Record (if not found)
    // ==========================================================================
    // Matches old code lines 24-34
    const uuid = uuidv4();

    const insertSql = `
      INSERT INTO employee_docs (
        uuid,
        employeeId,
        documentType,
        fileName,
        createdAt,
        createdBy,
        updatedAt,
        updatedBy
      ) VALUES (
        :uuid,
        :employeeId,
        :documentType,
        :fileName,
        NOW(),
        :createdBy,
        NOW(),
        :updatedBy
      )
    `;

    await sequelize.query(insertSql, {
      replacements: {
        uuid,
        employeeId: userId,
        documentType: employeeDocument.documentType,
        fileName: employeeDocument.fileName,
        createdBy: userId,
        updatedBy: userId
      },
      type: QueryTypes.INSERT,
    });

    const duration = timer.end();
    logDatabase('INSERT_EMPLOYEE_DOCUMENT', userId, duration);

    logger.info('✅ Document inserted successfully', {
      documentId: uuid,
      userId,
      documentType: employeeDocument.documentType,
      duration: `${duration}ms`
    });

    return uuid;

  } catch (error: any) {
    // ==========================================================================
    // STEP 5: Error Handling
    // ==========================================================================
    const duration = timer.end();
    logDatabase('INSERT_DOCUMENT_ERROR', userId, duration, error);

    logger.error('❌ Failed to insert/update employee document', {
      userId,
      documentType: employeeDocument.documentType,
      error: error.message,
      code: error.code,
      duration: `${duration}ms`,
      stack: error.stack
    });

    // Re-throw error to be handled by service layer
    throw new Error(`Database error while inserting document: ${error.message}`);
  }
}
