/**
 * Update Document Status Store
 * =============================
 * 
 * Database operations for updating HR approval status on employee documents.
 * Based on: old vodichron setHRApprovalStatusForDocument (employeeDocuments.ts lines 78-102)
 * 
 * Updates:
 * - hrApproverId: UUID of HR who approved/rejected
 * - hrApprovalStatus: 'APPROVED' or 'REJECTED'
 * - hrApproverComments: Comments from HR
 * - hrApprovalDate: Date of approval/rejection
 * - updatedAt, updatedBy: Standard audit fields
 */

import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../../database';
import { logger, logDatabase, PerformanceTimer } from '../../../../utils/logger';
import { ActionStatusType } from '../../schemas/documents/update-document-status.schemas';

/**
 * Set HR Approval Status For Document
 * ====================================
 * 
 * Updates document with HR approval decision.
 * 
 * EXACT SQL from old code (lines 87-94):
 * ```sql
 * UPDATE employee_docs SET 
 *   hrApproverId='${loggedInUserId}',
 *   hrApprovalStatus='${status}',
 *   hrApproverComments='${comment}',
 *   hrApprovalDate='${currentDate}',
 *   updatedAt='${currentDateTime}',
 *   updatedBy='${loggedInUserId}'
 * WHERE uuid=?
 * ```
 * 
 * @param hrUserId - UUID of HR user making the decision
 * @param documentId - UUID of document to update
 * @param comment - HR comments
 * @param approvalStatus - 'APPROVED' or 'REJECTED'
 * @returns true on success
 */
export async function setHRApprovalStatusForDocument(
  hrUserId: string,
  documentId: string,
  comment: string,
  approvalStatus: ActionStatusType
): Promise<boolean> {
  // ============================================================================
  // STEP 1: Initialize Performance Timer
  // ============================================================================
  const timer = new PerformanceTimer('setHRApprovalStatusForDocument');

  try {
    logger.debug('📝 Updating document approval status', {
      documentId,
      hrUserId,
      approvalStatus,
      operation: 'setHRApprovalStatusForDocument'
    });

    // ==========================================================================
    // STEP 2: Get Current Date/Time (matches old code lines 85-86)
    // ==========================================================================
    const currentDateTime = new Date().toISOString().slice(0, 19).replace('T', ' '); // YYYY-MM-DD HH:mm:ss
    const currentDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // ==========================================================================
    // STEP 3: Build SQL UPDATE Query
    // ==========================================================================
    // EXACT match to old code lines 87-94 (but using parameterized queries for security)
    const updateSql = `
      UPDATE employee_docs SET 
        hrApproverId = :hrUserId,
        hrApprovalStatus = :approvalStatus,
        hrApproverComments = :comment,
        hrApprovalDate = :currentDate,
        updatedAt = :currentDateTime,
        updatedBy = :hrUserId
      WHERE uuid = :documentId
    `;

    logger.debug('📝 SQL Query built for document status update', {
      documentId,
      approvalStatus
    });

    // ==========================================================================
    // STEP 4: Execute Database Query
    // ==========================================================================
    await sequelize.query(updateSql, {
      replacements: {
        hrUserId,
        approvalStatus,
        comment,
        currentDate,
        currentDateTime,
        documentId
      },
      type: QueryTypes.UPDATE,
    });

    // ==========================================================================
    // STEP 5: Log Performance and Return
    // ==========================================================================
    const duration = timer.end();
    logDatabase('UPDATE_DOCUMENT_STATUS', documentId, duration);

    logger.info('✅ Document status updated successfully', {
      documentId,
      approvalStatus,
      hrUserId,
      duration: `${duration}ms`
    });

    return true;

  } catch (error: any) {
    // ==========================================================================
    // STEP 6: Error Handling
    // ==========================================================================
    const duration = timer.end();
    logDatabase('UPDATE_DOCUMENT_STATUS_ERROR', documentId, duration, error);

    logger.error('❌ Failed to update document status', {
      documentId,
      hrUserId,
      approvalStatus,
      error: error.message,
      code: error.code,
      duration: `${duration}ms`,
      stack: error.stack
    });

    // Re-throw error to be handled by service layer
    throw new Error(`Database error while updating document status: ${error.message}`);
  }
}
