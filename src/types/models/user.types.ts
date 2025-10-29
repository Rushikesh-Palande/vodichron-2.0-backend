import { Optional } from 'sequelize';

/**
 * User Attributes Interface
 * -------------------------
 * Defines the structure of a User record in the database.
 * Represents application users with authentication and authorization details.
 */
export interface UserAttributes {
  uuid: string;                                                              // Unique identifier for the user record.
  employeeId: string;                                                        // Foreign key referencing the employees table (uuid field).
  role: 'super_user' | 'hr' | 'employee' | 'customer' | 'manager' | 'director'; // User role determining access permissions.
  password: string;                                                          // Hashed password for authentication.
  passwordUpdateTimestamp: Date;                                             // Timestamp of last password update.
  status: 'ACTIVE' | 'INACTIVE';                                             // Current account status.
  createdAt: Date;                                                           // Timestamp when the user was created.
  createdBy: string;                                                         // User who created this record.
  updatedAt: Date | null;                                                    // Timestamp when the user was last updated.
  updatedBy: string;                                                         // User who last updated this record.
  isSystemGenerated: boolean;                                                // Flag indicating if account was system-generated.
  lastLogin: Date | null;                                                    // Timestamp of last login.
}

/**
 * User Creation Attributes Interface
 * ----------------------------------
 * Defines which fields are optional when creating a new User
 */
export interface UserCreationAttributes
  extends Optional<
    UserAttributes,
    | 'uuid'
    | 'passwordUpdateTimestamp'
    | 'status'
    | 'createdAt'
    | 'updatedAt'
    | 'isSystemGenerated'
    | 'lastLogin'
  > {}
