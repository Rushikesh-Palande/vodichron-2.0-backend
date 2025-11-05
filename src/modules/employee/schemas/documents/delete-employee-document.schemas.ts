/**
 * Delete Employee Document Schemas
 * =================================
 * 
 * Zod validation schemas for deleting employee documents.
 * Based on: old vodichron deleteEmployeeDocument controller (lines 357-371)
 * 
 * Authorization Logic:
 * - Employees can delete their OWN documents
 * - HR/SuperUser can delete ANY employee's documents
 * 
 * Old code authorization (lines 360-364):
 * ```typescript
 * if (
 *   params.empid !== req.user.uuid &&
 *   !(loggedInUserRole === ApplicationUserRole.hr || loggedInUserRole === ApplicationUserRole.superUser)
 * ) {
 *   throw new ForbiddenError(`Access denied for the operation request.`);
 * }
 * ```
 * 
 * SQL Query (lines 58-61 in employeeDocuments.ts):
 * ```sql
 * DELETE FROM employee_docs WHERE employee_docs.uuid=?
 * ```
 */

import { z } from 'zod';

/**
 * Delete Employee Document Input Schema
 * =====================================
 * 
 * Validates the employee ID and document ID parameters.
 * 
 * Old code (lines 358-366):
 * - const { params } = req;
 * - params.empid: Employee UUID who owns the document
 * - params.docid: Document UUID to delete
 * - Authorization check: empid matches logged-in user OR user is HR/SuperUser
 */
export const deleteEmployeeDocumentInputSchema = z.object({
  employeeId: z
    .string()
    .uuid('Invalid employee ID format')
    .describe('Employee UUID who owns the document'),
  
  documentId: z
    .string()
    .uuid('Invalid document ID format')
    .describe('Document UUID to delete'),
});

export type DeleteEmployeeDocumentInput = z.infer<typeof deleteEmployeeDocumentInputSchema>;

/**
 * Delete Employee Document Output Schema
 * ======================================
 * 
 * Old response format (lines 368-370): { data: employeeDocuments }
 * Note: Old code returns the result from DELETE query (which is typically void/undefined)
 * New implementation will return a success message
 */
export const deleteEmployeeDocumentOutputSchema = z.object({
  success: z.boolean().describe('Whether deletion was successful'),
  message: z.string().describe('Success message'),
});

export type DeleteEmployeeDocumentOutput = z.infer<typeof deleteEmployeeDocumentOutputSchema>;
