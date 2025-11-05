/**
 * Get Reportee Employee Documents Service
 * ========================================
 * 
 * Service layer for retrieving employee documents for HR approval.
 * Based on: old vodichron getReporteeEmployeeDocuments controller (lines 393-404)
 * 
 * Purpose:
 * - List for HR approval of employee documents (comment line 392)
 * - Returns paginated list excluding logged-in user's documents
 * 
 * Authorization:
 * - OLD CODE HAS NO EXPLICIT AUTH CHECK (lines 393-404)
 * - Comment suggests "For Super user and HR role" (line 414)
 * - Assumes middleware/route handles authorization
 * - We follow old pattern: NO auth check in service layer
 */

import { logger } from '../../../../utils/logger';
import { getPaginatedEmployeeDocumentsAll } from '../../stores/documents/get-reportee-documents.store';
import { 
  GetReporteeDocumentsInput,
  GetReporteeDocumentsOutput
} from '../../schemas/documents/get-reportee-documents.schemas';

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
 * Get Reportee Employee Documents Service
 * ========================================
 * 
 * Main service function for retrieving employee documents for HR approval.
 * 
 * Old code logic (lines 393-404):
 * 1. Extract pagination and filters from request body
 * 2. Default page to 0 if not provided
 * 3. Call getPaginatedEmployeeDocumentsAll(filters, req.user.uuid, page, pageLimit)
 * 4. Return { data: employeeDocuments }
 * 
 * NO AUTHORIZATION CHECK in old code - middleware handles it
 * 
 * @param input - Request with pagination and filters
 * @param user - Authenticated user context (for excluding their documents)
 * @returns Array of employee documents with details
 */
export async function getReporteeEmployeeDocuments(
  input: GetReporteeDocumentsInput,
  user: UserContext
): Promise<GetReporteeDocumentsOutput> {
  // ============================================================================
  // STEP 1: Log Incoming Request
  // ============================================================================
  logger.info('📥 Get reportee employee documents request received', {
    requestedBy: user.uuid,
    requestedByRole: user.role,
    pagination: input.pagination,
    filters: input.filters,
    operation: 'getReporteeEmployeeDocuments'
  });

  try {
    // ==========================================================================
    // STEP 2: Extract Pagination Parameters
    // ==========================================================================
    // Matches old code lines 394-398
    let page = input.pagination?.page ?? 0; // Default to 0 if not provided
    const pageLimit = input.pagination?.pageLimit ?? 20; // Default to 20

    // Old code explicitly sets page = 0 if not provided (lines 397-399)
    if (!page || page < 0) {
      page = 0;
    }

    logger.debug('📊 Pagination parameters', {
      page,
      pageLimit,
      userId: user.uuid
    });

    // ==========================================================================
    // STEP 3: Call Store Layer
    // ==========================================================================
    // Matches old code line 400
    // getPaginatedEmployeeDocumentsAll(filters, req.user.uuid, page, pageLimit)
    logger.debug('🔍 Fetching documents from database', {
      userId: user.uuid,
      filters: input.filters,
      page,
      pageLimit
    });

    const documents = await getPaginatedEmployeeDocumentsAll(
      input.filters,
      user.uuid, // Exclude logged-in user's documents
      page,
      pageLimit
    );

    // ==========================================================================
    // STEP 4: Log Success and Return
    // ==========================================================================
    logger.info('✅ Reportee documents retrieved successfully', {
      documentCount: documents.length,
      requestedBy: user.uuid,
      page,
      pageLimit
    });

    return documents;

  } catch (error: any) {
    // ==========================================================================
    // STEP 5: Error Handling
    // ==========================================================================
    logger.error('💥 Get reportee documents service error', {
      type: 'GET_REPORTEE_DOCUMENTS_SERVICE_ERROR',
      userId: user.uuid,
      error: error?.message,
      stack: error?.stack
    });

    // Re-throw error to be handled by controller
    throw error;
  }
}
