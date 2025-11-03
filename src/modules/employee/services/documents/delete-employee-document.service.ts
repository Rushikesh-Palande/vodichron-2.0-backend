/**
 * Delete Employee Document Service
 * =================================
 * 
 * Service layer for deleting employee documents.
 * Based on: old vodichron deleteEmployeeDocument controller (lines 357-371)
 * 
 * Authorization Logic:
 * - Employees can delete ONLY their OWN documents
 * - HR/SuperUser can delete ANY employee's documents
 * 
 * Old code authorization (lines 360-364):
 * ```typescript
 * if (
 *   params.empid !== req.user.uuid &&
 *   !(loggedInUserRole === ApplicationUserRole.hr || loggedInUserRole === ApplicationUserRole.superUser)
 * ) {
 *   throw new ForbiddenError(`Access denied for the operation request.`);
 * }
 * ```
 */

import { logger, logSecurity } from '../../../../utils/logger';
import { deleteEmployeeDocumentById } from '../../stores/documents/delete-employee-document.store';
import { 
  DeleteEmployeeDocumentInput, 
  DeleteEmployeeDocumentOutput 
} from '../../schemas/documents/delete-employee-document.schemas';
import { ApplicationUserRole } from '../../types/employee.types';

/**
 * User Context Interface
 * =====================
 */
interface UserContext {
  uuid: string;
  role: string; // Can be cast to ApplicationUserRole for comparison
  email: string;
}

/**
 * Delete Employee Document Service
 * =================================
 * 
 * Main service function for deleting employee documents.
 * 
 * Authorization (old code lines 360-364):
 * - IF (employeeId !== logged-in user) AND (role is NOT hr/superUser)
 * - THEN throw ForbiddenError
 * - Employees can ONLY delete their own documents
 * - HR/SuperUser can delete any employee's documents
 * 
 * @param input - Request with employeeId and documentId
 * @param user - Authenticated user context
 * @returns Success response
 * @throws Error if user doesn't have permission
 */
export async function deleteEmployeeDocument(
  input: DeleteEmployeeDocumentInput,
  user: UserContext
): Promise<DeleteEmployeeDocumentOutput> {
  // ============================================================================
  // STEP 1: Log Incoming Request
  // ============================================================================
  logger.info('📥 Delete employee document request received', {
    employeeId: input.employeeId,
    documentId: input.documentId,
    requestedBy: user.uuid,
    requestedByRole: user.role,
    operation: 'deleteEmployeeDocument'
  });

  try {
    // ==========================================================================
    // STEP 2: Validate Authorization
    // ==========================================================================
    // Matches old code lines 360-364
    // Authorization logic:
    // - If employee is NOT deleting their own document
    // - AND user is NOT hr/superUser
    // - THEN deny access
    const isOwnDocument = input.employeeId === user.uuid;
    const userRole = user.role as ApplicationUserRole;
    const isHROrSuperUser = 
      userRole === ApplicationUserRole.hr || 
      userRole === ApplicationUserRole.superUser;

    if (!isOwnDocument && !isHROrSuperUser) {
      logger.warn('⛔ Unauthorized document deletion attempt', {
        documentOwner: input.employeeId,
        documentId: input.documentId,
        attemptedBy: user.uuid,
        attemptedByRole: user.role,
        reason: 'User attempting to delete another employee\'s document without proper permissions'
      });

      logSecurity('DELETE_DOCUMENT_ACCESS_DENIED', 'high', {
        employeeId: input.employeeId,
        documentId: input.documentId,
        userRole: user.role,
        reason: 'Insufficient permissions'
      }, undefined, user.uuid);

      throw new Error('Access denied - You can only delete your own documents');
    }

    // ==========================================================================
    // STEP 3: Log Authorization Success
    // ==========================================================================
    logger.debug('✅ Authorization check passed', {
      employeeId: input.employeeId,
      documentId: input.documentId,
      userId: user.uuid,
      userRole: user.role,
      isOwnDocument,
      isHROrSuperUser
    });

    // ==========================================================================
    // STEP 4: Call Store Layer to Delete Document
    // ==========================================================================
    logger.debug('🔍 Deleting document from database', {
      documentId: input.documentId,
      employeeId: input.employeeId
    });

    await deleteEmployeeDocumentById(input.documentId);

    // ==========================================================================
    // STEP 5: Log Success and Return
    // ==========================================================================
    logger.info('✅ Employee document deleted successfully', {
      employeeId: input.employeeId,
      documentId: input.documentId,
      deletedBy: user.uuid,
      deletedByRole: user.role
    });

    logSecurity('DELETE_DOCUMENT_SUCCESS', 'low', {
      employeeId: input.employeeId,
      documentId: input.documentId,
      userRole: user.role
    }, undefined, user.uuid);

    return {
      success: true,
      message: 'Document deleted successfully'
    };

  } catch (error: any) {
    // ==========================================================================
    // STEP 6: Error Handling
    // ==========================================================================
    logger.error('💥 Delete employee document service error', {
      type: 'DELETE_EMPLOYEE_DOCUMENT_SERVICE_ERROR',
      employeeId: input.employeeId,
      documentId: input.documentId,
      userId: user.uuid,
      error: error?.message,
      stack: error?.stack
    });

    logSecurity('DELETE_DOCUMENT_ERROR', 'critical', {
      employeeId: input.employeeId,
      documentId: input.documentId,
      error: error?.message
    }, undefined, user.uuid);

    // Re-throw error to be handled by controller
    throw error;
  }
}
