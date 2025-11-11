import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../../../database';
import {
  EmployeeExperienceAttributes,
  EmployeeExperienceCreationAttributes,
  ExperienceStatus,
} from '../types/employee-experience.types';

/**
 * Employee Experience Model
 * =========================
 * This model represents employee work experience records.
 * It directly corresponds to the 'employee_experience' table schema.
 * 
 * Contains work history information including:
 * - Experience status (Fresher/Experienced)
 * - Company name
 * - Position/Role
 * - Employment duration (start date, end date)
 * - Total experience (years and months)
 * - Links to parent employee record
 * - Audit trail (createdBy, updatedBy)
 * 
 * Relationships:
 * - Belongs to Employee (via employeeId foreign key)
 * 
 * Multiple experience records per employee are supported to accommodate:
 * - Previous employment history
 * - Current employment details
 * - Internships and contract work
 */
class EmployeeExperienceModel
  extends Model<EmployeeExperienceAttributes, EmployeeExperienceCreationAttributes>
  implements EmployeeExperienceAttributes
{
  // Primary key and foreign key
  public uuid!: string;                          // Unique identifier for the experience record.
  public employeeId!: string;                    // Foreign key reference to employees table.
  
  // Experience details
  public experienceStatus!: ExperienceStatus;    // Whether employee is fresher or experienced.
  public company!: string | null;                // Name of company/organization.
  public position!: string | null;               // Job title/position held.
  public startDate!: string | null;              // Employment start date (DD-MM-YYYY).
  public endDate!: string | null;                // Employment end date (DD-MM-YYYY or null if current).
  
  // Audit fields
  public createdAt!: Date;                       // Timestamp when the experience record was created.
  public createdBy!: string;                     // User who created the experience record.
  public updatedAt!: Date | null;                // Timestamp when the experience record was last updated.
  public updatedBy!: string;                     // User who last updated the experience record.
}

EmployeeExperienceModel.init(
  {
    // 'uuid' field: a string (VARCHAR 50) that serves as the primary key.
    // Automatically generated using UUID v4 if not provided.
    uuid: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      defaultValue: () => uuidv4(),
      comment: 'Unique identifier for the experience record',
    },
    
    // 'employeeId' field: foreign key reference to employees table.
    // Links this experience record to a specific employee.
    // Cascading delete ensures experience records are removed if employee is deleted.
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
    
    // 'experienceStatus' field: indicates if employee is fresher or experienced.
    // FRESHER: No prior work experience
    // EXPERIENCED: Has previous work experience
    experienceStatus: {
      type: DataTypes.ENUM('FRESHER', 'EXPERIENCED'),
      allowNull: false,
      validate: {
        isIn: {
          args: [['FRESHER', 'EXPERIENCED']],
          msg: 'Experience status must be either FRESHER or EXPERIENCED',
        },
      },
      comment: 'Whether employee is fresher or experienced',
    },
    
    // 'company' field: name of company or organization where employee worked.
    // Examples: "Google Inc.", "Vodichron Technologies", "Microsoft"
    // Null for freshers or when not applicable.
    company: {
      type: DataTypes.STRING(200),
      allowNull: true,
      validate: {
        len: {
          args: [2, 200],
          msg: 'Company name must be between 2 and 200 characters',
        },
      },
      comment: 'Name of company/organization',
    },
    
    // 'position' field: job title or role held at the company.
    // Examples: "Software Engineer", "Project Manager", "Data Analyst"
    // Null for freshers or when not applicable.
    position: {
      type: DataTypes.STRING(200),
      allowNull: true,
      validate: {
        len: {
          args: [2, 200],
          msg: 'Position must be between 2 and 200 characters',
        },
      },
      comment: 'Job title/position held',
    },
    
    // 'startDate' field: date when employment started.
    // Stored as string in DD-MM-YYYY format
    // Null for freshers or when not applicable.
    startDate: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Employment start date (DD-MM-YYYY)',
    },
    
    // 'endDate' field: date when employment ended.
    // Stored as string in DD-MM-YYYY format
    // Null for current employment or freshers.
    endDate: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Employment end date (DD-MM-YYYY or null if current)',
    },
    
    // 'createdAt' field: timestamp when the experience record was created.
    // Automatically set by Sequelize.
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Timestamp when the experience record was created',
    },
    
    // 'createdBy' field: user who created the experience record.
    // Stores the UUID of the user (admin/HR) who added this experience record.
    createdBy: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'User who created the experience record',
    },
    
    // 'updatedAt' field: timestamp when the experience record was last updated.
    // Automatically updated by Sequelize on record modification.
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when the experience record was last updated',
    },
    
    // 'updatedBy' field: user who last updated the experience record.
    // Stores the UUID of the user who most recently modified this record.
    updatedBy: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'User who last updated the experience record',
    },
  },
  {
    sequelize,
    tableName: 'employee_experience',
    timestamps: true,
    indexes: [
      {
        name: 'idx_employee_experience_employee_id',
        fields: ['employeeId'],
      },
      {
        name: 'idx_employee_experience_status',
        fields: ['experienceStatus'],
      },
    ],
    comment: 'Stores employee work experience and employment history',
  }
);

export default EmployeeExperienceModel;
