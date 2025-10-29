import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../database';
import { WeeklyTimesheetAttributes, WeeklyTimesheetCreationAttributes } from '../types/models/weekly-timesheet.types';

/**
 * Weekly Timesheet Model
 * ----------------------
 * This model represents employee weekly timesheets in the Vodichron HRMS system.
 * It directly corresponds to the 'employee_weekly_timesheets' table schema.
 * Tracks weekly work hours and tasks aggregated over a week period.
 *
 * Fields:
 * - uuid: Unique identifier for the weekly timesheet record (VARCHAR 50, Primary Key).
 * - employeeId: Foreign key referencing the employees table (VARCHAR 50).
 * - requestNumber: Sequential request number for tracking (INTEGER UNSIGNED).
 * - weekStartDate: Start date of the week (DATE).
 * - weekEndDate: End date of the week (DATE).
 * - taskDetails: JSON containing weekly task breakdown (JSON).
 * - totalHours: Total hours worked during the week (DECIMAL 5,2).
 * - approvalStatus: Current approval status (ENUM: REQUESTED, APPROVED, REJECTED, nullable).
 * - approverId: User ID of the approver (VARCHAR 50).
 * - approverRole: Role of the approver (VARCHAR 50).
 * - approvalDate: Date when timesheet was approved/rejected (DATE).
 * - approverComments: Comments from the approver (TEXT).
 * - timeSheetStatus: Overall timesheet status (ENUM: REQUESTED, APPROVED, REJECTED, SAVED).
 * - createdAt: Timestamp when the weekly timesheet was created.
 * - createdBy: User who created the weekly timesheet (VARCHAR 40).
 * - updatedAt: Timestamp when the weekly timesheet was last updated.
 * - updatedBy: User who last updated the weekly timesheet (VARCHAR 40).
 * 
 * Use Cases:
 * - Weekly work hour aggregation
 * - Client billing (weekly basis)
 * - Weekly productivity tracking
 * - Multi-level approval workflow
 */
class WeeklyTimesheet extends Model<WeeklyTimesheetAttributes, WeeklyTimesheetCreationAttributes> implements WeeklyTimesheetAttributes {
  public uuid!: string;                                             // Unique identifier for the weekly timesheet record.
  public employeeId!: string;                                       // Foreign key referencing the employees table.
  public requestNumber!: number;                                    // Sequential request number for tracking.
  public weekStartDate!: Date;                                      // Start date of the week.
  public weekEndDate!: Date;                                        // End date of the week.
  public taskDetails!: any;                                         // JSON containing weekly task breakdown.
  public totalHours!: number;                                       // Total hours worked during the week.
  public approvalStatus!: 'REQUESTED' | 'APPROVED' | 'REJECTED' | null; // Current approval status.
  public approverId!: string | null;                                // User ID of the approver.
  public approverRole!: string | null;                              // Role of the approver.
  public approvalDate!: Date | null;                                // Date when timesheet was approved/rejected.
  public approverComments!: string | null;                          // Comments from the approver.
  public timeSheetStatus!: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'SAVED'; // Overall timesheet status.
  public createdAt!: Date;                                          // Timestamp when the weekly timesheet was created.
  public createdBy!: string;                                        // User who created the weekly timesheet.
  public updatedAt!: Date | null;                                   // Timestamp when the weekly timesheet was last updated.
  public updatedBy!: string;                                        // User who last updated the weekly timesheet.
}

WeeklyTimesheet.init(
  {
    // 'uuid' field: a string (VARCHAR 50) that serves as the primary key.
    // Automatically generated using UUID v4 if not provided.
    uuid: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    // 'employeeId' field: foreign key referencing the employees table.
    // Identifies the employee who submitted the weekly timesheet.
    employeeId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      references: {
        model: 'employees',
        key: 'uuid',
      },
      onDelete: 'CASCADE',  // Delete weekly timesheets when employee is deleted.
      onUpdate: 'CASCADE',  // Update employeeId when employee uuid changes.
      comment: 'Foreign key referencing the employee',
    },
    // 'requestNumber' field: sequential number for the weekly timesheet request.
    // Used for human-readable identification and tracking.
    requestNumber: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment: 'Sequential request number for tracking',
    },
    // 'weekStartDate' field: start date of the week (typically Monday).
    // Defines the beginning of the timesheet week period.
    weekStartDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Start date of the week',
    },
    // 'weekEndDate' field: end date of the week (typically Sunday).
    // Defines the end of the timesheet week period.
    weekEndDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'End date of the week',
    },
    // 'taskDetails' field: JSON containing weekly task breakdown.
    // Structure: {"day1": [{task: "", hours: 0}], "day2": [...]}
    // Aggregates daily tasks across the entire week.
    taskDetails: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'JSON containing weekly task breakdown',
    },
    // 'totalHours' field: total hours worked during the week.
    // Sum of all daily hours, typically 40 hours for full week.
    // Decimal(5,2) allows up to 999.99 hours (supports overtime).
    totalHours: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      validate: {
        min: 0,     // Cannot be negative
        max: 168,   // Cannot exceed 168 hours in a week (24*7)
      },
      comment: 'Total hours worked during the week',
    },
    // 'approvalStatus' field: current approval status from specific approver.
    // REQUESTED: Submitted to approver
    // APPROVED: Approved by approver
    // REJECTED: Rejected by approver
    // Null: Not yet submitted for approval
    approvalStatus: {
      type: DataTypes.ENUM('REQUESTED', 'APPROVED', 'REJECTED'),
      allowNull: true,
      validate: {
        isIn: [['REQUESTED', 'APPROVED', 'REJECTED']],
      },
      comment: 'Current approval status from specific approver',
    },
    // 'approverId' field: identifier of the user who approved/rejected.
    // Null until timesheet is reviewed.
    approverId: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'User ID of the approver',
    },
    // 'approverRole' field: role of the approver in approval workflow.
    // Examples: "Manager", "Director", "Client Approver"
    approverRole: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Role of the approver',
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
    // 'timeSheetStatus' field: overall status of the weekly timesheet.
    // SAVED: Draft, not submitted for approval
    // REQUESTED: Submitted, awaiting approval
    // APPROVED: Fully approved by all required approvers
    // REJECTED: Rejected, needs revision
    timeSheetStatus: {
      type: DataTypes.ENUM('REQUESTED', 'APPROVED', 'REJECTED', 'SAVED'),
      allowNull: false,
      defaultValue: 'SAVED',
      validate: {
        isIn: [['REQUESTED', 'APPROVED', 'REJECTED', 'SAVED']],
      },
      comment: 'Overall status of the weekly timesheet',
    },
    // 'createdAt' field: stores the timestamp when the weekly timesheet was created.
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    // 'createdBy' field: identifier of the user who created the weekly timesheet.
    // Typically the employee themselves.
    createdBy: {
      type: DataTypes.STRING(40),
      allowNull: false,
      comment: 'User who created the weekly timesheet',
    },
    // 'updatedAt' field: stores the timestamp when the weekly timesheet was last updated.
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // 'updatedBy' field: identifier of the user who last updated the weekly timesheet.
    updatedBy: {
      type: DataTypes.STRING(40),
      allowNull: false,
      comment: 'User who last updated the weekly timesheet',
    },
  },
  {
    // Specify the table name in the database for this model.
    tableName: 'employee_weekly_timesheets',
    // Pass the Sequelize instance that connects to the database.
    sequelize,
    // Disable Sequelize's automatic timestamp fields (createdAt, updatedAt)
    // since we're using custom fields (createdAt, updatedAt).
    timestamps: false,
    // Add indexes for better query performance
    indexes: [
      {
        fields: ['employeeId'],
        name: 'idx_weekly_timesheets_employee_id',
      },
      {
        fields: ['weekStartDate', 'weekEndDate'],
        name: 'idx_weekly_timesheets_dates',
      },
      {
        fields: ['timeSheetStatus'],
        name: 'idx_weekly_timesheets_status',
      },
      {
        fields: ['employeeId', 'weekStartDate'],
        name: 'idx_weekly_timesheets_employee_week',
        unique: true,  // One weekly timesheet per employee per week
      },
    ],
  }
);

export default WeeklyTimesheet;
