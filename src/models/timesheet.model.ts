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
  
  // Task Identification
  public taskId!: string | null;                            // Task identifier (e.g., TASK001).
  
  // Project/Client Information
  public customer!: string | null;                          // Customer/client name.
  public project!: string | null;                           // Project name.
  public manager!: string | null;                           // Manager/Lead name.
  
  // Task Details
  public taskBrief!: string | null;                         // Task description.
  public taskStatus!: 'Not Started' | 'In Progress' | 'Completed' | 'On Hold' | null; // Task status.
  public responsible!: string | null;                       // Person responsible.
  
  // Date Tracking
  public plannedStartDate!: Date | null;                    // Planned start date.
  public plannedEndDate!: Date | null;                      // Planned end date.
  public actualStartDate!: Date | null;                     // Actual start date.
  public actualEndDate!: Date | null;                       // Actual end date.
  
  // Progress Tracking
  public completionPercentage!: number | null;              // Progress percentage (0-100).
  public remarks!: string | null;                           // Additional notes.
  public reasonForDelay!: string | null;                    // Delay explanation.
  
  // Time Tracking
  public taskHours!: string | null;                         // Hours for this task (HH:MM format).
  public taskDetails!: any;                                 // JSON containing task descriptions and hours (legacy).
  public totalHours!: number;                               // Total hours worked on the date.
  
  // Approval Workflow
  public approvalStatus!: 'REQUESTED' | 'APPROVED' | 'REJECTED'; // Current approval status.
  public approverId!: string | null;                        // User ID of the approver.
  public approvalDate!: Date | null;                        // Date when timesheet was approved/rejected.
  public approverComments!: string | null;                  // Comments from the approver.
  
  // Audit Fields
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
    
    // ====================================================================================
    // TASK IDENTIFICATION
    // ====================================================================================
    // 'taskId' field: unique identifier for the task (e.g., TASK001, TASK002).
    // Used for task tracking and reference across the organization.
    taskId: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Task identifier (e.g., TASK001)',
    },
    
    // ====================================================================================
    // PROJECT/CLIENT INFORMATION
    // ====================================================================================
    // 'customer' field: name of the customer or client for whom the task is performed.
    // Used for billing and client reporting.
    customer: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Customer/client name',
    },
    // 'project' field: name of the project the task belongs to.
    // Links tasks to specific projects for tracking and reporting.
    project: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Project name',
    },
    // 'manager' field: name of the manager or lead overseeing the task.
    // Used for escalation and approval workflows.
    manager: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Manager/Lead name',
    },
    
    // ====================================================================================
    // TASK DETAILS
    // ====================================================================================
    // 'taskBrief' field: detailed description of the task.
    // Provides context and specifications for the work performed.
    taskBrief: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Task description',
    },
    // 'taskStatus' field: current status of the task.
    // Tracks task progress through its lifecycle.
    taskStatus: {
      type: DataTypes.ENUM('Not Started', 'In Progress', 'Completed', 'On Hold'),
      allowNull: true,
      validate: {
        isIn: [['Not Started', 'In Progress', 'Completed', 'On Hold']],
      },
      comment: 'Current status of the task',
    },
    // 'responsible' field: name of the person responsible for completing the task.
    // May be different from the employee submitting the timesheet.
    responsible: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Person responsible for the task',
    },
    
    // ====================================================================================
    // DATE TRACKING
    // ====================================================================================
    // 'plannedStartDate' field: originally planned start date for the task.
    // Used for project planning and deadline tracking.
    plannedStartDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Planned start date',
    },
    // 'plannedEndDate' field: originally planned completion date for the task.
    // Used for deadline management and schedule tracking.
    plannedEndDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Planned end date',
    },
    // 'actualStartDate' field: actual date when work on the task began.
    // Used for analyzing scheduling accuracy and delays.
    actualStartDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Actual start date',
    },
    // 'actualEndDate' field: actual date when the task was completed.
    // Used for completion tracking and timeline analysis.
    actualEndDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Actual end date',
    },
    
    // ====================================================================================
    // PROGRESS TRACKING
    // ====================================================================================
    // 'completionPercentage' field: percentage of task completion (0-100).
    // Provides quantitative progress tracking.
    completionPercentage: {
      type: DataTypes.TINYINT,
      allowNull: true,
      validate: {
        min: 0,
        max: 100,
      },
      comment: 'Task completion percentage (0-100)',
    },
    // 'remarks' field: additional notes or comments about the task.
    // Provides context, updates, or important information.
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Additional notes or comments',
    },
    // 'reasonForDelay' field: explanation if the task is delayed.
    // Documents reasons for schedule slippage.
    reasonForDelay: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Explanation for task delay',
    },
    
    // ====================================================================================
    // TIME TRACKING
    // ====================================================================================
    // 'taskHours' field: time spent on this specific task in HH:MM format.
    // Tracks individual task time allocation.
    taskHours: {
      type: DataTypes.STRING(10),
      allowNull: true,
      validate: {
        is: /^[0-9]{1,2}:[0-5][0-9]$/i, // Format: HH:MM or H:MM
      },
      comment: 'Time spent on task (HH:MM format)',
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
      // Removed unique constraint - multiple tasks can exist for the same date
      // Each task gets a unique taskId (TASK001, TASK002, etc.)
      {
        fields: ['employeeId', 'timesheetDate'],
        name: 'idx_timesheets_employee_date',
      },
    ],
  }
);

export default Timesheet;
