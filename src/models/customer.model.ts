import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../database';
import { CustomerAttributes, CustomerCreationAttributes } from '../types/models/customer.types';

/**
 * Customer Model
 * --------------
 * This model represents client organizations in the Vodichron HRMS system.
 * It directly corresponds to the "customers" table schema.
 * Customers are organizations that projects are delivered to and resources are allocated for.
 *
 * Fields:
 * - uuid: Unique identifier for the customer record (VARCHAR 50, Primary Key).
 * - name: Name of the customer/client organization (VARCHAR 200).
 * - primaryContact: Primary contact phone number (VARCHAR 15, optional).
 * - secondaryContact: Secondary contact phone number (VARCHAR 15, required).
 * - email: Email address of the customer (VARCHAR 200).
 * - country: Country where the customer is located (VARCHAR 200).
 * - timezone: Timezone of the customer (VARCHAR 200).
 * - createdBy: User who created the customer record (VARCHAR 40).
 * - status: Current status of the customer relationship (ENUM: ACTIVE, INACTIVE).
 * - createdAt: Timestamp when the customer record was created.
 * - updatedBy: User who last updated the customer record (VARCHAR 40).
 * - updatedAt: Timestamp when the customer record was last updated.
 * 
 * Relationships:
 * - Has many Projects (one customer can have multiple projects)
 * - Has many Resource Allocations (employees allocated to customer projects)
 * - Has one Customer Access (login credentials for customer portal)
 */
class Customer extends Model<CustomerAttributes, CustomerCreationAttributes> implements CustomerAttributes {
  public uuid!: string;                  // Unique identifier for the customer record.
  public name!: string;                  // Name of the customer/client organization.
  public primaryContact!: string | null; // Primary contact phone number.
  public secondaryContact!: string;      // Secondary contact phone number.
  public email!: string;                 // Email address of the customer.
  public country!: string;               // Country where the customer is located.
  public timezone!: string;              // Timezone of the customer.
  public createdBy!: string;             // User who created the customer record.
  public status!: 'ACTIVE' | 'INACTIVE'; // Current status of the customer relationship.
  public createdAt!: Date;               // Timestamp when the customer record was created.
  public updatedBy!: string;             // User who last updated the customer record.
  public updatedAt!: Date | null;        // Timestamp when the customer record was last updated.
}

Customer.init(
  {
    // 'uuid' field: a string (VARCHAR 50) that serves as the primary key.
    // Automatically generated using UUID v4 if not provided.
    uuid: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    // 'name' field: name of the customer/client organization.
    // Should be the official/legal name of the organization.
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 200],  // Name must be between 2 and 200 characters
      },
      comment: 'Name of the customer organization',
    },
    // 'primaryContact' field: primary contact phone number for the customer.
    // Optional field as not all customers may provide primary contact initially.
    primaryContact: {
      type: DataTypes.STRING(15),
      allowNull: true,
      validate: {
        is: /^[+\d\s()-]*$/i,  // Allow phone number format with international prefix
      },
      comment: 'Primary contact phone number',
    },
    // 'secondaryContact' field: secondary/backup contact phone number.
    // Required to ensure there's always at least one way to contact the customer.
    secondaryContact: {
      type: DataTypes.STRING(15),
      allowNull: false,
      validate: {
        notEmpty: true,
        is: /^[+\d\s()-]*$/i,  // Allow phone number format with international prefix
      },
      comment: 'Secondary contact phone number (required)',
    },
    // 'email' field: email address of the customer organization.
    // Used for official communications and portal access.
    email: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true,
        isEmail: true,  // Validate email format
      },
      comment: 'Email address of the customer',
    },
    // 'country' field: country where the customer is located.
    // Used for timezone management and regional settings.
    country: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
      comment: 'Country where the customer is located',
    },
    // 'timezone' field: timezone of the customer (IANA timezone format).
    // Examples: "America/New_York", "Europe/London", "Asia/Kolkata"
    // Important for scheduling meetings and project timelines.
    timezone: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
      comment: 'Timezone of the customer (IANA format)',
    },
    // 'createdBy' field: identifier of the user who created the customer record.
    // Typically an admin or business development personnel UUID.
    createdBy: {
      type: DataTypes.STRING(40),
      allowNull: false,
      comment: 'User who created the customer record',
    },
    // 'status' field: current status of the customer relationship.
    // ACTIVE: Currently engaged customer with active projects
    // INACTIVE: Past customer or on-hold relationship
    status: {
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE'),
      allowNull: false,
      defaultValue: 'ACTIVE',
      validate: {
        isIn: [['ACTIVE', 'INACTIVE']],  // Validate enum values
      },
      comment: 'Current status of the customer relationship',
    },
    // 'createdAt' field: stores the timestamp when the customer record was created.
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    // 'updatedBy' field: identifier of the user who last updated the customer record.
    updatedBy: {
      type: DataTypes.STRING(40),
      allowNull: false,
      comment: 'User who last updated the customer record',
    },
    // 'updatedAt' field: stores the timestamp when the customer record was last updated.
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    // Specify the table name in the database for this model.
    tableName: 'customers',
    // Pass the Sequelize instance that connects to the database.
    sequelize,
    // Disable Sequelize's automatic timestamp fields (createdAt, updatedAt)
    // since we're using custom fields (createdAt, updatedAt).
    timestamps: false,
    // Add indexes for better query performance
    indexes: [
      {
        fields: ['name'],
        name: 'idx_customers_name',
      },
      {
        fields: ['email'],
        name: 'idx_customers_email',
      },
      {
        fields: ['status'],
        name: 'idx_customers_status',
      },
      {
        fields: ['country'],
        name: 'idx_customers_country',
      },
    ],
  }
);

export default Customer;
