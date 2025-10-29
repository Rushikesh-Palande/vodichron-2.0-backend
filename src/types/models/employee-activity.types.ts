/**
 * Employee Activity Model Type Definitions
 * =========================================
 * 
 * Purpose:
 * Defines TypeScript interfaces for the Employee Activity model.
 * Ensures type safety when tracking and auditing employee actions.
 * 
 * Interfaces:
 * - EmployeeActivityAttributes: Complete structure of an activity record
 * - EmployeeActivityCreationAttributes: Optional fields for creating new activities
 * 
 * Corresponding Model: employee-activity.model.ts
 * Database Table: employee_application_activities
 * 
 * Usage:
 * Used for tracking employee interactions with the application, audit logging,
 * user behavior analysis, and security monitoring with type safety.
 */

import { Optional } from 'sequelize';

/**
 * Employee Activity Attributes Interface
 * --------------------------------------
 * Defines the structure of an Employee Activity record in the database.
 * Tracks all employee activities and actions within the HRMS application.
 */
export interface EmployeeActivityAttributes {
  uuid: string;                    // Unique identifier for the activity record.
  employeeId: string;               // Foreign key referencing the employees table (uuid field).
  activityName: string;             // Name/type of the activity performed.
  value: any;                       // JSON data containing activity details and metadata.
  createdAt: Date;                  // Timestamp when the activity was recorded.
  updatedAt: Date | null;           // Timestamp when the activity record was last updated.
}

/**
 * Employee Activity Creation Attributes Interface
 * -----------------------------------------------
 * Defines which fields are optional when creating a new Employee Activity record.
 */
export interface EmployeeActivityCreationAttributes
  extends Optional<EmployeeActivityAttributes, 'uuid' | 'createdAt' | 'updatedAt'> {}
