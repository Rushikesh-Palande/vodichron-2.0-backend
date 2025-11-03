/**
 * Get Self Documents Schemas
 * ==========================
 * 
 * Zod validation schemas for retrieving employee's own documents.
 * Based on: old vodichron getEmployeeSelfDocuments controller (lines 346-355)
 * 
 * Authorization:
 * - Employees can ONLY view their own documents
 * - params.id MUST match logged-in user UUID
 * 
 * SQL Query (lines 44-50 in employeeDocuments.ts):
 * ```sql
 * SELECT 
 *   employee_docs.*,
 *   CONCAT(hr.name, " <", hr.officialEmailId, ">") as hrDetail
 * FROM employee_docs 
 *   LEFT JOIN employees as hr ON employee_docs.hrApproverId = hr.uuid
 * WHERE employee_docs.employeeId = ?
 * ```
 */

import { z } from 'zod';

/**
 * Document Approval Status Enum
 * =============================
 */
export const DocumentApprovalStatus = z.enum(['REQUESTED', 'APPROVED', 'REJECTED', 'PENDING']);
export type DocumentApprovalStatusType = z.infer<typeof DocumentApprovalStatus>;

/**
 * Get Self Documents Input Schema
 * ===============================
 * 
 * Validates the employee ID parameter.
 * 
 * Old code (lines 347-349):
 * - const { params } = req;
 * - if (params.id !== req.user.uuid) throw ForbiddenError
 */
export const getSelfDocumentsInputSchema = z.object({
  employeeId: z
    .string()
    .uuid('Invalid employee ID format')
    .describe('Employee UUID - must match logged-in user'),
});

export type GetSelfDocumentsInput = z.infer<typeof getSelfDocumentsInputSchema>;

/**
 * Employee Document Schema
 * ========================
 * 
 * Structure of document record returned from database.
 * Includes HR approval details if document has been reviewed.
 */
export const employeeDocumentResultSchema = z.object({
  uuid: z.string().uuid(),
  employeeId: z.string().uuid(),
  documentType: z.string(),
  fileName: z.string(),
  hrApprovalStatus: DocumentApprovalStatus.nullable().optional(),
  hrApproverId: z.string().uuid().nullable().optional(),
  hrApprovalDate: z.string().nullable().optional(),
  hrApproverComments: z.string().nullable().optional(),
  hrDetail: z.string().nullable().optional(), // Formatted: "Name <email>"
  createdAt: z.string(),
  createdBy: z.string().uuid(),
  updatedAt: z.string(),
  updatedBy: z.string().uuid(),
});

export type EmployeeDocumentResult = z.infer<typeof employeeDocumentResultSchema>;

/**
 * Get Self Documents Output Schema
 * ================================
 * 
 * Array of employee's documents.
 * Old response format (lines 352-354): { data: employeeDocuments }
 */
export const getSelfDocumentsOutputSchema = z.array(employeeDocumentResultSchema);

export type GetSelfDocumentsOutput = z.infer<typeof getSelfDocumentsOutputSchema>;
