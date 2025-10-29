import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../database';
import { LeaveAttributes, LeaveCreationAttributes } from '../types/models/leave.types';

/**
 * Leave Model
 * -----------
 * This model represents employee leave requests in the Vodichron HRMS system.
 * It directly corresponds to the 'employee_leaves' table schema.
 * Manages leave applications, approvals, and tracking throughout their lifecycle.
 *
 * Fields:
 * - uuid: Unique identifier for the leave request (VARCHAR 50, Primary Key).
 * - requestNumber: Sequential request number for tracking (INTEGER UNSIGNED).
 * - employeeId: Foreign key referencing the employees table (VARCHAR 50).
 * - leaveType: Type of leave being requested (VARCHAR 50).
 * - reason: Reason for leave request (VARCHAR 100, optional).
 * - leaveStartDate: Start date of the leave (DATE).
 * - leaveEndDate: End date of the leave (DATE).
 * - leaveDays: Total number of leave days (DECIMAL 4,2).
 * - isHalfDay: Flag indicating if it's a half-day leave (BOOLEAN).
 * - requestedDate: Date when the leave was requested (DATETIME).
 * - leaveApprovers: JSON containing approver chain and their decisions.
 * - leaveApprovalStatus: Current approval status (ENUM: REQUESTED, PENDING, APPROVED, REJECTED).
 * - createdAt: Timestamp when the leave request was created.
 * - createdBy: User who created the leave request (VARCHAR 40).
 * - updatedAt: Timestamp when the leave request was last updated.
 * - updatedBy: User who last updated the leave request (VARCHAR 40).
 * 
 * Relationships:
 * - Belongs to Employee (who is requesting the leave)
 * 
 * Use Cases:
 * - Leave application submission
 * - Multi-level approval workflow
 * - Leave balance deduction
 * - Leave history tracking
 */
class Leave extends Model<LeaveAttributes, LeaveCreationAttributes> implements LeaveAttributes {
  public uuid!: string;                                                       // Unique identifier for the leave request.
  public requestNumber!: number;                                              // Sequential request number for tracking.
  public employeeId!: string;                                                 // Foreign key referencing the employees table.
  public leaveType!: string;                                                  // Type of leave being requested.
  public reason!: string | null;                                              // Reason for leave request.
  public leaveStartDate!: Date | null;                                        // Start date of the leave.
  public leaveEndDate!: Date | null;                                          // End date of the leave.
  public leaveDays!: number | null;                                           // Total number of leave days.
  public isHalfDay!: boolean;                                                 // Flag indicating if it's a half-day leave.
  public requestedDate!: Date;                                                // Date when the leave was requested.
  public leaveApprovers!: any;                                                // JSON containing approver chain and their decisions.
  public leaveApprovalStatus!: 'REQUESTED' | 'PENDING' | 'APPROVED' | 'REJECTED'; // Current approval status.
  public createdAt!: Date;                                                    // Timestamp when the leave request was created.
  public createdBy!: string;                                                  // User who created the leave request.
  public updatedAt!: Date | null;                                             // Timestamp when the leave request was last updated.
  public updatedBy!: string;                                                  // User who last updated the leave request.
}

Leave.init(
  {
    // 'uuid' field: a string (VARCHAR 50) that serves as the primary key.
    // Automatically generated using UUID v4 if not provided.
    uuid: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    // 'requestNumber' field: sequential number for the leave request.
    // Used for human-readable identification and tracking.
    requestNumber: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment: 'Sequential request number for tracking',
    },
    // 'employeeId' field: foreign key referencing the employees table.
    // Identifies the employee who is requesting the leave.
    employeeId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      references: {
        model: 'employees',
        key: 'uuid',
      },
      onDelete: 'CASCADE',  // Delete leave requests when employee is deleted.
      onUpdate: 'CASCADE',  // Update employeeId when employee uuid changes.
      comment: 'Foreign key referencing the employee requesting leave',
    },
    // 'leaveType' field: type of leave being requested.
    // Examples: "Casual Leave", "Sick Leave", "Earned Leave"
    // Should match values from leave_allocation table and master_data.
    leaveType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
      comment: 'Type of leave being requested',
    },
    // 'reason' field: reason or justification for the leave request.
    // Optional field as not all leave types require a reason.
    reason: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Reason for leave request',
    },
    // 'leaveStartDate' field: start date of the leave period.
    // Date when the employee will be on leave.
    leaveStartDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Start date of the leave',
    },
    // 'leaveEndDate' field: end date of the leave period.
    // Last day of leave (inclusive).
    leaveEndDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'End date of the leave',
    },
    // 'leaveDays' field: total number of leave days.
    // Calculated from start and end dates, excluding weekends/holidays.
    // Decimal allows for half-day leaves (e.g., 0.5, 1.5).
    leaveDays: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      validate: {
        min: 0,  // Cannot be negative
      },
      comment: 'Total number of leave days',
    },
    // 'isHalfDay' field: indicates if this is a half-day leave.
    // True: Employee on leave for half the working day
    // False: Full day leave
    isHalfDay: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Flag indicating if it is a half-day leave',
    },
    // 'requestedDate' field: date and time when the leave was requested.
    // Used for tracking request submission time.
    requestedDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Date when the leave was requested',
    },
    // 'leaveApprovers' field: JSON containing approval chain.
    // Structure: [{approverId: "", role: "", status: "", date: "", comments: ""}]
    // Tracks each approver's decision through the approval workflow.
    leaveApprovers: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'JSON containing approver chain and their decisions',
    },
    // 'leaveApprovalStatus' field: current overall status of the leave request.
    // REQUESTED: Initial state, pending first approval
    // PENDING: Approved by some, awaiting further approvals
    // APPROVED: Fully approved, leave will be deducted
    // REJECTED: Rejected by an approver
    leaveApprovalStatus: {
      type: DataTypes.ENUM('REQUESTED', 'PENDING', 'APPROVED', 'REJECTED'),
      allowNull: false,
      defaultValue: 'REQUESTED',
      validate: {
        isIn: [['REQUESTED', 'PENDING', 'APPROVED', 'REJECTED']],
      },
      comment: 'Current approval status of the leave request',
    },
    // 'createdAt' field: stores the timestamp when the leave request was created.
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    // 'createdBy' field: identifier of the user who created the leave request.
    // Typically the employee themselves or HR on their behalf.
    createdBy: {
      type: DataTypes.STRING(40),
      allowNull: false,
      comment: 'User who created the leave request',
    },
    // 'updatedAt' field: stores the timestamp when the leave request was last updated.
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // 'updatedBy' field: identifier of the user who last updated the leave request.
    updatedBy: {
      type: DataTypes.STRING(40),
      allowNull: false,
      comment: 'User who last updated the leave request',
    },
  },
  {
    // Specify the table name in the database for this model.
    tableName: 'employee_leaves',
    // Pass the Sequelize instance that connects to the database.
    sequelize,
    // Disable Sequelize's automatic timestamp fields (createdAt, updatedAt)
    // since we're using custom fields (createdAt, updatedAt).
    timestamps: false,
    // Add indexes for better query performance
    indexes: [
      {
        fields: ['employeeId'],
        name: 'idx_leaves_employee_id',
      },
      {
        fields: ['leaveApprovalStatus'],
        name: 'idx_leaves_approval_status',
      },
      {
        fields: ['leaveStartDate', 'leaveEndDate'],
        name: 'idx_leaves_dates',
      },
      {
        fields: ['requestNumber'],
        name: 'idx_leaves_request_number',
      },
    ],
  }
);

export default Leave;
