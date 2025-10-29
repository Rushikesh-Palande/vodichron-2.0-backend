import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../database';
import { HolidayAttributes, HolidayCreationAttributes } from '../types/models/holiday.types';

/**
 * Holiday Model
 * -------------
 * This model represents organization-wide holidays in the Vodichron HRMS system.
 * It directly corresponds to the "org_holidays" table schema.
 * Used for managing company holidays across different countries and regions.
 *
 * Fields:
 * - uuid: Unique identifier for the holiday record (VARCHAR 50, Primary Key).
 * - name: Name of the holiday (VARCHAR 200).
 * - date: Date when the holiday occurs (DATETIME).
 * - year: Year of the holiday for easier filtering (INT).
 * - countryCode: ISO country code for regional holidays (VARCHAR 3).
 * - createdBy: User who created the holiday record (VARCHAR 40).
 * - createdAt: Timestamp when the holiday record was created.
 * 
 * Use Cases:
 * - Leave management (blocking leave applications on holidays)
 * - Timesheet validation (auto-marking holidays in timesheets)
 * - Calendar displays (showing holidays in company calendar)
 */
class Holiday extends Model<HolidayAttributes, HolidayCreationAttributes> implements HolidayAttributes {
  public uuid!: string;              // Unique identifier for the holiday record.
  public name!: string;              // Name of the holiday.
  public date!: Date;                // Date when the holiday occurs.
  public year!: number;              // Year of the holiday.
  public countryCode!: string;       // ISO country code for regional holidays.
  public createdBy!: string;         // User who created the holiday record.
  public createdAt!: Date;           // Timestamp when the holiday record was created.
}

Holiday.init(
  {
    // 'uuid' field: a string (VARCHAR 50) that serves as the primary key.
    // Automatically generated using UUID v4 if not provided.
    uuid: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    // 'name' field: name of the holiday (e.g., "Christmas", "Diwali", "New Year").
    // Should be descriptive and recognizable to employees.
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 200],  // Name must be between 2 and 200 characters
      },
      comment: 'Name of the holiday',
    },
    // 'date' field: specific date when the holiday occurs.
    // Stored as DATETIME to support time-based holidays if needed.
    date: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Date when the holiday occurs',
    },
    // 'year' field: year of the holiday for easier querying and filtering.
    // Extracted from the date field for performance optimization.
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 2000,  // Minimum year 2000
        max: 2100,  // Maximum year 2100
      },
      comment: 'Year of the holiday for easier filtering',
    },
    // 'countryCode' field: ISO 3166-1 alpha-2/alpha-3 country code.
    // Examples: "US" (United States), "IN" (India), "UK" (United Kingdom)
    // Allows different holidays for different country offices.
    countryCode: {
      type: DataTypes.STRING(3),
      allowNull: false,
      validate: {
        notEmpty: true,
        is: /^[A-Z]{2,3}$/i,  // Validate country code format
      },
      comment: 'ISO country code for regional holidays',
    },
    // 'createdBy' field: identifier of the user who created the holiday record.
    // Typically an admin or HR personnel UUID.
    createdBy: {
      type: DataTypes.STRING(40),
      allowNull: false,
      comment: 'User who created the holiday record',
    },
    // 'createdAt' field: stores the timestamp when the holiday record was created.
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    // Specify the table name in the database for this model.
    tableName: 'org_holidays',
    // Pass the Sequelize instance that connects to the database.
    sequelize,
    // Disable Sequelize's automatic timestamp fields (createdAt, updatedAt)
    // since we're using custom field (createdAt).
    timestamps: false,
    // Add indexes for better query performance
    indexes: [
      {
        fields: ['date'],
        name: 'idx_holidays_date',
      },
      {
        fields: ['year'],
        name: 'idx_holidays_year',
      },
      {
        fields: ['countryCode'],
        name: 'idx_holidays_country_code',
      },
      {
        fields: ['year', 'countryCode'],
        name: 'idx_holidays_year_country',
      },
    ],
  }
);

export default Holiday;
