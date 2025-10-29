/**
 * Employee Document Model Type Definitions
 * =========================================
 * 
 * Purpose:
 * Defines TypeScript interfaces for the Employee Document model.
 * Ensures type safety when managing employee document uploads and approvals.
 * 
 * Interfaces:
 * - EmployeeDocumentAttributes: Complete structure of a document record
 * - EmployeeDocumentCreationAttributes: Optional fields for creating new documents
 * 
 * Corresponding Model: employee-document.model.ts
 * Database Table: employee_documents
 * 
 * Usage:
 * Used for document upload management, HR approval workflows, document tracking,
 * and compliance verification with type safety.
 */

import { Optional } from 'sequelize';

export interface EmployeeDocumentAttributes {
  uuid: string;
  employeeId: string;
  documentType: string;
  fileName: string;
  hrApprovalStatus: 'REQUESTED' | 'APPROVED' | 'REJECTED';
  hrApproverId: string | null;
  hrApprovalDate: Date | null;
  hrApproverComments: string | null;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date | null;
  updatedBy: string;
}

export interface EmployeeDocumentCreationAttributes
  extends Optional<
    EmployeeDocumentAttributes,
    'uuid' | 'hrApprovalStatus' | 'hrApproverId' | 'hrApprovalDate' | 'hrApproverComments' | 'createdAt' | 'updatedAt'
  > {}
