/**
 * Customer Model Type Definitions
 * ===============================
 * 
 * Purpose:
 * Defines TypeScript interfaces for the Customer model.
 * Ensures type safety when working with customer/client organization data.
 * 
 * Interfaces:
 * - CustomerAttributes: Complete structure of a customer record
 * - CustomerCreationAttributes: Optional fields for creating new customers
 * 
 * Corresponding Model: customer.model.ts
 * Database Table: customers
 * 
 * Usage:
 * Used by Sequelize models, controllers, and services to maintain type safety
 * when creating, reading, updating, or deleting customer records.
 */

import { Optional } from 'sequelize';

/**
 * Customer Attributes Interface
 * -----------------------------
 * Defines the structure of a Customer record in the database.
 * Represents client organizations that projects are delivered to.
 */
export interface CustomerAttributes {
  uuid: string;                  // Unique identifier for the customer record.
  name: string;                  // Name of the customer/client organization.
  primaryContact: string | null; // Primary contact phone number (optional).
  secondaryContact: string;      // Secondary contact phone number (required).
  email: string;                 // Email address of the customer.
  country: string;               // Country where the customer is located.
  timezone: string;              // Timezone of the customer (e.g., "America/New_York").
  createdBy: string;             // User who created the customer record.
  status: 'ACTIVE' | 'INACTIVE'; // Current status of the customer relationship.
  createdAt: Date;               // Timestamp when the customer record was created.
  updatedBy: string;             // User who last updated the customer record.
  updatedAt: Date | null;        // Timestamp when the customer record was last updated.
}

/**
 * Customer Creation Attributes Interface
 * --------------------------------------
 * Defines which fields are optional when creating a new Customer record.
 */
export interface CustomerCreationAttributes
  extends Optional<CustomerAttributes, 'uuid' | 'primaryContact' | 'status' | 'createdAt' | 'updatedAt'> {}
