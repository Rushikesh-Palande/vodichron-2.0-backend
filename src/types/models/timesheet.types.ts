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
  
  // Task Identification
  taskId: string | null;
  
  // Project/Client Information
  customer: string | null;
  project: string | null;
  manager: string | null;
  
  // Task Details
  taskBrief: string | null;
  taskStatus: 'Not Started' | 'In Progress' | 'Completed' | 'On Hold' | null;
  responsible: string | null;
  
  // Date Tracking
  plannedStartDate: Date | null;
  plannedEndDate: Date | null;
  actualStartDate: Date | null;
  actualEndDate: Date | null;
  
  // Progress Tracking
  completionPercentage: number | null;
  remarks: string | null;
  reasonForDelay: string | null;
  
  // Time Tracking
  taskHours: string | null; // Format: HH:MM
  taskDetails: any; // JSON (for backward compatibility)
  totalHours: number;
  
  // Approval Workflow
  approvalStatus: 'REQUESTED' | 'APPROVED' | 'REJECTED';
  approverId: string | null;
  approvalDate: Date | null;
  approverComments: string | null;
  
  // Audit Fields
  createdAt: Date;
  createdBy: string;
  updatedAt: Date | null;
  updatedBy: string;
}

export interface TimesheetCreationAttributes
  extends Optional<
    TimesheetAttributes,
    | 'uuid'
    | 'taskId'
    | 'customer'
    | 'project'
    | 'manager'
    | 'taskBrief'
    | 'taskStatus'
    | 'responsible'
    | 'plannedStartDate'
    | 'plannedEndDate'
    | 'actualStartDate'
    | 'actualEndDate'
    | 'completionPercentage'
    | 'remarks'
    | 'reasonForDelay'
    | 'taskHours'
    | 'approvalStatus'
    | 'approverId'
    | 'approvalDate'
    | 'approverComments'
    | 'createdAt'
    | 'updatedAt'
  > {}
