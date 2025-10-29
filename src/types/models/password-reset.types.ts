/**
 * Password Reset Model Type Definitions
 * ======================================
 * 
 * Purpose:
 * Defines TypeScript interfaces for the Password Reset model.
 * Ensures type safety when managing password reset requests and tokens.
 * 
 * Interfaces:
 * - PasswordResetAttributes: Complete structure of a password reset record
 * - PasswordResetCreationAttributes: Optional fields for creating new reset requests
 * 
 * Corresponding Model: password-reset.model.ts
 * Database Table: password_reset
 * 
 * Usage:
 * Used for secure password reset workflows, token generation and validation,
 * and email verification with type safety.
 */

import { Optional } from 'sequelize';

/**
 * Password Reset Attributes Interface
 * -----------------------------------
 * Defines the structure of a Password Reset Request record in the database.
 * Used for managing user password reset requests and token validation.
 */
export interface PasswordResetAttributes {
  uuid: string;              // Unique identifier for the password reset request.
  email: string;             // Email address of the user requesting password reset.
  token: string;             // Unique token for verifying the password reset request.
  createdAt: Date;           // Timestamp when the reset request was created.
}

/**
 * Password Reset Creation Attributes Interface
 * --------------------------------------------
 * Defines which fields are optional when creating a new Password Reset record.
 */
export interface PasswordResetCreationAttributes
  extends Optional<PasswordResetAttributes, 'uuid' | 'createdAt'> {}
