import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../database';
import { EmployeeActivityAttributes, EmployeeActivityCreationAttributes } from '../types/models/employee-activity.types';

/**
 * Employee Activity Model
 * -----------------------
 * This model represents employee activities and actions within the Vodichron HRMS system.
 * It directly corresponds to the "employee_application_activities" table schema.
 * Used for tracking and auditing employee interactions with the application.
 *
 * Fields:
 * - uuid: Unique identifier for the activity record (VARCHAR 50, Primary Key).
 * - employeeId: Foreign key referencing the employees table (uuid field).
 * - activityName: Name/type of the activity performed (VARCHAR 50).
 * - value: JSON data containing activity details and metadata.
 * - createdAt: Timestamp when the activity was recorded.
 * - updatedAt: Timestamp when the activity record was last updated.
 */
class EmployeeActivity extends Model<EmployeeActivityAttributes, EmployeeActivityCreationAttributes> implements EmployeeActivityAttributes {
  public uuid!: string;                    // Unique identifier for the activity record.
  public employeeId!: string;               // Foreign key referencing the employees table (uuid field).
  public activityName!: string;             // Name/type of the activity performed.
  public value!: any;                       // JSON data containing activity details and metadata.
  public createdAt!: Date;                  // Timestamp when the activity was recorded.
  public updatedAt!: Date | null;           // Timestamp when the activity record was last updated.
}

EmployeeActivity.init(
  {
    // 'uuid' field: a string (VARCHAR 50) that serves as the primary key.
    // Automatically generated using UUID v4 if not provided.
    uuid: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    // 'employeeId' field: foreign key referencing the employees table (uuid field).
    // This creates a many-to-one relationship (many activities per employee).
    employeeId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      references: {
        model: 'employees',
        key: 'uuid',
      },
      onDelete: 'CASCADE',  // Delete activities when employee is deleted.
      onUpdate: 'CASCADE',  // Update employeeId when employee uuid changes.
      comment: 'Foreign key referencing employee who performed the activity',
    },
    // 'activityName' field: name/type of the activity performed.
    // Examples: "LOGIN", "TIMESHEET_SUBMIT", "LEAVE_REQUEST", etc.
    activityName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
      comment: 'Type of activity performed by the employee',
    },
    // 'value' field: JSON data containing activity details and metadata.
    // Can store any additional information related to the activity.
    value: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Activity details and metadata in JSON format',
    },
    // 'createdAt' field: stores the timestamp when the activity was recorded.
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    // 'updatedAt' field: stores the timestamp when the activity record was last updated.
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    // Specify the table name in the database for this model.
    tableName: 'employee_application_activities',
    // Pass the Sequelize instance that connects to the database.
    sequelize,
    // Disable Sequelize's automatic timestamp fields (createdAt, updatedAt)
    // since we're using custom fields (createdAt, updatedAt).
    timestamps: false,
    // Add indexes for better query performance
    indexes: [
      {
        fields: ['employeeId'],
        name: 'idx_employee_activities_employee_id',
      },
      {
        fields: ['activityName'],
        name: 'idx_employee_activities_activity_name',
      },
      {
        fields: ['createdAt'],
        name: 'idx_employee_activities_created_at',
      },
    ],
  }
);

export default EmployeeActivity;
