import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../database';
import { EmployeeAttributes, EmployeeCreationAttributes } from '../types/models/employee.types';

/**
 * Employee Model
 * --------------
 * This model represents employees in the Vodichron HRMS system.
 * It directly corresponds to the 'employees' table schema.
 * Central entity storing comprehensive employee information.
 * 
 * Contains comprehensive employee information including:
 * - Personal details (name, gender, DOB, contact)
 * - Address information (permanent, temporary)
 * - Emergency contacts
 * - Employment details (employee ID, designation, department)
 * - Financial information (CTC, bank details, PAN, Aadhaar, PF)
 * - Professional information (skills, qualifications, experience)
 * - Document references (photographs, passbook images)
 * - Reporting hierarchy (manager, director)
 * 
 * Relationships:
 * - Has many Leave Requests
 * - Has many Timesheets
 * - Has many Resource Allocations
 * - Has one User Account
 * - Has many Documents
 * - Has many Preferences
 * - Self-referencing for reporting hierarchy
 */
class Employee extends Model<EmployeeAttributes, EmployeeCreationAttributes> implements EmployeeAttributes {
  public uuid!: string;                              // Unique identifier for the employee record.
  public name!: string;                              // Full name of the employee.
  public gender!: 'Male' | 'Female' | 'Other';       // Gender of the employee.
  public dateOfBirth!: Date | null;                  // Date of birth of the employee.
  public contactNumber!: string;                     // Primary contact phone number.
  public personalEmail!: string | null;              // Personal email address.
  public bloodGroup!: string | null;                 // Blood group (A+, B+, O+, etc.).
  public maritalStatus!: string | null;              // Marital status.
  public permanentAddress!: string | null;           // Permanent residential address.
  public temporaryAddress!: string | null;           // Current/temporary residential address.
  public emergencyContactNumber1Of!: string | null;  // Relationship of first emergency contact.
  public emergencyContactNumber1!: string | null;    // First emergency contact number.
  public emergencyContactNumber2Of!: string | null;  // Relationship of second emergency contact.
  public emergencyContactNumber2!: string | null;    // Second emergency contact number.
  public employeeId!: string | null;                 // Unique employee identification code.
  public officialEmailId!: string | null;            // Official company email address.
  public skills!: string | null;                     // Comma-separated skills list.
  public dateOfJoining!: Date | null;                // Date when employee joined the organization.
  public reportingManagerId!: string | null;         // UUID of reporting manager (self-reference).
  public reportingDirectorId!: string | null;        // UUID of reporting director (self-reference).
  public currentCtc!: string | null;                 // Current Cost to Company (salary package).
  public designation!: string | null;                // Job title/designation.
  public panCardNumber!: string | null;              // PAN card number (India tax identifier).
  public bankAccountNumber!: string | null;          // Bank account number for salary credit.
  public ifscCode!: string | null;                   // Bank IFSC code (India banking code).
  public aadhaarCardNumber!: string | null;          // Aadhaar card number (India ID number).
  public pfAccountNumber!: string | null;            // Provident Fund account number.
  public bankPassbookImage!: string | null;          // File path/URL to bank passbook image.
  public recentPhotograph!: string | null;           // File path/URL to recent photograph.
  public highestEducationalQualification!: string | null; // Highest degree obtained.
  public totalWorkExperience!: string | null;        // Total years of work experience.
  public department!: string | null;                 // Department/division.
  public linkedIn!: string | null;                   // LinkedIn profile URL.
  public createdAt!: Date;                           // Timestamp when the employee record was created.
  public createdBy!: string;                         // User who created the employee record.
  public updatedAt!: Date | null;                    // Timestamp when the employee record was last updated.
  public updatedBy!: string;                         // User who last updated the employee record.
  public employmentStatus!: 'ACTIVE' | 'INACTIVE';   // Current employment status.
}

Employee.init(
  {
    // 'uuid' field: a string (VARCHAR 50) that serves as the primary key.
    // Automatically generated using UUID v4 if not provided.
    uuid: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    // 'name' field: full name of the employee.
    // Should include first name, middle name (if any), and last name.
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100],
      },
      comment: 'Full name of the employee',
    },
    // 'gender' field: gender of the employee.
    // Options: Male, Female, Other
    gender: {
      type: DataTypes.ENUM('Male', 'Female', 'Other'),
      allowNull: false,
      validate: {
        isIn: [['Male', 'Female', 'Other']],
      },
      comment: 'Gender of the employee',
    },
    // 'dateOfBirth' field: date of birth of the employee.
    // Used for age calculation and birthday reminders.
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date of birth of the employee',
    },
    // 'contactNumber' field: primary contact phone number.
    // Should be a valid, reachable number for important communications.
    contactNumber: {
      type: DataTypes.STRING(15),
      allowNull: false,
      validate: {
        notEmpty: true,
        is: /^[+\d\s()-]*$/i,  // Allow phone number format with international prefix
      },
      comment: 'Primary contact phone number',
    },
    // 'personalEmail' field: personal email address of the employee.
    // Different from official email, used for personal communications.
    personalEmail: {
      type: DataTypes.STRING(200),
      allowNull: true,
      validate: {
        isEmail: true,
      },
      comment: 'Personal email address',
    },
    // 'bloodGroup' field: blood group of the employee.
    // Examples: A+, A-, B+, B-, O+, O-, AB+, AB-
    // Important for medical emergencies.
    bloodGroup: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'Blood group (A+, B+, O+, etc.)',
    },
    // 'maritalStatus' field: marital status of the employee.
    // Examples: Single, Married, Divorced, Widowed
    maritalStatus: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Marital status',
    },
    // 'permanentAddress' field: permanent residential address.
    // Used for official correspondence and background verification.
    permanentAddress: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Permanent residential address',
    },
    // 'temporaryAddress' field: current/temporary residential address.
    // Used when permanent address is different from current residence.
    temporaryAddress: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Current/temporary residential address',
    },
    // 'emergencyContactNumber1Of' field: relationship of first emergency contact.
    // Examples: Father, Mother, Spouse, Sibling, Friend
    emergencyContactNumber1Of: {
      type: DataTypes.STRING(30),
      allowNull: true,
      comment: 'Relationship of first emergency contact',
    },
    // 'emergencyContactNumber1' field: phone number of first emergency contact.
    // Critical for emergency situations.
    emergencyContactNumber1: {
      type: DataTypes.STRING(15),
      allowNull: true,
      validate: {
        is: /^[+\d\s()-]*$/i,
      },
      comment: 'First emergency contact number',
    },
    // 'emergencyContactNumber2Of' field: relationship of second emergency contact.
    // Provides a backup emergency contact.
    emergencyContactNumber2Of: {
      type: DataTypes.STRING(30),
      allowNull: true,
      comment: 'Relationship of second emergency contact',
    },
    // 'emergencyContactNumber2' field: phone number of second emergency contact.
    // Backup emergency contact number.
    emergencyContactNumber2: {
      type: DataTypes.STRING(15),
      allowNull: true,
      validate: {
        is: /^[+\d\s()-]*$/i,
      },
      comment: 'Second emergency contact number',
    },
    // 'employeeId' field: unique employee identification code.
    // Company-specific identifier (e.g., EMP001, TEC-2024-001).
    // Different from uuid which is database primary key.
    employeeId: {
      type: DataTypes.STRING(15),
      allowNull: true,
      comment: 'Unique employee identification code',
    },
    // 'officialEmailId' field: official company email address.
    // Used for all official communications and system access.
    officialEmailId: {
      type: DataTypes.STRING(200),
      allowNull: true,
      validate: {
        isEmail: true,
      },
      comment: 'Official company email address',
    },
    // 'skills' field: comma-separated or text list of employee skills.
    // Examples: "JavaScript, React, Node.js, SQL"
    // Used for resource allocation and project matching.
    skills: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Comma-separated skills list',
    },
    // 'dateOfJoining' field: date when employee joined the organization.
    // Used for tenure calculation and anniversary reminders.
    dateOfJoining: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date when employee joined the organization',
    },
    // 'reportingManagerId' field: UUID of direct reporting manager.
    // Self-referencing foreign key to employees table.
    // Defines organizational reporting hierarchy.
    reportingManagerId: {
      type: DataTypes.STRING(50),
      allowNull: true,
      references: {
        model: 'employees',
        key: 'uuid',
      },
      comment: 'UUID of reporting manager (self-reference)',
    },
    // 'reportingDirectorId' field: UUID of reporting director.
    // Self-referencing foreign key for higher-level reporting.
    reportingDirectorId: {
      type: DataTypes.STRING(50),
      allowNull: true,
      references: {
        model: 'employees',
        key: 'uuid',
      },
      comment: 'UUID of reporting director (self-reference)',
    },
    // 'currentCtc' field: Current Cost to Company (annual salary package).
    // Stored as string to accommodate various formats and currencies.
    currentCtc: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'Current Cost to Company (salary package)',
    },
    // 'designation' field: job title or designation of the employee.
    // Examples: "Software Engineer", "HR Manager", "Director - Operations"
    designation: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Job title/designation',
    },
    // 'panCardNumber' field: Permanent Account Number (India tax identifier).
    // Format: ABCDE1234F (5 letters, 4 digits, 1 letter)
    // Required for tax compliance in India.
    panCardNumber: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'PAN card number (India tax identifier)',
    },
    // 'bankAccountNumber' field: bank account number for salary credit.
    // Used for monthly salary disbursement.
    bankAccountNumber: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'Bank account number for salary credit',
    },
    // 'ifscCode' field: Indian Financial System Code.
    // 11-character code identifying bank branch.
    // Required for NEFT/RTGS transfers in India.
    ifscCode: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Bank IFSC code (India banking code)',
    },
    // 'aadhaarCardNumber' field: Aadhaar card number (India ID).
    // 12-digit unique identification number.
    // Used for identity verification and government compliance.
    aadhaarCardNumber: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'Aadhaar card number (India ID number)',
    },
    // 'pfAccountNumber' field: Provident Fund account number.
    // Employee retirement savings account.
    // Required for PF compliance.
    pfAccountNumber: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'Provident Fund account number',
    },
    // 'bankPassbookImage' field: file path/URL to bank passbook image.
    // Used for bank account verification.
    bankPassbookImage: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'File path/URL to bank passbook image',
    },
    // 'recentPhotograph' field: file path/URL to recent photograph.
    // Used for ID cards, directory, and profile pictures.
    recentPhotograph: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'File path/URL to recent photograph',
    },
    // 'highestEducationalQualification' field: highest degree obtained.
    // Examples: "B.Tech", "MBA", "M.Sc", "Ph.D"
    highestEducationalQualification: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'Highest degree obtained',
    },
    // 'totalWorkExperience' field: total years of work experience.
    // Format: "5 years" or "3.5 years"
    // Includes experience before joining current organization.
    totalWorkExperience: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Total years of work experience',
    },
    // 'department' field: department or division of the employee.
    // Examples: "Engineering", "Human Resources", "Sales", "Finance"
    department: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Department/division',
    },
    // 'linkedIn' field: LinkedIn profile URL.
    // Used for professional networking and profile verification.
    linkedIn: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isUrl: true,
      },
      comment: 'LinkedIn profile URL',
    },
    // 'createdAt' field: stores the timestamp when the employee record was created.
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    // 'createdBy' field: identifier of the user who created the employee record.
    // Typically HR personnel or system admin.
    createdBy: {
      type: DataTypes.STRING(40),
      allowNull: false,
      comment: 'User who created the employee record',
    },
    // 'updatedAt' field: stores the timestamp when the employee record was last updated.
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // 'updatedBy' field: identifier of the user who last updated the employee record.
    updatedBy: {
      type: DataTypes.STRING(40),
      allowNull: false,
      comment: 'User who last updated the employee record',
    },
    // 'employmentStatus' field: current employment status.
    // ACTIVE: Currently employed
    // INACTIVE: Resigned, terminated, or on extended leave
    employmentStatus: {
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE'),
      allowNull: false,
      defaultValue: 'ACTIVE',
      validate: {
        isIn: [['ACTIVE', 'INACTIVE']],
      },
      comment: 'Current employment status',
    },
  },
  {
    // Specify the table name in the database for this model.
    tableName: 'employees',
    // Pass the Sequelize instance that connects to the database.
    sequelize,
    // Disable Sequelize's automatic timestamp fields (createdAt, updatedAt)
    // since we're using custom fields (createdAt, updatedAt).
    timestamps: false,
    // Add indexes for better query performance
    indexes: [
      {
        fields: ['name'],
        name: 'idx_employees_name',
      },
      {
        fields: ['employeeId'],
        name: 'idx_employees_employee_id',
        unique: true,
      },
      {
        fields: ['officialEmailId'],
        name: 'idx_employees_official_email',
        unique: true,
      },
      {
        fields: ['employmentStatus'],
        name: 'idx_employees_employment_status',
      },
      {
        fields: ['department'],
        name: 'idx_employees_department',
      },
      {
        fields: ['designation'],
        name: 'idx_employees_designation',
      },
      {
        fields: ['reportingManagerId'],
        name: 'idx_employees_reporting_manager',
      },
      {
        fields: ['reportingDirectorId'],
        name: 'idx_employees_reporting_director',
      },
    ],
  }
);

export default Employee;
