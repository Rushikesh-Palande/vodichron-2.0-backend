/**
 * Employee Leave Types
 * ====================
 * TypeScript interfaces and types for employee leave module
 * 
 * Defines all data structures used for:
 * - Leave applications
 * - Leave approvals
 * - Leave allocations
 * - Leave balances
 */

import { LeaveApprovalStatus } from '../constants/leave.constants';

/**
 * Application User Role
 * =====================
 * User roles in the system for authorization
 */
export enum ApplicationUserRole {
  superUser = 'super_user',
  admin = 'admin',
  hr = 'hr',
  manager = 'manager',
  director = 'director',
  employee = 'employee',
  customer = 'customer',
}

/**
 * Leave Approver Interface
 * ========================
 * Represents an approver in the leave approval workflow
 * A leave request can have multiple approvers (manager, director, customer)
 */
export interface LeaveApprover {
  /** UUID of the approver */
  approverId: string;
  
  /** Display detail: "Name <email@example.com>" */
  approverDetail: string;
  
  /** Role of the approver */
  approverRole: ApplicationUserRole;
  
  /** Current approval status */
  approvalStatus: LeaveApprovalStatus;
  
  /** Comments from approver (optional) */
  approverComments?: string;
  
  /** Date when approval/rejection was made (optional) */
  approvalDate?: string;
}

/**
 * Employee Leave Interface
 * ========================
 * Complete leave request record from database
 */
export interface EmployeeLeave {
  /** Unique identifier for the leave */
  uuid: string;
  
  /** Request number (6-digit random number) */
  requestNumber: number;
  
  /** UUID of employee applying for leave */
  employeeId: string;
  
  /** Type of leave (Sick, Casual, etc.) */
  leaveType: string;
  
  /** Reason for leave */
  reason: string;
  
  /** Leave start date (YYYY-MM-DD) */
  leaveStartDate: string;
  
  /** Leave end date (YYYY-MM-DD) */
  leaveEndDate: string;
  
  /** Number of leave days (can be 0.5 for half day) */
  leaveDays: number;
  
  /** Is this a half-day leave? */
  isHalfDay: boolean;
  
  /** Date when leave was requested */
  requestedDate: string;
  
  /** Array of approvers and their status */
  leaveApprovers: LeaveApprover[];
  
  /** Overall leave approval status */
  leaveApprovalStatus: LeaveApprovalStatus;
  
  /** Creation timestamp */
  createdAt: string;
  
  /** UUID of user who created */
  createdBy: string;
  
  /** Update timestamp */
  updatedAt: string;
  
  /** UUID of user who updated */
  updatedBy: string;
}

/**
 * Employee Leave Insert Type
 * ==========================
 * Data required to create a new leave request
 */
export type EmployeeLeaveInsert = Pick<
  EmployeeLeave,
  | 'employeeId'
  | 'leaveType'
  | 'reason'
  | 'leaveStartDate'
  | 'leaveEndDate'
  | 'leaveDays'
  | 'isHalfDay'
  | 'requestedDate'
  | 'leaveApprovers'
  | 'leaveApprovalStatus'
>;

/**
 * Reportee Leave Interface
 * ========================
 * Extended leave interface with employee details
 * Used when managers/HR view leaves of their reportees
 */
export interface ReporteeLeave extends EmployeeLeave {
  /** Name of the employee who applied for leave */
  employeeName: string;
}

/**
 * Employee Leave Filters
 * ======================
 * Filter options for querying leave records
 */
export interface EmployeeLeaveFilters {
  /** Filter by leave type */
  leaveType?: string;
  
  /** Filter by year */
  year?: string;
  
  /** Filter by approval status */
  leaveApprovalStatus?: LeaveApprovalStatus;
  
  /** Filter by reporting manager ID */
  reportingManagerId?: string;
  
  /** Filter by reporting manager role */
  reportingManagerRole?: string;
}

/**
 * Employee Leave Allocation Interface
 * ===================================
 * Represents leave allocation for an employee for a specific year
 */
export interface EmployeeLeaveAllocation {
  /** Unique identifier for the allocation */
  uuid: string;
  
  /** UUID of the employee */
  employeeId: string;
  
  /** Type of leave */
  leaveType: string;
  
  /** Year for this allocation (YYYY) */
  year: string;
  
  /** Number of leaves applied */
  leavesApplied: number;
  
  /** Number of leaves allocated */
  leavesAllocated: number;
  
  /** Number of leaves carried forward from previous year */
  leavesCarryForwarded: number;
  
  /** Calculated leave balance */
  leavesBalance: number;
}

/**
 * Employee Leave Allocation Insert Type
 * =====================================
 * Data required to create a new leave allocation
 * (UUID and balance are auto-generated)
 */
export type EmployeeLeaveAllocationInsert = Omit<
  EmployeeLeaveAllocation,
  'uuid' | 'leavesBalance'
>;

/**
 * Applied Leaves Interface
 * ========================
 * Aggregated applied leaves by leave type
 */
export interface AppliedLeaves {
  leaveType: string;
  leavesApplied: number;
}

/**
 * Allocated Leaves Interface
 * ==========================
 * Organization-level leave allocation by type
 */
export interface AllocatedLeaves {
  leaveType: string;
  allocatedLeaves: number;
}

/**
 * Leave Balance Interface
 * ======================
 * Calculated leave balance for a specific leave type
 */
export interface LeaveBalance {
  leaveType: string;
  leaveBalance: number;
}

/**
 * Combined Leave Balance Interface
 * ================================
 * Leave balance with applied leaves information
 */
export interface CombinedLeaveBalance {
  leaveType: string;
  leaveBalance: number;
  leavesApplied: number;
}

/**
 * Employee Leave Balance Interface
 * ================================
 * Complete leave balance summary for an employee
 */
export interface EmployeeLeaveBalance {
  employeeId: string;
  year: string;
  leaveBalance: CombinedLeaveBalance[];
  organizationAllotedLeaves: AllocatedLeaves[];
}

/**
 * Leave Carry Forwarded Interface
 * ===============================
 * Leaves to be carried forward to next year
 */
export interface LeaveCarryForwarded {
  leaveType: string;
  leavesCarryForwarded: number;
}

/**
 * Pagination Interface
 * ====================
 * Pagination parameters for list queries
 */
export interface Pagination {
  page: number;
  pageLimit: number;
}
