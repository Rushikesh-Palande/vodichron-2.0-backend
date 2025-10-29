import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../database';
import { CustomerAccessAttributes, CustomerAccessCreationAttributes } from '../types/models/customer-access.types';

/**
 * Customer Access Model
 * ---------------------
 * This model represents customer portal access credentials in the Vodichron HRMS system.
 * It directly corresponds to the "customer_app_access" table schema.
 * Manages authentication and authorization for customers accessing the portal.
 *
 * Fields:
 * - uuid: Unique identifier for the access record (VARCHAR 50, Primary Key).
 * - customerId: Foreign key referencing customers table (VARCHAR 50).
 * - password: Hashed password for customer portal access (VARCHAR 255).
 * - passwordUpdateTimestamp: Timestamp of last password update.
 * - status: Current status of the customer access (ENUM: ACTIVE, INACTIVE).
 * - createdAt: Timestamp when the access was created.
 * - createdBy: User who created the access record (VARCHAR 40).
 * - updatedBy: User who last updated the access record (VARCHAR 40).
 * - updatedAt: Timestamp when the access was last updated.
 * - isSystemGenerated: Flag indicating if password was system-generated (TINYINT/BOOLEAN).
 * - lastLogin: Timestamp of customer's last login.
 * 
 * Relationships:
 * - Belongs to Customer (one-to-one relationship)
 */
class CustomerAccess extends Model<CustomerAccessAttributes, CustomerAccessCreationAttributes> implements CustomerAccessAttributes {
  public uuid!: string;
  public customerId!: string;
  public password!: string;
  public passwordUpdateTimestamp!: Date;
  public status!: 'ACTIVE' | 'INACTIVE';
  public createdAt!: Date;
  public createdBy!: string;
  public updatedBy!: string;
  public updatedAt!: Date | null;
  public isSystemGenerated!: boolean;
  public lastLogin!: Date | null;
}

CustomerAccess.init(
  {
    // 'uuid' field: a string (VARCHAR 50) that serves as the primary key.
    uuid: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    // 'customerId' field: foreign key referencing the customers table.
    // One-to-one relationship: each customer has one access record.
    customerId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      references: {
        model: 'customers',
        key: 'uuid',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      comment: 'Foreign key referencing the customer',
    },
    // 'password' field: hashed password for customer portal authentication.
    // Should ALWAYS be hashed using bcrypt or similar before storage.
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
      comment: 'Hashed password for customer portal access',
    },
    // 'passwordUpdateTimestamp' field: tracks when password was last changed.
    // Used for password expiry policies and security audits.
    passwordUpdateTimestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'password_update_timestamp',
      comment: 'Timestamp of last password update',
    },
    // 'status' field: current status of the customer access.
    // ACTIVE: Customer can log in to the portal
    // INACTIVE: Customer access is disabled
    status: {
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE'),
      allowNull: false,
      defaultValue: 'ACTIVE',
      validate: {
        isIn: [['ACTIVE', 'INACTIVE']],
      },
      comment: 'Current status of the customer access',
    },
    // 'createdAt' field: stores the timestamp when the access was created.
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    // 'createdBy' field: identifier of the user who created the access record.
    createdBy: {
      type: DataTypes.STRING(40),
      allowNull: false,
      comment: 'User who created the access record',
    },
    // 'updatedBy' field: identifier of the user who last updated the access.
    updatedBy: {
      type: DataTypes.STRING(40),
      allowNull: false,
      comment: 'User who last updated the access record',
    },
    // 'updatedAt' field: stores the timestamp when the access was last updated.
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
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
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp of customer last login',
    },
  },
  {
    // Specify the table name in the database for this model.
    tableName: 'customer_app_access',
    // Pass the Sequelize instance that connects to the database.
    sequelize,
    // Disable Sequelize's automatic timestamp fields.
    timestamps: false,
    // Add indexes for better query performance
    indexes: [
      {
        fields: ['customerId'],
        name: 'idx_customer_access_customer_id',
      },
      {
        fields: ['status'],
        name: 'idx_customer_access_status',
      },
      {
        fields: ['lastLogin'],
        name: 'idx_customer_access_last_login',
      },
    ],
  }
);

export default CustomerAccess;
