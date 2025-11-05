/**
 * Get Reportee Employee Documents Schemas
 * ========================================
 * 
 * Zod validation schemas for retrieving employee documents for HR approval.
 * Based on: old vodichron getReporteeEmployeeDocuments controller (lines 393-404)
 * 
 * Purpose:
 * - List for HR approval of employee documents (line 392 comment)
 * - Excludes logged-in user's own documents
 * - Returns paginated list with filters
 * 
 * Authorization:
 * - Intended for HR/SuperUser roles (based on comment)
 * - No explicit check in old code (middleware handles it)
 * 
 * Old code (lines 393-404):
 * ```typescript
 * export const getReporteeEmployeeDocuments = async (req: AuthorizedRequest, res: Response) => {
 *     const { pagination, filters } = req.body;
 *     let { page } = pagination;
 *     const { pageLimit } = pagination;
 *     if (!page) {
 *         page = 0;
 *     }
 *     const employeeDocuments = await getPaginatedEmployeeDocumentsAll(filters, req.user.uuid, page, pageLimit);
 *     res.send({
 *         data: employeeDocuments,
 *     });
 * };
 * ```
 */

import { z } from 'zod';

/**
 * Document Approval Status Enum
 * ==============================
 */
export const DocumentApprovalStatus = z.enum(['REQUESTED', 'APPROVED', 'REJECTED', 'PENDING']);
export type DocumentApprovalStatusType = z.infer<typeof DocumentApprovalStatus>;

/**
 * Pagination Schema
 * =================
 * 
 * Old code (lines 394-398):
 * - page: number (default 0 if not provided)
 * - pageLimit: number
 */
export const paginationSchema = z.object({
  page: z.number().int().min(0).optional().default(0).describe('Page number (0-indexed)'),
  pageLimit: z.number().int().min(1).max(100).optional().default(20).describe('Number of items per page'),
});

export type Pagination = z.infer<typeof paginationSchema>;

/**
 * Filters Schema
 * ===============
 * 
 * Old code (lines 426-429):
 * - hrApprovalStatus: optional filter by approval status
 */
export const filtersSchema = z.object({
  hrApprovalStatus: DocumentApprovalStatus.optional().describe('Filter by HR approval status'),
}).optional();

export type Filters = z.infer<typeof filtersSchema>;

/**
 * Get Reportee Documents Input Schema
 * ====================================
 * 
 * Request body structure matching old code (line 394)
 */
export const getReporteeDocumentsInputSchema = z.object({
  pagination: paginationSchema.optional(),
  filters: filtersSchema,
});

export type GetReporteeDocumentsInput = z.infer<typeof getReporteeDocumentsInputSchema>;

/**
 * Employee Document with Details Schema
 * ======================================
 * 
 * Document record with employee name and HR details.
 * 
 * SQL returns (lines 440-446):
 * - employee_docs.* (all document fields)
 * - hrDetail: HR approver info formatted as "Name <email>"
 * - employeeName: Name of employee who owns the document
 */
export const employeeDocumentWithDetailsSchema = z.object({
  uuid: z.string().uuid(),
  employeeId: z.string().uuid(),
  documentType: z.string(),
  fileName: z.string(),
  hrApprovalStatus: DocumentApprovalStatus.nullable().optional(),
  hrApproverId: z.string().uuid().nullable().optional(),
  hrApprovalDate: z.string().nullable().optional(),
  hrApproverComments: z.string().nullable().optional(),
  hrDetail: z.string().nullable().optional().describe('HR approver: "Name <email>"'),
  employeeName: z.string().describe('Name of employee who owns document'),
  createdAt: z.string(),
  createdBy: z.string().uuid(),
  updatedAt: z.string(),
  updatedBy: z.string().uuid(),
});

export type EmployeeDocumentWithDetails = z.infer<typeof employeeDocumentWithDetailsSchema>;

/**
 * Get Reportee Documents Output Schema
 * =====================================
 * 
 * Array of documents with employee and HR details.
 * Old response format (lines 401-403): { data: employeeDocuments }
 */
export const getReporteeDocumentsOutputSchema = z.array(employeeDocumentWithDetailsSchema);

export type GetReporteeDocumentsOutput = z.infer<typeof getReporteeDocumentsOutputSchema>;
