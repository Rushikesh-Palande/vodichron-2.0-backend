/**
 * Holiday Model Type Definitions
 * ===============================
 * 
 * Purpose:
 * Defines TypeScript interfaces for the Holiday model.
 * Ensures type safety when managing organization-wide holidays.
 * 
 * Interfaces:
 * - HolidayAttributes: Complete structure of a holiday record
 * - HolidayCreationAttributes: Optional fields for creating new holidays
 * 
 * Corresponding Model: holiday.model.ts
 * Database Table: org_holidays
 * 
 * Usage:
 * Used for leave management, timesheet validation, calendar displays,
 * and regional holiday tracking with type safety.
 */

import { Optional } from 'sequelize';

/**
 * Holiday Attributes Interface
 * ----------------------------
 * Defines the structure of an Organization Holiday record in the database.
 * Used for managing company-wide holidays across different countries/regions.
 */
export interface HolidayAttributes {
  uuid: string;              // Unique identifier for the holiday record.
  name: string;              // Name of the holiday (e.g., "Christmas", "Independence Day").
  date: Date;                // Date when the holiday occurs.
  year: number;              // Year of the holiday (for easier querying and filtering).
  countryCode: string;       // ISO country code (e.g., "US", "IN", "UK") for regional holidays.
  createdBy: string;         // User who created the holiday record.
  createdAt: Date;           // Timestamp when the holiday record was created.
}

/**
 * Holiday Creation Attributes Interface
 * -------------------------------------
 * Defines which fields are optional when creating a new Holiday record.
 */
export interface HolidayCreationAttributes
  extends Optional<HolidayAttributes, 'uuid' | 'createdAt'> {}
