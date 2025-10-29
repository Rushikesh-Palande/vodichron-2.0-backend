import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../database';
import { TimesheetAttributes, TimesheetCreationAttributes } from '../types/models/timesheet.types';

/**
 * Timesheet Model
 * ---------------
 * This model represents employee daily timesheets in the Vodichron HRMS system.
 * It directly corresponds to the 'employee_timesheets' table schema.
 * Tracks daily work hours and tasks performed by employees.
 *
 * Fields:
 * - uuid: Unique identifier for the timesheet record (VARCHAR 50, Primary Key).
 * - employeeId: Foreign key referencing the employees table (VARCHAR 50).
 * - requestNumber: Sequential request number for tracking (INTEGER UNSIGNED).
 * - timesheetDate: Date for which the timesheet is submitted (DATE).
 * - taskDetails: JSON containing task descriptions and hours (JSON).
 * - totalHours: Total hours worked on the date (DECIMAL 4,2).
 * - approvalStatus: Current approval status (ENUM: REQUESTED, APPROVED, REJECTED).
 * - approverId: User ID of the approver (VARCHAR 50).
 * - approvalDate: Date when timesheet was approved/rejected (DATE).
 * - approverComments: Comments from the approver (TEXT).
 * - createdAt: Timestamp when the timesheet was created.
 * - createdBy: User who created the timesheet (VARCHAR 40).
 * - updatedAt: Timestamp when the timesheet was last updated.
 * - updatedBy: User who last updated the timesheet (VARCHAR 40).
 * 
 * Use Cases:
 * - Daily work hour logging
 * - Task tracking and reporting
 * - Billable hours calculation
 * - Attendance verification
 */
class Timesheet extends Model<TimesheetAttributes, TimesheetCreationAttributes> implements TimesheetAttributes {
  public uuid!: string;                                     // Unique identifier for the timesheet record.
  public employeeId!: string;                               // Foreign key referencing the employees table.
  public requestNumber!: number;                            // Sequential request number for tracking.
  public timesheetDate!: Date;                              // Date for which the timesheet is submitted.
  public taskDetails!: any;                                 // JSON containing task descriptions and hours.
  public totalHours!: number;                               // Total hours worked on the date.
  public approvalStatus!: 'REQUESTED' | 'APPROVED' | 'REJECTED'; // Current approval status.
  public approverId!: string | null;                        // User ID of the approver.
  public approvalDate!: Date | null;                        // Date when timesheet was approved/rejected.
  public approverComments!: string | null;                  // Comments from the approver.
  public createdAt!: Date;                                  // Timestamp when the timesheet was created.
  public createdBy!: string;                                // User who created the timesheet.
  public updatedAt!: Date | null;                           // Timestamp when the timesheet was last updated.
  public updatedBy!: string;                                // User who last updated the timesheet.
}

Timesheet.init(
  {
    // 'uuid' field: a string (VARCHAR 50) that serves as the primary key.
    // Automatically generated using UUID v4 if not provided.
    uuid: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    // 'employeeId' field: foreign key referencing the employees table.
    // Identifies the employee who submitted the timesheet.
    employeeId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      references: {
        model: 'employees',
        key: 'uuid',
      },
      onDelete: 'CASCADE',  // Delete timesheets when employee is deleted.
      onUpdate: 'CASCADE',  // Update employeeId when employee uuid changes.
      comment: 'Foreign key referencing the employee',
    },
    // 'requestNumber' field: sequential number for the timesheet request.
    // Used for human-readable identification and tracking.
    requestNumber: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment: 'Sequential request number for tracking',
    },
    // 'timesheetDate' field: specific date for which the timesheet is submitted.
    // One timesheet per employee per date.
    timesheetDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Date for which the timesheet is submitted',
    },
    // 'taskDetails' field: JSON containing task information.
    // Structure: [{projectId: "", taskName: "", hours: 0, description: ""}]
    // Allows multiple tasks per day with individual hour allocations.
    taskDetails: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'JSON containing task descriptions and hours',
    },
    // 'totalHours' field: total hours worked on the date.
    // Sum of all task hours, typically 8 hours for full day.
    // Decimal allows for partial hours (e.g., 7.5, 8.5).
    totalHours: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: false,
      validate: {
        min: 0,    // Cannot be negative
        max: 24,   // Cannot exceed 24 hours in a day
      },
      comment: 'Total hours worked on the date',
    },
    // 'approvalStatus' field: current approval status of the timesheet.
    // REQUESTED: Submitted, awaiting approval
    // APPROVED: Approved by manager/approver
    // REJECTED: Rejected, may need corrections
    approvalStatus: {
      type: DataTypes.ENUM('REQUESTED', 'APPROVED', 'REJECTED'),
      allowNull: false,
      defaultValue: 'REQUESTED',
      validate: {
        isIn: [['REQUESTED', 'APPROVED', 'REJECTED']],
      },
      comment: 'Current approval status of the timesheet',
    },
    // 'approverId' field: identifier of the user who approved/rejected.
    // Null until timesheet is reviewed.
    approverId: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'User ID of the approver',
    },
    // 'approvalDate' field: date when the timesheet was approved/rejected.
    // Null until reviewed.
    approvalDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date when timesheet was approved/rejected',
    },
    // 'approverComments' field: feedback or notes from the approver.
    // Used for rejection reasons or additional notes.
    approverComments: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Comments from the approver',
    },
    // 'createdAt' field: stores the timestamp when the timesheet was created.
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    // 'createdBy' field: identifier of the user who created the timesheet.
    // Typically the employee themselves.
    createdBy: {
      type: DataTypes.STRING(40),
      allowNull: false,
      comment: 'User who created the timesheet',
    },
    // 'updatedAt' field: stores the timestamp when the timesheet was last updated.
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // 'updatedBy' field: identifier of the user who last updated the timesheet.
    updatedBy: {
      type: DataTypes.STRING(40),
      allowNull: false,
      comment: 'User who last updated the timesheet',
    },
  },
  {
    // Specify the table name in the database for this model.
    tableName: 'employee_timesheets',
    // Pass the Sequelize instance that connects to the database.
    sequelize,
    // Disable Sequelize's automatic timestamp fields (createdAt, updatedAt)
    // since we're using custom fields (createdAt, updatedAt).
    timestamps: false,
    // Add indexes for better query performance
    indexes: [
      {
        fields: ['employeeId'],
        name: 'idx_timesheets_employee_id',
      },
      {
        fields: ['timesheetDate'],
        name: 'idx_timesheets_date',
      },
      {
        fields: ['approvalStatus'],
        name: 'idx_timesheets_approval_status',
      },
      {
        fields: ['employeeId', 'timesheetDate'],
        name: 'idx_timesheets_employee_date',
        unique: true,  // One timesheet per employee per date
      },
    ],
  }
);

export default Timesheet;
