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
  taskDetails: any; // JSON
  totalHours: number;
  approvalStatus: 'REQUESTED' | 'APPROVED' | 'REJECTED' | null;
  approverId: string | null;
  approverRole: string | null;
  approvalDate: Date | null;
  approverComments: string | null;
  timeSheetStatus: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'SAVED';
  createdAt: Date;
  createdBy: string;
  updatedAt: Date | null;
  updatedBy: string;
}

export interface WeeklyTimesheetCreationAttributes
  extends Optional<
    WeeklyTimesheetAttributes,
    'uuid' | 'approvalStatus' | 'approverId' | 'approverRole' | 'approvalDate' | 'approverComments' | 'timeSheetStatus' | 'createdAt' | 'updatedAt'
  > {}
