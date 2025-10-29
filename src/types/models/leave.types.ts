/**
 * Leave Model Type Definitions
 * ============================
 * 
 * Purpose:
 * Defines TypeScript interfaces for the Leave model.
 * Ensures type safety when working with employee leave request data.
 * 
 * Interfaces:
 * - LeaveAttributes: Complete structure of a leave request record
 * - LeaveCreationAttributes: Optional fields for creating new leave requests
 * 
 * Corresponding Model: leave.model.ts
 * Database Table: employee_leaves
 * 
 * Usage:
 * Used for leave application submission, multi-level approval workflows,
 * leave balance deduction, and leave history tracking with type safety.
 */

import { Optional } from 'sequelize';

/**
 * Leave Attributes Interface
 * --------------------------
 * Defines the structure of an Employee Leave record
 */
export interface LeaveAttributes {
  uuid: string;
  requestNumber: number;
  employeeId: string;
  leaveType: string;
  reason: string | null;
  leaveStartDate: Date | null;
  leaveEndDate: Date | null;
  leaveDays: number | null;
  isHalfDay: boolean;
  requestedDate: Date;
  leaveApprovers: any; // JSON
  leaveApprovalStatus: 'REQUESTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: Date;
  createdBy: string;
  updatedAt: Date | null;
  updatedBy: string;
}

export interface LeaveCreationAttributes
  extends Optional<
    LeaveAttributes,
    'uuid' | 'reason' | 'leaveStartDate' | 'leaveEndDate' | 'leaveDays' | 'isHalfDay' | 'requestedDate' | 'leaveApprovalStatus' | 'createdAt' | 'updatedAt'
  > {}
