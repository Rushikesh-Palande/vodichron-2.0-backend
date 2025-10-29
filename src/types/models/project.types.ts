/**
 * Project Model Type Definitions
 * ==============================
 * 
 * Purpose:
 * Defines TypeScript interfaces for the Project model.
 * Ensures type safety when working with client project data.
 * 
 * Interfaces:
 * - ProjectAttributes: Complete structure of a project record
 * - ProjectCreationAttributes: Optional fields for creating new projects
 * 
 * Corresponding Model: project.model.ts
 * Database Table: projects
 * 
 * Usage:
 * Used by Sequelize models, controllers, and services to maintain type safety
 * when managing project information and resource allocations.
 */

import { Optional } from 'sequelize';

/**
 * Project Attributes Interface
 * ----------------------------
 * Defines the structure of a Project record in the database.
 * Represents client projects that employees are allocated to work on.
 */
export interface ProjectAttributes {
  uuid: string;                                                    // Unique identifier for the project record.
  name: string;                                                    // Name of the project.
  domain: string | null;                                           // Domain/industry of the project (e.g., "Healthcare", "Finance").
  description: string;                                             // Detailed description of the project.
  location: string;                                                // Project location/site.
  status: 'INITIATED' | 'IN PROGRESS' | 'COMPLETE' | 'ON HOLD';   // Current status of the project.
  createdAt: Date;                                                 // Timestamp when the project was created.
  startDate: Date | null;                                          // Project start date.
  endDate: Date | null;                                            // Project end/completion date.
  createdBy: string;                                               // User who created the project record.
  updatedBy: string;                                               // User who last updated the project record.
}

/**
 * Project Creation Attributes Interface
 * -------------------------------------
 * Defines which fields are optional when creating a new Project record.
 */
export interface ProjectCreationAttributes
  extends Optional<ProjectAttributes, 'uuid' | 'domain' | 'status' | 'createdAt' | 'startDate' | 'endDate'> {}
