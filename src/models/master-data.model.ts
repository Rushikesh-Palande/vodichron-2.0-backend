import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../database';
import { MasterDataAttributes, MasterDataCreationAttributes } from '../types/models/master-data.types';

/**
 * Master Data Model
 * -----------------
 * This model represents application-wide master data configuration in the Vodichron HRMS system.
 * It directly corresponds to the "application_master_data" table schema.
 * Used for storing key-value configuration pairs that control system behavior.
 *
 * Fields:
 * - uuid: Unique identifier for the master data record (VARCHAR 50, Primary Key).
 * - name: Name/key of the configuration setting (VARCHAR 50).
 * - value: JSON value containing the configuration data.
 * - createdAt: Timestamp when the configuration was created.
 * - createdBy: User who created the configuration (VARCHAR 40).
 * - updatedBy: User who last updated the configuration (VARCHAR 40).
 * - updatedAt: Timestamp when the configuration was last updated.
 * 
 * Use Cases:
 * - System-wide settings (e.g., leave types, departments, designations)
 * - Dropdown options for forms
 * - Feature flags and toggles
 * - Reference data used across the application
 */
class MasterData extends Model<MasterDataAttributes, MasterDataCreationAttributes> implements MasterDataAttributes {
  public uuid!: string;              // Unique identifier for the master data record.
  public name!: string;              // Name/key of the configuration setting.
  public value!: any;                // JSON value containing the configuration data.
  public createdAt!: Date;           // Timestamp when the configuration was created.
  public createdBy!: string;         // User who created the configuration.
  public updatedBy!: string | null;  // User who last updated the configuration.
  public updatedAt!: Date | null;    // Timestamp when the configuration was last updated.
}

MasterData.init(
  {
    // 'uuid' field: a string (VARCHAR 50) that serves as the primary key.
    // Automatically generated using UUID v4 if not provided.
    uuid: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    // 'name' field: name/key of the configuration setting.
    // Examples: "leave_types", "departments", "designations", "countries"
    // Acts as unique identifier for the configuration type.
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
      comment: 'Name/key of the configuration setting',
    },
    // 'value' field: JSON value containing the configuration data.
    // Can store arrays, objects, or any valid JSON structure.
    // Examples: ["Casual Leave", "Sick Leave"], {"enabled": true, "limit": 20}
    value: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'JSON value containing the configuration data',
    },
    // 'createdAt' field: stores the timestamp when the configuration was created.
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    // 'createdBy' field: identifier of the user who created the configuration.
    // Typically an admin or super user.
    createdBy: {
      type: DataTypes.STRING(40),
      allowNull: false,
      comment: 'User who created the configuration',
    },
    // 'updatedBy' field: identifier of the user who last updated the configuration.
    updatedBy: {
      type: DataTypes.STRING(40),
      allowNull: true,
      comment: 'User who last updated the configuration',
    },
    // 'updatedAt' field: stores the timestamp when the configuration was last updated.
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    // Specify the table name in the database for this model.
    tableName: 'application_master_data',
    // Pass the Sequelize instance that connects to the database.
    sequelize,
    // Disable Sequelize's automatic timestamp fields (createdAt, updatedAt)
    // since we're using custom fields (createdAt, updatedAt).
    timestamps: false,
    // Add indexes for better query performance
    indexes: [
      {
        fields: ['name'],
        name: 'idx_master_data_name',
      },
    ],
  }
);

export default MasterData;
