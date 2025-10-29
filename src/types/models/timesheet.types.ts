/**
 * Timesheet Model Type Definitions
 * ================================
 * 
 * Purpose:
 * Defines TypeScript interfaces for the Timesheet model.
 * Ensures type safety when working with employee daily timesheet data.
 * 
 * Interfaces:
 * - TimesheetAttributes: Complete structure of a timesheet record
 * - TimesheetCreationAttributes: Optional fields for creating new timesheets
 * 
 * Corresponding Model: timesheet.model.ts
 * Database Table: employee_timesheets
 * 
 * Usage:
 * Used for daily work hour logging, task tracking, billable hours calculation,
 * and attendance verification through type-safe operations.
 */

import { Optional } from 'sequelize';

/**
 * Timesheet Attributes Interface
 * ------------------------------
 * Defines the structure of an Employee Timesheet record
 */
export interface TimesheetAttributes {
  uuid: string;
  employeeId: string;
  requestNumber: number;
  timesheetDate: Date;
  taskDetails: any; // JSON
  totalHours: number;
  approvalStatus: 'REQUESTED' | 'APPROVED' | 'REJECTED';
  approverId: string | null;
  approvalDate: Date | null;
  approverComments: string | null;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date | null;
  updatedBy: string;
}

export interface TimesheetCreationAttributes
  extends Optional<
    TimesheetAttributes,
    'uuid' | 'approvalStatus' | 'approverId' | 'approvalDate' | 'approverComments' | 'createdAt' | 'updatedAt'
  > {}
