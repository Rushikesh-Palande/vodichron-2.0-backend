/**
 * Download Employee Document Service
 * ===================================
 * 
 * Service layer for downloading employee documents.
 * Based on: old vodichron downloadEmployeeDocument controller (lines 373-390)
 * 
 * Authorization Logic:
 * - Employees can download ONLY their OWN documents
 * - HR/SuperUser can download ANY employee's documents
 * 
 * Old code authorization (lines 376-380):
 * ```typescript
 * if (
 *   params.empid !== req.user.uuid &&
 *   !(loggedInUserRole === ApplicationUserRole.hr || loggedInUserRole === ApplicationUserRole.superUser)
 * ) {
 *   throw new ForbiddenError(`Access denied for the operation request.`);
 * }
 * ```
 * 
 * File Path Construction (lines 386-387):
 * ```typescript
 * const assetPath = config.get('asset.path');
 * const filePath = `${assetPath}/employee_documents/${employeeDocument.fileName}`;
 * ```
 */

import { logger, logSecurity } from '../../../../utils/logger';
import { getEmployeeDocumentByDocumentId } from '../../stores/documents/download-employee-document.store';
import { 
  DownloadEmployeeDocumentInput,
  EmployeeDocumentFile
} from '../../schemas/documents/download-employee-document.schemas';
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
 * Download Document Result
 * ========================
 */
export interface DownloadDocumentResult {
  document: EmployeeDocumentFile;
  filePath: string;
}

/**
 * Download Employee Document Service
 * ===================================
 * 
 * Main service function for downloading employee documents.
 * 
 * Authorization (old code lines 376-380):
 * - IF (employeeId !== logged-in user) AND (role is NOT hr/superUser)
 * - THEN throw ForbiddenError
 * - Employees can ONLY download their own documents
 * - HR/SuperUser can download any employee's documents
 * 
 * Returns:
 * - Document metadata
 * - File path for download
 * 
 * @param input - Request with employeeId and documentId
 * @param user - Authenticated user context
 * @param assetPath - Base path for asset storage (from config)
 * @returns Document metadata and file path
 * @throws Error if user doesn't have permission or document not found
 */
export async function downloadEmployeeDocument(
  input: DownloadEmployeeDocumentInput,
  user: UserContext,
  assetPath: string
): Promise<DownloadDocumentResult> {
  // ============================================================================
  // STEP 1: Log Incoming Request
  // ============================================================================
  logger.info('📥 Download employee document request received', {
    employeeId: input.employeeId,
    documentId: input.documentId,
    requestedBy: user.uuid,
    requestedByRole: user.role,
    operation: 'downloadEmployeeDocument'
  });

  try {
    // ==========================================================================
    // STEP 2: Validate Authorization
    // ==========================================================================
    // Matches old code lines 376-380
    // Authorization logic:
    // - If employee is NOT downloading their own document
    // - AND user is NOT hr/superUser
    // - THEN deny access
    const isOwnDocument = input.employeeId === user.uuid;
    const userRole = user.role as ApplicationUserRole;
    const isHROrSuperUser = 
      userRole === ApplicationUserRole.hr || 
      userRole === ApplicationUserRole.superUser;

    if (!isOwnDocument && !isHROrSuperUser) {
      logger.warn('⛔ Unauthorized document download attempt', {
        documentOwner: input.employeeId,
        documentId: input.documentId,
        attemptedBy: user.uuid,
        attemptedByRole: user.role,
        reason: 'User attempting to download another employee\'s document without proper permissions'
      });

      logSecurity('DOWNLOAD_DOCUMENT_ACCESS_DENIED', 'high', {
        employeeId: input.employeeId,
        documentId: input.documentId,
        userRole: user.role,
        reason: 'Insufficient permissions'
      }, undefined, user.uuid);

      throw new Error('Access denied - You can only download your own documents');
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
    // STEP 4: Fetch Document Metadata from Database
    // ==========================================================================
    logger.debug('🔍 Fetching document metadata from database', {
      documentId: input.documentId,
      employeeId: input.employeeId
    });

    const document = await getEmployeeDocumentByDocumentId(input.documentId);

    // Check if document exists (old code lines 383-385)
    if (!document) {
      logger.warn('⚠️ Document not found', {
        documentId: input.documentId,
        employeeId: input.employeeId,
        requestedBy: user.uuid
      });

      logSecurity('DOWNLOAD_DOCUMENT_NOT_FOUND', 'medium', {
        employeeId: input.employeeId,
        documentId: input.documentId,
        userRole: user.role
      }, undefined, user.uuid);

      throw new Error('Document not found');
    }

    // ==========================================================================
    // STEP 5: Construct File Path (lines 386-387)
    // ==========================================================================
    // Old code: const filePath = `${assetPath}/employee_documents/${employeeDocument.fileName}`;
    const filePath = `${assetPath}/employee_documents/${document.fileName}`;

    logger.debug('📁 File path constructed', {
      documentId: input.documentId,
      fileName: document.fileName,
      filePath
    });

    // ==========================================================================
    // STEP 6: Log Success and Return
    // ==========================================================================
    logger.info('✅ Employee document ready for download', {
      employeeId: input.employeeId,
      documentId: input.documentId,
      fileName: document.fileName,
      requestedBy: user.uuid,
      requestedByRole: user.role
    });

    logSecurity('DOWNLOAD_DOCUMENT_SUCCESS', 'low', {
      employeeId: input.employeeId,
      documentId: input.documentId,
      userRole: user.role
    }, undefined, user.uuid);

    return {
      document,
      filePath
    };

  } catch (error: any) {
    // ==========================================================================
    // STEP 7: Error Handling
    // ==========================================================================
    logger.error('💥 Download employee document service error', {
      type: 'DOWNLOAD_EMPLOYEE_DOCUMENT_SERVICE_ERROR',
      employeeId: input.employeeId,
      documentId: input.documentId,
      userId: user.uuid,
      error: error?.message,
      stack: error?.stack
    });

    logSecurity('DOWNLOAD_DOCUMENT_ERROR', 'critical', {
      employeeId: input.employeeId,
      documentId: input.documentId,
      error: error?.message
    }, undefined, user.uuid);

    // Re-throw error to be handled by controller
    throw error;
  }
}
