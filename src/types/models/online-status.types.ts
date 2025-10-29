/**
 * Online Status Model Type Definitions
 * =====================================
 * 
 * Purpose:
 * Defines TypeScript interfaces for the Online Status model.
 * Ensures type safety when tracking employee real-time availability.
 * 
 * Interfaces:
 * - OnlineStatusAttributes: Complete structure of an online status record
 * - OnlineStatusCreationAttributes: Optional fields for creating new status records
 * 
 * Corresponding Model: online-status.model.ts
 * Database Table: employee_online_status
 * 
 * Usage:
 * Used for real-time presence tracking, availability indicators, and
 * collaboration features with type safety.
 */

import { Optional } from 'sequelize';

/**
 * Online Status Attributes Interface
 * ----------------------------------
 * Defines the structure of an Employee Online Status record in the database.
 * Tracks real-time online/offline/away status of employees in the HRMS system.
 */
export interface OnlineStatusAttributes {
  uuid: string;                             // Unique identifier for the status record.
  employeeId: string;                       // Foreign key referencing the employees table (uuid field), unique.
  onlineStatus: 'ONLINE' | 'OFFLINE' | 'AWAY';  // Current online status of the employee.
  updatedAt: Date | null;                   // Timestamp when the status was last updated.
}

/**
 * Online Status Creation Attributes Interface
 * -------------------------------------------
 * Defines which fields are optional when creating a new Online Status record.
 */
export interface OnlineStatusCreationAttributes
  extends Optional<OnlineStatusAttributes, 'uuid' | 'onlineStatus' | 'updatedAt'> {}
