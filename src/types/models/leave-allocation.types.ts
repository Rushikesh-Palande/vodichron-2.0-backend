/**
 * Leave Allocation Model Type Definitions
 * ========================================
 * 
 * Purpose:
 * Defines TypeScript interfaces for the Leave Allocation model.
 * Ensures type safety when working with employee leave balance data.
 * 
 * Interfaces:
 * - LeaveAllocationAttributes: Complete structure of a leave allocation record
 * - LeaveAllocationCreationAttributes: Optional fields for creating new allocations
 * 
 * Corresponding Model: leave-allocation.model.ts
 * Database Table: employee_leave_allocation
 * 
 * Usage:
 * Used for tracking leave balances, validating leave requests, generating
 * annual leave reports, and calculating carry-forward amounts with type safety.
 */

import { Optional } from 'sequelize';

/**
 * Leave Allocation Attributes Interface
 * -------------------------------------
 * Defines the structure of an Employee Leave Allocation record
 */
export interface LeaveAllocationAttributes {
  uuid: string;
  employeeId: string;
  year: string;
  leaveType: string;
  leavesApplied: number;
  leavesAllocated: number;
  leavesCarryForwarded: number;
}

export interface LeaveAllocationCreationAttributes
  extends Optional<
    LeaveAllocationAttributes,
    'uuid' | 'leavesApplied' | 'leavesAllocated' | 'leavesCarryForwarded'
  > {}
