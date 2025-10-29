/**
 * Customer Access Model Type Definitions
 * =======================================
 * 
 * Purpose:
 * Defines TypeScript interfaces for the Customer Access model.
 * Ensures type safety when managing customer portal authentication.
 * 
 * Interfaces:
 * - CustomerAccessAttributes: Complete structure of a customer access record
 * - CustomerAccessCreationAttributes: Optional fields for creating new access records
 * 
 * Corresponding Model: customer-access.model.ts
 * Database Table: customer_app_access
 * 
 * Usage:
 * Used for customer portal login, password management, access control,
 * and security tracking with type safety.
 */

import { Optional } from 'sequelize';

/**
 * Customer Access Attributes Interface
 * ------------------------------------
 * Defines the structure of a Customer App Access record in the database.
 * Manages authentication credentials for customers to access the customer portal.
 */
export interface CustomerAccessAttributes {
  uuid: string;                  // Unique identifier for the access record.
  customerId: string;            // Foreign key referencing the customers table (uuid field).
  password: string;              // Hashed password for customer portal access.
  passwordUpdateTimestamp: Date; // Timestamp of last password update.
  status: 'ACTIVE' | 'INACTIVE'; // Current status of the customer access.
  createdAt: Date;               // Timestamp when the access was created.
  createdBy: string;             // User who created the access record.
  updatedBy: string;             // User who last updated the access record.
  updatedAt: Date | null;        // Timestamp when the access was last updated.
  isSystemGenerated: boolean;    // Flag indicating if password was system-generated.
  lastLogin: Date | null;        // Timestamp of customer's last login.
}

/**
 * Customer Access Creation Attributes Interface
 * ---------------------------------------------
 * Defines which fields are optional when creating a new Customer Access record.
 */
export interface CustomerAccessCreationAttributes
  extends Optional<
    CustomerAccessAttributes,
    'uuid' | 'passwordUpdateTimestamp' | 'status' | 'createdAt' | 'updatedAt' | 'isSystemGenerated' | 'lastLogin'
  > {}
