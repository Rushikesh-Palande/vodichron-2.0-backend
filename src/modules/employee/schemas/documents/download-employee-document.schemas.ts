/**
 * Download Employee Document Schemas
 * ===================================
 * 
 * Zod validation schemas for downloading employee documents.
 * Based on: old vodichron downloadEmployeeDocument controller (lines 373-390)
 * 
 * Authorization Logic:
 * - Employees can download their OWN documents
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
 * Response:
 * - Binary file download via res.sendFile()
 * - Content-Type header set to file type
 */

import { z } from 'zod';

/**
 * Download Employee Document Input Schema
 * =======================================
 * 
 * Validates the employee ID and document ID parameters.
 * 
 * Old code (lines 374-382):
 * - const { params } = req;
 * - params.empid: Employee UUID who owns the document
 * - params.docid: Document UUID to download
 * - Authorization check: empid matches logged-in user OR user is HR/SuperUser
 */
export const downloadEmployeeDocumentInputSchema = z.object({
  employeeId: z
    .string()
    .uuid('Invalid employee ID format')
    .describe('Employee UUID who owns the document'),
  
  documentId: z
    .string()
    .uuid('Invalid document ID format')
    .describe('Document UUID to download'),
});

export type DownloadEmployeeDocumentInput = z.infer<typeof downloadEmployeeDocumentInputSchema>;

/**
 * Employee Document File Schema
 * ==============================
 * 
 * Structure of document record from database.
 * Old code (lines 68-76): getEmployeeDocumentByDocumentId returns { fileName }
 */
export const employeeDocumentFileSchema = z.object({
  uuid: z.string().uuid(),
  employeeId: z.string().uuid(),
  fileName: z.string().describe('Physical file name stored on server'),
  documentType: z.string().optional(),
  createdAt: z.string().optional(),
  createdBy: z.string().uuid().optional(),
  updatedAt: z.string().optional(),
  updatedBy: z.string().uuid().optional(),
});

export type EmployeeDocumentFile = z.infer<typeof employeeDocumentFileSchema>;
