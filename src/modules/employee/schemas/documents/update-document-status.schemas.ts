/**
 * Update Document Status Schemas
 * ===============================
 * 
 * Zod validation schemas for HR approval/rejection of employee documents.
 * Based on: old vodichron updateDocumentStatus controller (lines 406-415)
 * 
 * Purpose:
 * - HR/SuperUser approves or rejects employee documents
 * - Updates hrApprovalStatus, hrApproverComments, hrApproverId, hrApprovalDate
 * 
 * Authorization:
 * - ONLY HR/SuperUser roles (lines 410-412)
 * 
 * Old code (lines 406-415):
 * ```typescript
 * export const updateDocumentStatus = async (req: AuthorizedRequest, res: Response) => {
 *     const { params } = req;
 *     const { approvalStatus, comment } = req.body;
 *     const loggedInUserRole = req.user.role;
 *     if (!(loggedInUserRole === ApplicationUserRole.hr || loggedInUserRole === ApplicationUserRole.superUser)) {
 *         throw new ForbiddenError(`Access denied for the operation request.`);
 *     }
 *     await setHRApprovalStatusForDocument(req.user.uuid, params.docid, comment, approvalStatus);
 *     res.status(200).send('OK');
 * };
 * ```
 */

import { z } from 'zod';

/**
 * Action Status Enum
 * ==================
 * 
 * Approval status values from old code.
 * Based on ActionStatus type in old vodichron.
 */
export const ActionStatus = z.enum(['APPROVED', 'REJECTED']);
export type ActionStatusType = z.infer<typeof ActionStatus>;

/**
 * Update Document Status Input Schema
 * ====================================
 * 
 * Old code (lines 407-408):
 * - params.docid: Document UUID
 * - body.approvalStatus: 'APPROVED' or 'REJECTED'
 * - body.comment: HR comments
 */
export const updateDocumentStatusInputSchema = z.object({
  documentId: z
    .string()
    .uuid('Invalid document ID format')
    .describe('Document UUID to update'),
  
  approvalStatus: ActionStatus.describe('HR approval decision'),
  
  comment: z
    .string()
    .min(1, 'Comment is required')
    .describe('HR comments about approval/rejection'),
});

export type UpdateDocumentStatusInput = z.infer<typeof updateDocumentStatusInputSchema>;

/**
 * Update Document Status Output Schema
 * =====================================
 * 
 * Old response (line 414): res.status(200).send('OK')
 * New implementation returns structured response
 */
export const updateDocumentStatusOutputSchema = z.object({
  success: z.boolean().describe('Whether update was successful'),
  message: z.string().describe('Success message'),
});

export type UpdateDocumentStatusOutput = z.infer<typeof updateDocumentStatusOutputSchema>;
