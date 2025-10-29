import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../database';
import { OnlineStatusAttributes, OnlineStatusCreationAttributes } from '../types/models/online-status.types';

/**
 * Online Status Model
 * -------------------
 * This model represents the real-time online status of employees in the Vodichron HRMS system.
 * It directly corresponds to the "employee_online_status" table schema.
 * Each employee can have only one status record (one-to-one relationship with employees).
 *
 * Fields:
 * - uuid: Unique identifier for the status record (VARCHAR 50, Primary Key).
 * - employeeId: Foreign key referencing the employees table (uuid field), unique constraint.
 * - onlineStatus: Current online status (ENUM: ONLINE, OFFLINE, AWAY).
 * - updatedAt: Timestamp when the status was last updated.
 */
class OnlineStatus extends Model<OnlineStatusAttributes, OnlineStatusCreationAttributes> implements OnlineStatusAttributes {
  public uuid!: string;                             // Unique identifier for the status record.
  public employeeId!: string;                       // Foreign key referencing the employees table (uuid field), unique.
  public onlineStatus!: 'ONLINE' | 'OFFLINE' | 'AWAY';  // Current online status of the employee.
  public updatedAt!: Date | null;                   // Timestamp when the status was last updated.
}

OnlineStatus.init(
  {
    // 'uuid' field: a string (VARCHAR 50) that serves as the primary key.
    // Automatically generated using UUID v4 if not provided.
    uuid: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    // 'employeeId' field: foreign key referencing the employees table (uuid field).
    // This creates a one-to-one relationship (one status record per employee).
    // Unique constraint ensures each employee has only one status record.
    employeeId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,         // Each employee can only have one status record.
      references: {
        model: 'employees',
        key: 'uuid',
      },
      onDelete: 'CASCADE',  // Delete status when employee is deleted.
      onUpdate: 'CASCADE',  // Update employeeId when employee uuid changes.
      comment: 'Foreign key referencing employee, unique for one-to-one relationship',
    },
    // 'onlineStatus' field: current online status of the employee.
    // Values: ONLINE (actively using system), OFFLINE (not logged in), AWAY (idle/inactive).
    onlineStatus: {
      type: DataTypes.ENUM('ONLINE', 'OFFLINE', 'AWAY'),
      allowNull: false,
      defaultValue: 'OFFLINE',
      validate: {
        isIn: [['ONLINE', 'OFFLINE', 'AWAY']],  // Validate enum values
      },
      comment: 'Current online status of the employee',
    },
    // 'updatedAt' field: stores the timestamp when the status was last updated.
    // Updated whenever the employee's status changes.
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    // Specify the table name in the database for this model.
    tableName: 'employee_online_status',
    // Pass the Sequelize instance that connects to the database.
    sequelize,
    // Disable Sequelize's automatic timestamp fields (createdAt, updatedAt)
    // since we're using custom field (updatedAt).
    timestamps: false,
    // Add indexes for better query performance
    indexes: [
      {
        fields: ['employeeId'],
        name: 'idx_online_status_employee_id',
        unique: true,  // Enforce one-to-one relationship
      },
      {
        fields: ['onlineStatus'],
        name: 'idx_online_status_status',
      },
    ],
  }
);

export default OnlineStatus;
