/**
 * Update Document Status tRPC Procedure
 * ======================================
 * 
 * tRPC mutation procedure for HR approval/rejection of employee documents.
 * Based on: old vodichron updateDocumentStatus controller (lines 406-415)
 * 
 * Pattern:
 * tRPC Procedure → Service (business logic) → Store (database)
 * 
 * Usage:
 * ```typescript
 * const result = await trpc.employee.updateDocumentStatus.mutate({
 *   documentId: "doc-uuid",
 *   approvalStatus: "APPROVED",
 *   comment: "Looks good"
 * });
 * ```
 * 
 * Authorization:
 * - User must be authenticated (protectedProcedure)
 * - Service enforces HR/SuperUser only
 */

import { protectedProcedure } from '../../../../../trpc/trpc';
import { logger } from '../../../../../utils/logger';
import { updateDocumentStatus } from '../../../services/documents/update-document-status.service';
import { 
  updateDocumentStatusInputSchema, 
  updateDocumentStatusOutputSchema 
} from '../../../schemas/documents/update-document-status.schemas';

/**
 * Update Document Status Procedure
 * =================================
 * 
 * Type-safe tRPC mutation for HR document approval/rejection.
 * 
 * Features:
 * - Automatic input validation (Zod schema)
 * - Type-safe response (auto-generated TypeScript types)
 * - Built-in authentication (protectedProcedure)
 * - Service-layer authorization (HR/SuperUser only)
 * 
 * Input:
 * - documentId: string (UUID)
 * - approvalStatus: 'APPROVED' | 'REJECTED'
 * - comment: string (HR comments)
 * 
 * Output:
 * - success: boolean
 * - message: string
 */
export const updateDocumentStatusProcedure = protectedProcedure
  .input(updateDocumentStatusInputSchema)
  .output(updateDocumentStatusOutputSchema)
  .mutation(async ({ input, ctx }) => {
    // ==========================================================================
    // STEP 1: Log Incoming Request
    // ==========================================================================
    logger.info('📥 Update document status request received (tRPC)', {
      documentId: input.documentId,
      approvalStatus: input.approvalStatus,
      requestedBy: ctx.user.uuid,
      procedure: 'employee.updateDocumentStatus'
    });

    try {
      // ==========================================================================
      // STEP 2: Call Service Layer
      // ==========================================================================
      // Service layer handles authorization check
      const result = await updateDocumentStatus(input, {
        uuid: ctx.user.uuid,
        role: ctx.user.role,
        email: ctx.user.email || ''
      });

      // ==========================================================================
      // STEP 3: Log Success and Return
      // ==========================================================================
      logger.info('✅ Document status updated successfully (tRPC)', {
        documentId: input.documentId,
        approvalStatus: input.approvalStatus,
        updatedBy: ctx.user.uuid
      });

      return result;

    } catch (error: any) {
      // ==========================================================================
      // STEP 4: Error Handling
      // ==========================================================================
      logger.error('💥 Update document status tRPC error', {
        type: 'UPDATE_DOCUMENT_STATUS_TRPC_ERROR',
        documentId: input.documentId,
        userId: ctx.user.uuid,
        error: error?.message,
        stack: error?.stack
      });

      // tRPC will automatically wrap this in a TRPCError
      throw error;
    }
  });
