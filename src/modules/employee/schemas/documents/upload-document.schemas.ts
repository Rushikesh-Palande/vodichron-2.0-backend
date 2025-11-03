/**
 * Upload Document Schemas
 * =======================
 * 
 * Zod validation schemas for employee document upload operation.
 * Based on: old vodichron uploadEmployeeDocument controller (lines 302-344)
 * 
 * Flow:
 * 1. Employee uploads document via multer (file + form fields)
 * 2. File is saved to filesystem with UUID filename
 * 3. Document metadata saved to database
 * 4. Initial status: REQUESTED (pending HR approval)
 * 
 * Authorization:
 * - Employees can only upload documents for themselves
 * - userId in request must match logged-in user UUID
 */

import { z } from 'zod';

/**
 * Document Approval Status Enum
 * =============================
 */
export const DocumentApprovalStatus = z.enum(['REQUESTED', 'APPROVED', 'REJECTED', 'PENDING']);
export type DocumentApprovalStatusType = z.infer<typeof DocumentApprovalStatus>;

/**
 * Upload Document Input Schema
 * ============================
 * 
 * Validates form fields sent with file upload.
 * Note: File itself is handled by multer middleware (req.file)
 * 
 * Old code (lines 312-313):
 * - const { userId, documentType } = req.body;
 * - if (userId !== req.user.uuid) throw ForbiddenError
 */
export const uploadDocumentInputSchema = z.object({
  userId: z
    .string()
    .uuid('Invalid user ID format')
    .describe('Employee UUID - must match logged-in user for security'),
  
  documentType: z
    .string()
    .min(1, 'Document type is required')
    .max(100, 'Document type too long')
    .trim()
    .describe('Type of document (e.g., "PAN Card", "Aadhaar Card", "Bank Passbook")'),
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentInputSchema>;

/**
 * Document Insert Data (for store layer)
 * ======================================
 * 
 * Data structure passed to database insert function.
 * Matches old code insertEmployeeDocument params (lines 9-40 in employeeDocuments.ts)
 */
export const documentInsertSchema = z.object({
  documentType: z.string(),
  fileName: z.string(), // UUID-based filename saved in filesystem
});

export type DocumentInsert = z.infer<typeof documentInsertSchema>;

/**
 * Upload Document Output Schema
 * =============================
 * 
 * Success response structure.
 * Old code returns: res.status(201).send(`File uploaded with name ${newFilePath}`)
 */
export const uploadDocumentOutputSchema = z.object({
  uuid: z.string().uuid().optional(), // Document ID if new insert
  message: z.string(),
  fileName: z.string(),
});

export type UploadDocumentOutput = z.infer<typeof uploadDocumentOutputSchema>;

/**
 * Employee Document Result (from database)
 * ========================================
 * 
 * Full document record structure returned from database.
 */
export const employeeDocumentSchema = z.object({
  uuid: z.string().uuid(),
  employeeId: z.string().uuid(),
  documentType: z.string(),
  fileName: z.string(),
  hrApprovalStatus: DocumentApprovalStatus.default('REQUESTED'),
  hrApproverId: z.string().uuid().nullable(),
  hrApprovalDate: z.string().nullable(),
  hrApproverComments: z.string().nullable(),
  createdAt: z.string(),
  createdBy: z.string().uuid(),
  updatedAt: z.string(),
  updatedBy: z.string().uuid(),
});

export type EmployeeDocument = z.infer<typeof employeeDocumentSchema>;
