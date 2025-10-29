import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../database';
import { UserAttributes, UserCreationAttributes } from '../types/models/user.types';

/**
 * User Model
 * ----------
 * Represents application users in the Vodichron HRMS system.
 * Maps to the 'application_users' table.
 * 
 * Fields:
 * - uuid: Unique identifier (VARCHAR 50, Primary Key)
 * - employeeId: Reference to employee record (VARCHAR 50, FK to employees)
 * - role: User role (ENUM: super_user, hr, employee, customer, manager, director)
 * - password: Hashed password (VARCHAR 255)
 * - passwordUpdateTimestamp: Timestamp of last password update
 * - status: Account status (ENUM: ACTIVE, INACTIVE)
 * - createdAt: Record creation timestamp
 * - createdBy: User who created the record
 * - updatedAt: Record last update timestamp
 * - updatedBy: User who last updated the record
 * - isSystemGenerated: Flag for system-generated accounts
 * - lastLogin: Timestamp of last login
 */
class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public uuid!: string;                                                              // Unique identifier for the user account.
  public employeeId!: string;                                                        // Foreign key referencing the employees table.
  public role!: 'super_user' | 'hr' | 'employee' | 'customer' | 'manager' | 'director'; // User role for access control.
  public password!: string;                                                          // Hashed password for authentication.
  public passwordUpdateTimestamp!: Date;                                             // Timestamp of last password update.
  public status!: 'ACTIVE' | 'INACTIVE';                                             // Current account status.
  public createdAt!: Date;                                                           // Timestamp when the user account was created.
  public createdBy!: string;                                                         // User who created this account.
  public updatedAt!: Date | null;                                                    // Timestamp when the user account was last updated.
  public updatedBy!: string;                                                         // User who last updated this account.
  public isSystemGenerated!: boolean;                                                // Flag indicating if password was system-generated.
  public lastLogin!: Date | null;                                                    // Timestamp of last login.
}

User.init(
  {
    // 'uuid' field: a string (VARCHAR 50) that serves as the primary key.
    // Automatically generated using UUID v4 if not provided.
    uuid: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    // 'employeeId' field: foreign key referencing the employees table.
    // Links the user account to an employee record.
    // Note: Field name in database is 'employeeId' (camelCase).
    employeeId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'employeeId',
      references: {
        model: 'employees',
        key: 'uuid',
      },
      onDelete: 'CASCADE',  // Delete user account when employee is deleted.
      onUpdate: 'CASCADE',  // Update employeeId when employee uuid changes.
      comment: 'Foreign key referencing the employee',
    },
    // 'role' field: user role for role-based access control (RBAC).
    // super_user: Full system access
    // hr: HR personnel with access to employee management
    // manager: Manager with team access
    // director: Director-level access
    // employee: Standard employee access
    // customer: External customer portal access
    role: {
      type: DataTypes.ENUM('super_user', 'hr', 'employee', 'customer', 'manager', 'director'),
      allowNull: false,
      validate: {
        isIn: [['super_user', 'hr', 'employee', 'customer', 'manager', 'director']],
      },
      comment: 'User role for access control',
    },
    // 'password' field: hashed password for authentication.
    // Should ALWAYS be hashed using bcrypt or similar before storage.
    // Never store plaintext passwords.
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
      comment: 'Hashed password for authentication',
    },
    // 'passwordUpdateTimestamp' field: tracks when password was last changed.
    // Used for password expiry policies and security audits.
    // Note: Field name in database is 'password_update_timestamp' (snake_case).
    passwordUpdateTimestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'password_update_timestamp',
      comment: 'Timestamp of last password update',
    },
    // 'status' field: current status of the user account.
    // ACTIVE: User can log in and access the system
    // INACTIVE: User account is disabled/suspended
    status: {
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE'),
      allowNull: false,
      defaultValue: 'ACTIVE',
      validate: {
        isIn: [['ACTIVE', 'INACTIVE']],
      },
      comment: 'Current account status',
    },
    // 'createdAt' field: stores the timestamp when the user account was created.
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    // 'createdBy' field: identifier of the user who created this account.
    // Typically an admin or HR personnel.
    createdBy: {
      type: DataTypes.STRING(40),
      allowNull: false,
      comment: 'User who created this account',
    },
    // 'updatedAt' field: stores the timestamp when the user account was last updated.
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // 'updatedBy' field: identifier of the user who last updated this account.
    updatedBy: {
      type: DataTypes.STRING(40),
      allowNull: false,
      comment: 'User who last updated this account',
    },
    // 'isSystemGenerated' field: indicates if the password was auto-generated.
    // True: System generated temporary password (should be changed on first login)
    // False: User-set password
    isSystemGenerated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Flag indicating if password was system-generated',
    },
    // 'lastLogin' field: tracks the most recent login time.
    // Used for security monitoring and inactive account identification.
    // Updated on each successful login.
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp of last login',
    },
  },
  {
    // Specify the table name in the database for this model.
    tableName: 'application_users',
    // Pass the Sequelize instance that connects to the database.
    sequelize,
    // Disable Sequelize's automatic timestamp fields (createdAt, updatedAt)
    // since we're using custom fields (createdAt, updatedAt).
    timestamps: false,
    // Add indexes for better query performance
    indexes: [
      {
        fields: ['employeeId'],
        name: 'idx_users_employee_id',
        unique: true,  // One user account per employee
      },
      {
        fields: ['role'],
        name: 'idx_users_role',
      },
      {
        fields: ['status'],
        name: 'idx_users_status',
      },
      {
        fields: ['lastLogin'],
        name: 'idx_users_last_login',
      },
    ],
  }
);

export default User;
