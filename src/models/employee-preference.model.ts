import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../database';
import { EmployeePreferenceAttributes, EmployeePreferenceCreationAttributes } from '../types/models/employee-preference.types';

/**
 * Employee Preference Model
 * -------------------------
 * This model represents employee application preferences in the Vodichron HRMS system.
 * It directly corresponds to the "employee_preferences" table schema.
 * Stores customizable settings for each employee like theme, language, notifications, etc.
 *
 * Fields:
 * - uuid: Unique identifier for the preference record (VARCHAR 50, Primary Key).
 * - employeeId: Foreign key referencing employees table (VARCHAR 50).
 * - preference: Name/key of the preference (VARCHAR 50).
 * - value: Value of the preference (VARCHAR 50).
 * - createdAt: Timestamp when the preference was created.
 * - createdBy: User who created the preference record (VARCHAR 40).
 * - updatedBy: User who last updated the preference record (VARCHAR 40).
 * - updatedAt: Timestamp when the preference was last updated.
 */
class EmployeePreference extends Model<EmployeePreferenceAttributes, EmployeePreferenceCreationAttributes> implements EmployeePreferenceAttributes {
  public uuid!: string;                // Unique identifier for the preference record.
  public employeeId!: string;          // Foreign key referencing the employees table.
  public preference!: string;          // Name/key of the preference setting.
  public value!: string;               // Value of the preference setting.
  public createdAt!: Date;             // Timestamp when the preference was created.
  public createdBy!: string;           // User who created the preference record.
  public updatedBy!: string | null;    // User who last updated the preference record.
  public updatedAt!: Date | null;      // Timestamp when the preference was last updated.
}

EmployeePreference.init(
  {
    // 'uuid' field: a string (VARCHAR 50) that serves as the primary key.
    // Automatically generated using UUID v4 if not provided.
    uuid: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    // 'employeeId' field: foreign key referencing the employees table (uuid field).
    // This creates a many-to-one relationship (many preferences per employee).
    employeeId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      references: {
        model: 'employees',
        key: 'uuid',
      },
      onDelete: 'CASCADE',  // Delete preferences when employee is deleted.
      onUpdate: 'CASCADE',  // Update employeeId when employee uuid changes.
      comment: 'Foreign key referencing the employee',
    },
    // 'preference' field: name/key of the preference setting.
    // Examples: "theme", "language", "notification_enabled", "date_format"
    preference: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
      comment: 'Name/key of the preference',
    },
    // 'value' field: value of the preference setting.
    // Examples: "dark", "en-US", "true", "DD/MM/YYYY"
    value: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
      comment: 'Value of the preference',
    },
    // 'createdAt' field: stores the timestamp when the preference was created.
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    // 'createdBy' field: identifier of the user who created the preference.
    createdBy: {
      type: DataTypes.STRING(40),
      allowNull: false,
      comment: 'User who created the preference record',
    },
    // 'updatedBy' field: identifier of the user who last updated the preference.
    updatedBy: {
      type: DataTypes.STRING(40),
      allowNull: true,
      comment: 'User who last updated the preference record',
    },
    // 'updatedAt' field: stores the timestamp when the preference was last updated.
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    // Specify the table name in the database for this model.
    tableName: 'employee_preferences',
    // Pass the Sequelize instance that connects to the database.
    sequelize,
    // Disable Sequelize's automatic timestamp fields (createdAt, updatedAt)
    // since we're using custom fields (createdAt, updatedAt).
    timestamps: false,
    // Add indexes for better query performance
    indexes: [
      {
        fields: ['employeeId'],
        name: 'idx_employee_preferences_employee_id',
      },
      {
        fields: ['preference'],
        name: 'idx_employee_preferences_preference',
      },
    ],
  }
);

export default EmployeePreference;
