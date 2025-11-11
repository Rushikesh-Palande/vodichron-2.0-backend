import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../../../database';
import {
  EmployeeEducationAttributes,
  EmployeeEducationCreationAttributes,
} from '../types/employee-education.types';

/**
 * Employee Education Model
 * ========================
 * This model represents employee educational background records.
 * It directly corresponds to the 'employee_education' table schema.
 * 
 * Contains educational qualification information including:
 * - Institution/University name
 * - Degree/Course pursued
 * - Start and end years
 * - Links to parent employee record
 * - Audit trail (createdBy, updatedBy)
 * 
 * Relationships:
 * - Belongs to Employee (via employeeId foreign key)
 * 
 * Multiple education records per employee are supported to accommodate:
 * - Multiple degrees (Bachelor's, Master's, PhD)
 * - Certifications
 * - Professional courses
 */
class EmployeeEducationModel
  extends Model<EmployeeEducationAttributes, EmployeeEducationCreationAttributes>
  implements EmployeeEducationAttributes
{
  // Primary key and foreign key
  public uuid!: string;              // Unique identifier for the education record.
  public employeeId!: string;        // Foreign key reference to employees table.
  
  // Educational details
  public institution!: string;       // Name of educational institution/university.
  public degreeCourse!: string;      // Degree or course name (e.g., B.Tech Computer Science).
  public startYear!: string;         // Year education started (YYYY format).
  public endYear!: string;           // Year education completed (YYYY format).
  
  // Audit fields
  public createdAt!: Date;           // Timestamp when the education record was created.
  public createdBy!: string;         // User who created the education record.
  public updatedAt!: Date | null;    // Timestamp when the education record was last updated.
  public updatedBy!: string;         // User who last updated the education record.
}

EmployeeEducationModel.init(
  {
    // 'uuid' field: a string (VARCHAR 50) that serves as the primary key.
    // Automatically generated using UUID v4 if not provided.
    uuid: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      defaultValue: () => uuidv4(),
      comment: 'Unique identifier for the education record',
    },
    
    // 'employeeId' field: foreign key reference to employees table.
    // Links this education record to a specific employee.
    // Cascading delete ensures education records are removed if employee is deleted.
    employeeId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      references: {
        model: 'employees',
        key: 'uuid',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      comment: 'Reference to employee UUID',
    },
    
    // 'institution' field: name of educational institution or university.
    // Examples: "IIT Delhi", "Stanford University", "MIT"
    institution: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Institution name cannot be empty',
        },
        len: {
          args: [2, 200],
          msg: 'Institution name must be between 2 and 200 characters',
        },
      },
      comment: 'Name of educational institution/university',
    },
    
    // 'degreeCourse' field: degree or course name.
    // Examples: "B.Tech Computer Science", "MBA Finance", "PhD in Physics"
    degreeCourse: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Degree/Course cannot be empty',
        },
        len: {
          args: [2, 200],
          msg: 'Degree/Course must be between 2 and 200 characters',
        },
      },
      comment: 'Degree or course name',
    },
    
    // 'startYear' field: year when education started.
    // Stored as 4-digit year string (e.g., "2015")
    startYear: {
      type: DataTypes.STRING(4),
      allowNull: false,
      validate: {
        is: {
          args: /^\d{4}$/,
          msg: 'Start year must be a 4-digit year (YYYY)',
        },
        isValidYear(value: string) {
          const year = parseInt(value, 10);
          const currentYear = new Date().getFullYear();
          if (year < 1950 || year > currentYear + 10) {
            throw new Error('Start year must be between 1950 and current year + 10');
          }
        },
      },
      comment: 'Year education started (YYYY format)',
    },
    
    // 'endYear' field: year when education was completed.
    // Stored as 4-digit year string (e.g., "2019")
    endYear: {
      type: DataTypes.STRING(4),
      allowNull: false,
      validate: {
        is: {
          args: /^\d{4}$/,
          msg: 'End year must be a 4-digit year (YYYY)',
        },
        isValidYear(value: string) {
          const year = parseInt(value, 10);
          const currentYear = new Date().getFullYear();
          if (year < 1950 || year > currentYear + 10) {
            throw new Error('End year must be between 1950 and current year + 10');
          }
        },
      },
      comment: 'Year education completed (YYYY format)',
    },
    
    // 'createdAt' field: timestamp when the education record was created.
    // Automatically set by Sequelize.
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Timestamp when the education record was created',
    },
    
    // 'createdBy' field: user who created the education record.
    // Stores the UUID of the user (admin/HR) who added this education record.
    createdBy: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'User who created the education record',
    },
    
    // 'updatedAt' field: timestamp when the education record was last updated.
    // Automatically updated by Sequelize on record modification.
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when the education record was last updated',
    },
    
    // 'updatedBy' field: user who last updated the education record.
    // Stores the UUID of the user who most recently modified this record.
    updatedBy: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'User who last updated the education record',
    },
  },
  {
    sequelize,
    tableName: 'employee_education',
    timestamps: true,
    indexes: [
      {
        name: 'idx_employee_education_employee_id',
        fields: ['employeeId'],
      },
    ],
    comment: 'Stores employee educational background information',
  }
);

export default EmployeeEducationModel;
