/**
 * Weekly Timesheet Model Type Definitions
 * ========================================
 * 
 * Purpose:
 * Defines TypeScript interfaces for the Weekly Timesheet model.
 * Ensures type safety when working with employee weekly timesheet data.
 * 
 * Interfaces:
 * - WeeklyTimesheetAttributes: Complete structure of a weekly timesheet record
 * - WeeklyTimesheetCreationAttributes: Optional fields for creating new weekly timesheets
 * 
 * Corresponding Model: weekly-timesheet.model.ts
 * Database Table: employee_weekly_timesheets
 * 
 * Usage:
 * Used for weekly work hour aggregation, client billing on weekly basis,
 * weekly productivity tracking, and multi-level approval workflows.
 */

import { Optional } from 'sequelize';

export interface WeeklyTimesheetAttributes {
  uuid: string;
  employeeId: string;
  requestNumber: number;
  weekStartDate: Date;
  weekEndDate: Date;
  
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
  approvalStatus: 'REQUESTED' | 'APPROVED' | 'REJECTED' | null;
  approverId: string | null;
  approverRole: string | null;
  approvalDate: Date | null;
  approverComments: string | null;
  timeSheetStatus: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'SAVED';
  
  // Audit Fields
  createdAt: Date;
  createdBy: string;
  updatedAt: Date | null;
  updatedBy: string;
}

export interface WeeklyTimesheetCreationAttributes
  extends Optional<
    WeeklyTimesheetAttributes,
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
    | 'approverRole'
    | 'approvalDate'
    | 'approverComments'
    | 'timeSheetStatus'
    | 'createdAt'
    | 'updatedAt'
  > {}
