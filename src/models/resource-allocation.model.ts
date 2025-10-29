import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../database';
import { ResourceAllocationAttributes, ResourceAllocationCreationAttributes } from '../types/models/resource-allocation.types';

/**
 * Resource Allocation Model
 * -------------------------
 * This model represents employee allocations to customer projects in the Vodichron HRMS system.
 * It directly corresponds to the "project_resource_allocation" table schema.
 * Creates a many-to-many relationship between Employees, Projects, and Customers.
 *
 * Fields:
 * - uuid: Unique identifier for the allocation record (VARCHAR 50, Primary Key).
 * - allocationCode: Unique code for the allocation (VARCHAR 10).
 * - projectId: Foreign key referencing projects table (VARCHAR 50).
 * - customerId: Foreign key referencing customers table (VARCHAR 50).
 * - employeeId: Foreign key referencing employees table (VARCHAR 50).
 * - startDate: Start date of the resource allocation (DATE).
 * - endDate: End date of the resource allocation (DATE).
 * - role: Role of the employee in the project (VARCHAR 255).
 * - customerApprover: Flag indicating if employee is customer-side approver (TINYINT/BOOLEAN).
 * - status: Current status of the allocation (ENUM: ACTIVE, INACTIVE).
 * - createdBy: User who created the allocation record (VARCHAR 40).
 * - createdAt: Timestamp when the allocation was created.
 * - updatedBy: User who last updated the allocation record (VARCHAR 40).
 * - updatedAt: Timestamp when the allocation was last updated.
 * 
 * Relationships:
 * - Belongs to Project (many allocations to one project)
 * - Belongs to Customer (many allocations to one customer)
 * - Belongs to Employee (many allocations to one employee)
 * 
 * Constraints:
 * - Unique constraint on (projectId, customerId, employeeId) to prevent duplicate allocations
 */
class ResourceAllocation extends Model<ResourceAllocationAttributes, ResourceAllocationCreationAttributes> implements ResourceAllocationAttributes {
  public uuid!: string;
  public allocationCode!: string;
  public projectId!: string;
  public customerId!: string;
  public employeeId!: string;
  public startDate!: Date;
  public endDate!: Date;
  public role!: string;
  public customerApprover!: boolean | null;
  public status!: 'ACTIVE' | 'INACTIVE';
  public createdBy!: string;
  public createdAt!: Date;
  public updatedBy!: string;
  public updatedAt!: Date | null;
}

ResourceAllocation.init(
  {
    // 'uuid' field: a string (VARCHAR 50) that serves as the primary key.
    uuid: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    // 'allocationCode' field: unique code identifying this allocation.
    // Typically formatted as "PROJ{id}-EMP{id}" for easy identification.
    allocationCode: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
      comment: 'Unique code for the allocation',
    },
    // 'projectId' field: foreign key referencing the projects table.
    projectId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      references: {
        model: 'projects',
        key: 'uuid',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      comment: 'Foreign key referencing the project',
    },
    // 'customerId' field: foreign key referencing the customers table.
    customerId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      references: {
        model: 'customers',
        key: 'uuid',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      comment: 'Foreign key referencing the customer',
    },
    // 'employeeId' field: foreign key referencing the employees table.
    employeeId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      references: {
        model: 'employees',
        key: 'uuid',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      comment: 'Foreign key referencing the employee',
    },
    // 'startDate' field: date when the employee starts working on the project.
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Start date of the resource allocation',
    },
    // 'endDate' field: date when the employee's work on the project ends.
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'End date of the resource allocation',
    },
    // 'role' field: role/position of the employee in the project.
    // Examples: "Senior Developer", "Tech Lead", "QA Engineer", "Project Manager"
    role: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
      comment: 'Role of the employee in the project',
    },
    // 'customerApprover' field: indicates if the employee has approval authority for customer.
    // Used in timesheet and leave approval workflows involving customer sign-off.
    customerApprover: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      comment: 'Flag indicating if employee is a customer-side approver',
    },
    // 'status' field: current status of the resource allocation.
    // ACTIVE: Employee is currently allocated to the project
    // INACTIVE: Allocation has ended or been cancelled
    status: {
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE'),
      allowNull: false,
      defaultValue: 'ACTIVE',
      validate: {
        isIn: [['ACTIVE', 'INACTIVE']],
      },
      comment: 'Current status of the allocation',
    },
    // 'createdBy' field: identifier of the user who created the allocation.
    createdBy: {
      type: DataTypes.STRING(40),
      allowNull: false,
      comment: 'User who created the allocation record',
    },
    // 'createdAt' field: stores the timestamp when the allocation was created.
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    // 'updatedBy' field: identifier of the user who last updated the allocation.
    updatedBy: {
      type: DataTypes.STRING(40),
      allowNull: false,
      comment: 'User who last updated the allocation record',
    },
    // 'updatedAt' field: stores the timestamp when the allocation was last updated.
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    // Specify the table name in the database for this model.
    tableName: 'project_resource_allocation',
    // Pass the Sequelize instance that connects to the database.
    sequelize,
    // Disable Sequelize's automatic timestamp fields.
    timestamps: false,
    // Add indexes for better query performance
    indexes: [
      {
        fields: ['projectId', 'customerId', 'employeeId'],
        name: 'idx_resource_allocation_unique',
        unique: true,  // Enforce unique constraint
      },
      {
        fields: ['projectId'],
        name: 'idx_resource_allocation_project_id',
      },
      {
        fields: ['customerId'],
        name: 'idx_resource_allocation_customer_id',
      },
      {
        fields: ['employeeId'],
        name: 'idx_resource_allocation_employee_id',
      },
      {
        fields: ['status'],
        name: 'idx_resource_allocation_status',
      },
      {
        fields: ['startDate', 'endDate'],
        name: 'idx_resource_allocation_dates',
      },
    ],
  }
);

export default ResourceAllocation;
