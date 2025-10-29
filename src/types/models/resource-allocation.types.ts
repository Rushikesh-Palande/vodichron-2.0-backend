/**
 * Resource Allocation Model Type Definitions
 * ===========================================
 * 
 * Purpose:
 * Defines TypeScript interfaces for the Resource Allocation model.
 * Ensures type safety when managing employee-to-project assignments.
 * 
 * Interfaces:
 * - ResourceAllocationAttributes: Complete structure of a resource allocation record
 * - ResourceAllocationCreationAttributes: Optional fields for creating new allocations
 * 
 * Corresponding Model: resource-allocation.model.ts
 * Database Table: resource_allocations
 * 
 * Usage:
 * Used for assigning employees to customer projects, tracking project teams,
 * managing resource utilization, and billing with type safety.
 */

import { Optional } from 'sequelize';

/**
 * Resource Allocation Attributes Interface
 * ----------------------------------------
 * Defines the structure of a Project Resource Allocation record in the database.
 * Represents the assignment of employees to customer projects with their roles and duration.
 */
export interface ResourceAllocationAttributes {
  uuid: string;                  // Unique identifier for the allocation record.
  allocationCode: string;        // Unique code for the allocation (e.g., "PROJ001-EMP123").
  projectId: string;             // Foreign key referencing the projects table (uuid field).
  customerId: string;            // Foreign key referencing the customers table (uuid field).
  employeeId: string;            // Foreign key referencing the employees table (uuid field).
  startDate: Date;               // Start date of the resource allocation.
  endDate: Date;                 // End date of the resource allocation.
  role: string;                  // Role of the employee in the project (e.g., "Developer", "Lead").
  customerApprover: boolean | null; // Flag indicating if employee is a customer-side approver.
  status: 'ACTIVE' | 'INACTIVE'; // Current status of the allocation.
  createdBy: string;             // User who created the allocation record.
  createdAt: Date;               // Timestamp when the allocation was created.
  updatedBy: string;             // User who last updated the allocation record.
  updatedAt: Date | null;        // Timestamp when the allocation was last updated.
}

/**
 * Resource Allocation Creation Attributes Interface
 * -------------------------------------------------
 * Defines which fields are optional when creating a new Resource Allocation record.
 */
export interface ResourceAllocationCreationAttributes
  extends Optional<ResourceAllocationAttributes, 'uuid' | 'customerApprover' | 'status' | 'createdAt' | 'updatedAt'> {}
