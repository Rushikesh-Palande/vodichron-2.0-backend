/**
 * Update Document Status Service
 * ===============================
 * 
 * Service layer for HR approval/rejection of employee documents.
 * Based on: old vodichron updateDocumentStatus controller (lines 406-415)
 * 
 * Authorization:
 * - ONLY HR/SuperUser roles allowed
 * 
 * Old code authorization (lines 410-412):
 * ```typescript
 * if (!(loggedInUserRole === ApplicationUserRole.hr || loggedInUserRole === ApplicationUserRole.superUser)) {
 *     throw new ForbiddenError(`Access denied for the operation request.`);
 * }
 * ```
 */

import { logger, logSecurity } from '../../../../utils/logger';
import { setHRApprovalStatusForDocument } from '../../stores/documents/update-document-status.store';
import { 
  UpdateDocumentStatusInput,
  UpdateDocumentStatusOutput
} from '../../schemas/documents/update-document-status.schemas';
import { ApplicationUserRole } from '../../types/employee.types';

/**
 * User Context Interface
 * ======================
 */
interface UserContext {
  uuid: string;
  role: string;
  email: string;
}

/**
 * Update Document Status Service
 * ===============================
 * 
 * Main service function for HR approval/rejection of documents.
 * 
 * Authorization (old code lines 410-412):
 * - ONLY hr OR superUser roles allowed
 * - Throw ForbiddenError if other role attempts
 * 
 * @param input - Request with documentId, approvalStatus, comment
 * @param user - Authenticated user context
 * @returns Success response
 * @throws Error if user is not HR/SuperUser
 */
export async function updateDocumentStatus(
  input: UpdateDocumentStatusInput,
  user: UserContext
): Promise<UpdateDocumentStatusOutput> {
  // ============================================================================
  // STEP 1: Log Incoming Request
  // ============================================================================
  logger.info('📥 Update document status request received', {
    documentId: input.documentId,
    approvalStatus: input.approvalStatus,
    requestedBy: user.uuid,
    requestedByRole: user.role,
    operation: 'updateDocumentStatus'
  });

  try {
    // ==========================================================================
    // STEP 2: Validate Authorization (EXACT match to old code lines 410-412)
    // ==========================================================================
    const userRole = user.role as ApplicationUserRole;
    const isHROrSuperUser = 
      userRole === ApplicationUserRole.hr || 
      userRole === ApplicationUserRole.superUser;

    if (!isHROrSuperUser) {
      logger.warn('⛔ Unauthorized document status update attempt', {
        documentId: input.documentId,
        attemptedBy: user.uuid,
        attemptedByRole: user.role,
        reason: 'User is not HR or SuperUser'
      });

      logSecurity('UPDATE_DOCUMENT_STATUS_ACCESS_DENIED', 'high', {
        documentId: input.documentId,
        userRole: user.role,
        reason: 'Only HR/SuperUser can approve/reject documents'
      }, undefined, user.uuid);

      throw new Error('Access denied - Only HR/SuperUser can approve or reject documents');
    }

    // ==========================================================================
    // STEP 3: Log Authorization Success
    // ==========================================================================
    logger.debug('✅ Authorization check passed', {
      documentId: input.documentId,
      userId: user.uuid,
      userRole: user.role,
      isHROrSuperUser
    });

    // ==========================================================================
    // STEP 4: Call Store Layer to Update Document
    // ==========================================================================
    // Matches old code line 413
    // setHRApprovalStatusForDocument(req.user.uuid, params.docid, comment, approvalStatus)
    logger.debug('🔍 Updating document status in database', {
      documentId: input.documentId,
      approvalStatus: input.approvalStatus,
      hrUserId: user.uuid
    });

    await setHRApprovalStatusForDocument(
      user.uuid,
      input.documentId,
      input.comment,
      input.approvalStatus
    );

    // ==========================================================================
    // STEP 5: Log Success and Return
    // ==========================================================================
    logger.info('✅ Document status updated successfully', {
      documentId: input.documentId,
      approvalStatus: input.approvalStatus,
      updatedBy: user.uuid,
      updatedByRole: user.role
    });

    logSecurity('UPDATE_DOCUMENT_STATUS_SUCCESS', 'low', {
      documentId: input.documentId,
      approvalStatus: input.approvalStatus,
      userRole: user.role
    }, undefined, user.uuid);

    return {
      success: true,
      message: 'Document status updated successfully'
    };

  } catch (error: any) {
    // ==========================================================================
    // STEP 6: Error Handling
    // ==========================================================================
    logger.error('💥 Update document status service error', {
      type: 'UPDATE_DOCUMENT_STATUS_SERVICE_ERROR',
      documentId: input.documentId,
      userId: user.uuid,
      error: error?.message,
      stack: error?.stack
    });

    logSecurity('UPDATE_DOCUMENT_STATUS_ERROR', 'critical', {
      documentId: input.documentId,
      error: error?.message
    }, undefined, user.uuid);

    // Re-throw error to be handled by controller
    throw error;
  }
}
