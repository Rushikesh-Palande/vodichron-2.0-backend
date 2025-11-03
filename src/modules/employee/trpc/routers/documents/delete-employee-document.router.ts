/**
 * Delete Employee Document tRPC Procedure
 * ========================================
 * 
 * tRPC procedure for deleting employee documents.
 * Based on: old vodichron deleteEmployeeDocument controller (lines 357-371)
 * 
 * Pattern:
 * tRPC Procedure → Service (business logic) → Store (database)
 * 
 * Usage:
 * ```typescript
 * const result = await trpc.employee.deleteEmployeeDocument.mutate({
 *   employeeId: "employee-uuid",
 *   documentId: "document-uuid"
 * });
 * ```
 * 
 * Authorization:
 * - User must be authenticated (protectedProcedure)
 * - Service layer enforces: self OR HR/SuperUser
 */

import { protectedProcedure } from '../../../../../trpc/trpc';
import { logger } from '../../../../../utils/logger';
import { deleteEmployeeDocument } from '../../../services/documents/delete-employee-document.service';
import { 
  deleteEmployeeDocumentInputSchema, 
  deleteEmployeeDocumentOutputSchema 
} from '../../../schemas/documents/delete-employee-document.schemas';

/**
 * Delete Employee Document Procedure
 * ===================================
 * 
 * Type-safe tRPC procedure for deleting employee documents.
 * 
 * Features:
 * - Automatic input validation (Zod schema)
 * - Type-safe response (auto-generated TypeScript types)
 * - Built-in authentication (protectedProcedure)
 * - Service-layer authorization (self OR HR/SuperUser)
 * 
 * Input:
 * - employeeId: string (UUID) - Employee who owns the document
 * - documentId: string (UUID) - Document to delete
 * 
 * Output:
 * - success: boolean
 * - message: string
 */
export const deleteEmployeeDocumentProcedure = protectedProcedure
  .input(deleteEmployeeDocumentInputSchema)
  .output(deleteEmployeeDocumentOutputSchema)
  .mutation(async ({ input, ctx }) => {
    // ==========================================================================
    // STEP 1: Log Incoming Request
    // ==========================================================================
    logger.info('📥 Delete employee document request received (tRPC)', {
      employeeId: input.employeeId,
      documentId: input.documentId,
      requestedBy: ctx.user.uuid,
      procedure: 'employee.deleteEmployeeDocument'
    });

    try {
      // ==========================================================================
      // STEP 2: Call Service Layer
      // ==========================================================================
      // Service layer handles authorization check
      const result = await deleteEmployeeDocument(input, {
        uuid: ctx.user.uuid,
        role: ctx.user.role,
        email: ctx.user.email || ''
      });

      // ==========================================================================
      // STEP 3: Log Success and Return
      // ==========================================================================
      logger.info('✅ Employee document deleted successfully (tRPC)', {
        employeeId: input.employeeId,
        documentId: input.documentId,
        deletedBy: ctx.user.uuid
      });

      return result;

    } catch (error: any) {
      // ==========================================================================
      // STEP 4: Error Handling
      // ==========================================================================
      logger.error('💥 Delete employee document tRPC error', {
        type: 'DELETE_EMPLOYEE_DOCUMENT_TRPC_ERROR',
        employeeId: input.employeeId,
        documentId: input.documentId,
        userId: ctx.user.uuid,
        error: error?.message,
        stack: error?.stack
      });

      // tRPC will automatically wrap this in a TRPCError
      throw error;
    }
  });
