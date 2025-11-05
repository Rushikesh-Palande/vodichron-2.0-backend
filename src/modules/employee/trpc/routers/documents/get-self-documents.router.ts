/**
 * Get Self Documents tRPC Procedure
 * =================================
 * 
 * tRPC procedure for retrieving employee's own documents.
 * Based on: old vodichron getEmployeeSelfDocuments controller (lines 346-355)
 * 
 * Pattern:
 * tRPC Procedure → Service (business logic) → Store (database)
 * 
 * Usage:
 * ```typescript
 * const documents = await trpc.employee.getSelfDocuments.query({
 *   employeeId: "user-uuid"
 * });
 * ```
 * 
 * Authorization:
 * - User must be authenticated (protectedProcedure)
 * - Service layer enforces employeeId === logged-in user
 */

import { protectedProcedure } from '../../../../../trpc/trpc';
import { logger } from '../../../../../utils/logger';
import { getEmployeeSelfDocuments } from '../../../services/documents/get-self-documents.service';
import { 
  getSelfDocumentsInputSchema, 
  getSelfDocumentsOutputSchema 
} from '../../../schemas/documents/get-self-documents.schemas';

/**
 * Get Self Documents Procedure
 * ============================
 * 
 * Type-safe tRPC procedure for fetching employee's documents.
 * 
 * Features:
 * - Automatic input validation (Zod schema)
 * - Type-safe response (auto-generated TypeScript types)
 * - Built-in authentication (protectedProcedure)
 * - Service-layer authorization (employeeId === logged-in user)
 * 
 * Input:
 * - employeeId: string (UUID)
 * 
 * Output:
 * - Array of employee documents with HR approval details
 */
export const getSelfDocumentsProcedure = protectedProcedure
  .input(getSelfDocumentsInputSchema)
  .output(getSelfDocumentsOutputSchema)
  .query(async ({ input, ctx }) => {
    // ==========================================================================
    // STEP 1: Log Incoming Request
    // ==========================================================================
    logger.info('📥 Get self documents request received (tRPC)', {
      employeeId: input.employeeId,
      requestedBy: ctx.user.uuid,
      procedure: 'employee.getSelfDocuments'
    });

    try {
      // ==========================================================================
      // STEP 2: Call Service Layer
      // ==========================================================================
      // Service layer handles authorization check
      const documents = await getEmployeeSelfDocuments(input, {
        uuid: ctx.user.uuid,
        role: ctx.user.role,
        email: ctx.user.email || ''
      });

      // ==========================================================================
      // STEP 3: Log Success and Return
      // ==========================================================================
      logger.info('✅ Self documents retrieved successfully (tRPC)', {
        employeeId: input.employeeId,
        documentCount: documents.length,
        userId: ctx.user.uuid
      });

      return documents;

    } catch (error: any) {
      // ==========================================================================
      // STEP 4: Error Handling
      // ==========================================================================
      logger.error('💥 Get self documents tRPC error', {
        type: 'GET_SELF_DOCUMENTS_TRPC_ERROR',
        employeeId: input.employeeId,
        userId: ctx.user.uuid,
        error: error?.message,
        stack: error?.stack
      });

      // tRPC will automatically wrap this in a TRPCError
      throw error;
    }
  });
