/**
 * Get Reportee Employee Documents tRPC Procedure
 * ===============================================
 * 
 * tRPC procedure for retrieving employee documents for HR approval.
 * Based on: old vodichron getReporteeEmployeeDocuments controller (lines 393-404)
 * 
 * Pattern:
 * tRPC Procedure → Service (business logic) → Store (database)
 * 
 * Usage:
 * ```typescript
 * const documents = await trpc.employee.getReporteeDocuments.query({
 *   pagination: { page: 0, pageLimit: 20 },
 *   filters: { hrApprovalStatus: 'REQUESTED' }
 * });
 * ```
 * 
 * Authorization:
 * - User must be authenticated (protectedProcedure)
 * - Intended for HR/SuperUser roles
 * - Service has NO auth check (follows old pattern)
 */

import { protectedProcedure } from '../../../../../trpc/trpc';
import { logger } from '../../../../../utils/logger';
import { getReporteeEmployeeDocuments } from '../../../services/documents/get-reportee-documents.service';
import { 
  getReporteeDocumentsInputSchema, 
  getReporteeDocumentsOutputSchema 
} from '../../../schemas/documents/get-reportee-documents.schemas';

/**
 * Get Reportee Employee Documents Procedure
 * =========================================
 * 
 * Type-safe tRPC procedure for fetching employee documents for HR approval.
 * 
 * Features:
 * - Automatic input validation (Zod schema)
 * - Type-safe response (auto-generated TypeScript types)
 * - Built-in authentication (protectedProcedure)
 * - Pagination and filtering support
 * 
 * Input:
 * - pagination: { page?: number, pageLimit?: number }
 * - filters?: { hrApprovalStatus?: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'PENDING' }
 * 
 * Output:
 * - Array of employee documents with employee name and HR details
 */
export const getReporteeDocumentsProcedure = protectedProcedure
  .input(getReporteeDocumentsInputSchema)
  .output(getReporteeDocumentsOutputSchema)
  .query(async ({ input, ctx }) => {
    // ==========================================================================
    // STEP 1: Log Incoming Request
    // ==========================================================================
    logger.info('📥 Get reportee documents request received (tRPC)', {
      requestedBy: ctx.user.uuid,
      pagination: input.pagination,
      filters: input.filters,
      procedure: 'employee.getReporteeDocuments'
    });

    try {
      // ==========================================================================
      // STEP 2: Call Service Layer
      // ==========================================================================
      const documents = await getReporteeEmployeeDocuments(input, {
        uuid: ctx.user.uuid,
        role: ctx.user.role,
        email: ctx.user.email || ''
      });

      // ==========================================================================
      // STEP 3: Log Success and Return
      // ==========================================================================
      logger.info('✅ Reportee documents retrieved successfully (tRPC)', {
        documentCount: documents.length,
        requestedBy: ctx.user.uuid
      });

      return documents;

    } catch (error: any) {
      // ==========================================================================
      // STEP 4: Error Handling
      // ==========================================================================
      logger.error('💥 Get reportee documents tRPC error', {
        type: 'GET_REPORTEE_DOCUMENTS_TRPC_ERROR',
        userId: ctx.user.uuid,
        error: error?.message,
        stack: error?.stack
      });

      // tRPC will automatically wrap this in a TRPCError
      throw error;
    }
  });
