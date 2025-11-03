/**
 * Get Self Documents Service
 * ==========================
 * 
 * Service layer for retrieving employee's own documents.
 * Based on: old vodichron getEmployeeSelfDocuments controller (lines 346-355)
 * 
 * Authorization Logic:
 * - Employees can ONLY view their own documents
 * - employeeId MUST match logged-in user UUID
 * - If not: throw ForbiddenError
 * 
 * Returns:
 * - Array of employee's documents with HR approval details
 * - Includes approval status, comments, HR approver info
 */

import { logger } from '../../../../utils/logger';
import { getEmployeeDocumentsByEmployeeId } from '../../stores/documents/get-self-documents.store';
import { GetSelfDocumentsInput, GetSelfDocumentsOutput } from '../../schemas/documents/get-self-documents.schemas';

/**
 * User Context Interface
 * =====================
 */
interface UserContext {
  uuid: string;
  role: string;
  email: string;
}

/**
 * Get Self Documents Service
 * ==========================
 * 
 * Main service function for retrieving employee's documents.
 * 
 * Authorization (old code lines 348-349):
 * - if (params.id !== req.user.uuid) throw ForbiddenError
 * - Employees can ONLY access their own documents
 * 
 * @param input - Request with employeeId
 * @param user - Authenticated user context
 * @returns Array of employee documents
 */
export async function getEmployeeSelfDocuments(
  input: GetSelfDocumentsInput,
  user: UserContext
): Promise<GetSelfDocumentsOutput> {
  // ============================================================================
  // STEP 1: Log Incoming Request
  // ============================================================================
  logger.info('📥 Get self documents request received', {
    employeeId: input.employeeId,
    requestedBy: user.uuid,
    operation: 'getEmployeeSelfDocuments'
  });

  try {
    // ==========================================================================
    // STEP 2: Validate Authorization
    // ==========================================================================
    // Matches old code lines 348-349
    // IMPORTANT: Employees can ONLY view their own documents
    if (input.employeeId !== user.uuid) {
      logger.warn('⛔ Unauthorized document access attempt', {
        requestedFor: input.employeeId,
        attemptedBy: user.uuid,
        reason: 'User attempting to view another employee\'s documents'
      });

      throw new Error('Access denied - You can only view your own documents');
    }

    // ==========================================================================
    // STEP 3: Call Store Layer
    // ==========================================================================
    logger.debug('🔍 Fetching documents from database', {
      employeeId: input.employeeId
    });

    const documents = await getEmployeeDocumentsByEmployeeId(input.employeeId);

    // ==========================================================================
    // STEP 4: Log Success and Return
    // ==========================================================================
    logger.info('✅ Self documents retrieved successfully', {
      employeeId: input.employeeId,
      documentCount: documents.length,
      requestedBy: user.uuid
    });

    return documents;

  } catch (error: any) {
    // ==========================================================================
    // STEP 5: Error Handling
    // ==========================================================================
    logger.error('💥 Get self documents service error', {
      type: 'GET_SELF_DOCUMENTS_SERVICE_ERROR',
      employeeId: input.employeeId,
      userId: user.uuid,
      error: error?.message,
      stack: error?.stack
    });

    // Re-throw error to be handled by controller
    throw error;
  }
}
