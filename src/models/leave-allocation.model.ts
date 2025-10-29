import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../database';
import { LeaveAllocationAttributes, LeaveAllocationCreationAttributes } from '../types/models/leave-allocation.types';

/**
 * Leave Allocation Model
 * ----------------------
 * This model represents employee leave allocations in the Vodichron HRMS system.
 * It directly corresponds to the "employee_leave_allocation" table schema.
 * Tracks leave balances, allocations, and utilization for each employee per year.
 *
 * Fields:
 * - uuid: Unique identifier for the leave allocation record (VARCHAR 50, Primary Key).
 * - employeeId: Foreign key referencing the employees table (VARCHAR 50).
 * - year: Calendar year for the leave allocation (VARCHAR 4).
 * - leaveType: Type of leave (VARCHAR 50, e.g., "Casual", "Sick", "Earned").
 * - leavesApplied: Number of leaves applied/taken (DECIMAL 4,2).
 * - leavesAllocated: Total leaves allocated for the year (DECIMAL 4,2).
 * - leavesCarryForwarded: Leaves carried forward from previous year (DECIMAL 4,2).
 * 
 * Use Cases:
 * - Leave balance tracking
 * - Leave request validation
 * - Annual leave reports
 * - Carry-forward calculations
 */
class LeaveAllocation extends Model<LeaveAllocationAttributes, LeaveAllocationCreationAttributes> implements LeaveAllocationAttributes {
  public uuid!: string;                  // Unique identifier for the leave allocation record.
  public employeeId!: string;            // Foreign key referencing the employees table.
  public year!: string;                  // Calendar year for the leave allocation.
  public leaveType!: string;             // Type of leave.
  public leavesApplied!: number;         // Number of leaves applied/taken.
  public leavesAllocated!: number;       // Total leaves allocated for the year.
  public leavesCarryForwarded!: number;  // Leaves carried forward from previous year.
}

LeaveAllocation.init(
  {
    // 'uuid' field: a string (VARCHAR 50) that serves as the primary key.
    // Automatically generated using UUID v4 if not provided.
    uuid: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    // 'employeeId' field: foreign key referencing the employees table.
    // Links the leave allocation to a specific employee.
    employeeId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      references: {
        model: 'employees',
        key: 'uuid',
      },
      onDelete: 'CASCADE',  // Delete allocations when employee is deleted.
      onUpdate: 'CASCADE',  // Update employeeId when employee uuid changes.
      comment: 'Foreign key referencing the employee',
    },
    // 'year' field: calendar year for the leave allocation.
    // Format: "YYYY" (e.g., "2024", "2025")
    year: {
      type: DataTypes.STRING(4),
      allowNull: false,
      validate: {
        notEmpty: true,
        is: /^\d{4}$/,  // Validate year format (4 digits)
      },
      comment: 'Calendar year for the leave allocation',
    },
    // 'leaveType' field: type of leave for this allocation.
    // Examples: "Casual Leave", "Sick Leave", "Earned Leave", "Maternity Leave"
    // Should match values from master_data table.
    leaveType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
      comment: 'Type of leave',
    },
    // 'leavesApplied' field: number of leaves applied/taken by the employee.
    // Decimal allows for half-day leaves (e.g., 0.5, 1.5, 2.0)
    // Incremented when leave requests are approved.
    leavesApplied: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,  // Cannot be negative
      },
      comment: 'Number of leaves applied/taken',
    },
    // 'leavesAllocated' field: total leaves allocated for the year.
    // Set at the beginning of each year based on company policy.
    // Decimal allows for fractional allocations (e.g., 10.5 days)
    leavesAllocated: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,  // Cannot be negative
      },
      comment: 'Total leaves allocated for the year',
    },
    // 'leavesCarryForwarded' field: leaves carried forward from previous year.
    // Added to current year's allocation based on company carry-forward policy.
    // Decimal allows for fractional carry-forwards.
    leavesCarryForwarded: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,  // Cannot be negative
      },
      comment: 'Leaves carried forward from previous year',
    },
  },
  {
    // Specify the table name in the database for this model.
    tableName: 'employee_leave_allocation',
    // Pass the Sequelize instance that connects to the database.
    sequelize,
    // Disable Sequelize's automatic timestamp fields (createdAt, updatedAt)
    timestamps: false,
    // Add indexes for better query performance
    indexes: [
      {
        fields: ['employeeId'],
        name: 'idx_leave_allocation_employee_id',
      },
      {
        fields: ['year'],
        name: 'idx_leave_allocation_year',
      },
      {
        fields: ['employeeId', 'year', 'leaveType'],
        name: 'idx_leave_allocation_unique',
        unique: true,  // One allocation per employee, year, and leave type
      },
    ],
  }
);

export default LeaveAllocation;
