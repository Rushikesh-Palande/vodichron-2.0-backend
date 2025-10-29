/**
 * Employee Preference Model Type Definitions
 * ===========================================
 * 
 * Purpose:
 * Defines TypeScript interfaces for the Employee Preference model.
 * Ensures type safety when managing user-specific application preferences.
 * 
 * Interfaces:
 * - EmployeePreferenceAttributes: Complete structure of a preference record
 * - EmployeePreferenceCreationAttributes: Optional fields for creating new preferences
 * 
 * Corresponding Model: employee-preference.model.ts
 * Database Table: employee_preferences
 * 
 * Usage:
 * Used for storing and retrieving user preferences such as theme, language,
 * notification settings, and other customization options with type safety.
 */

import { Optional } from 'sequelize';

/**
 * Employee Preference Attributes Interface
 * ----------------------------------------
 * Defines the structure of an Employee Preference record in the database.
 * Stores user-specific application preferences and settings.
 */
export interface EmployeePreferenceAttributes {
  uuid: string;           // Unique identifier for the preference record.
  employeeId: string;     // Foreign key referencing the employees table (uuid field).
  preference: string;     // Name/key of the preference (e.g., "theme", "language").
  value: string;          // Value of the preference.
  createdAt: Date;        // Timestamp when the preference was created.
  createdBy: string;      // User who created the preference record.
  updatedBy: string | null; // User who last updated the preference record.
  updatedAt: Date | null; // Timestamp when the preference was last updated.
}

/**
 * Employee Preference Creation Attributes Interface
 * -------------------------------------------------
 * Defines which fields are optional when creating a new Employee Preference record.
 */
export interface EmployeePreferenceCreationAttributes
  extends Optional<EmployeePreferenceAttributes, 'uuid' | 'createdAt' | 'updatedBy' | 'updatedAt'> {}
