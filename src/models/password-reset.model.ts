import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../database';
import { PasswordResetAttributes, PasswordResetCreationAttributes } from '../types/models/password-reset.types';

/**
 * Password Reset Model
 * --------------------
 * This model represents password reset requests in the Vodichron HRMS system.
 * It directly corresponds to the "user_password_reset_request" table schema.
 * Used for secure password reset functionality with token-based verification.
 *
 * Fields:
 * - uuid: Unique identifier for the password reset request (VARCHAR 50, Primary Key).
 * - email: Email address of the user requesting password reset (VARCHAR 200).
 * - token: Unique token for verifying the password reset request (VARCHAR 255).
 * - createdAt: Timestamp when the reset request was created.
 * 
 * Note: Tokens should have an expiration time (typically handled in application logic).
 * Old/expired tokens should be periodically cleaned up from the database.
 */
class PasswordReset extends Model<PasswordResetAttributes, PasswordResetCreationAttributes> implements PasswordResetAttributes {
  public uuid!: string;              // Unique identifier for the password reset request.
  public email!: string;             // Email address of the user requesting password reset.
  public token!: string;             // Unique token for verifying the password reset request.
  public createdAt!: Date;           // Timestamp when the reset request was created.
}

PasswordReset.init(
  {
    // 'uuid' field: a string (VARCHAR 50) that serves as the primary key.
    // Automatically generated using UUID v4 if not provided.
    uuid: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    // 'email' field: email address of the user requesting password reset.
    // Should match the email in the application_users or customers table.
    email: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true,
        isEmail: true,  // Validate email format
      },
      comment: 'Email address of the user requesting password reset',
    },
    // 'token' field: unique token for verifying the password reset request.
    // Typically a randomly generated string or JWT token.
    // Should be hashed before storage for security.
    token: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
      comment: 'Unique verification token for password reset',
    },
    // 'createdAt' field: stores the timestamp when the reset request was created.
    // Used to calculate token expiration (e.g., valid for 1 hour after creation).
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    // Specify the table name in the database for this model.
    tableName: 'user_password_reset_request',
    // Pass the Sequelize instance that connects to the database.
    sequelize,
    // Disable Sequelize's automatic timestamp fields (createdAt, updatedAt)
    // since we're using custom field (createdAt).
    timestamps: false,
    // Add indexes for better query performance
    indexes: [
      {
        fields: ['email'],
        name: 'idx_password_reset_email',
      },
      {
        fields: ['token'],
        name: 'idx_password_reset_token',
      },
      {
        fields: ['createdAt'],
        name: 'idx_password_reset_created_at',
      },
    ],
  }
);

export default PasswordReset;
