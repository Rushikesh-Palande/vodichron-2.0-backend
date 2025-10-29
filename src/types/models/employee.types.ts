import { Optional } from 'sequelize';

/**
 * Employee Attributes Interface
 * -----------------------------
 * Defines the structure of an Employee record in the database
 */
export interface EmployeeAttributes {
  uuid: string;
  name: string;
  gender: 'Male' | 'Female' | 'Other';
  dateOfBirth: Date | null;
  contactNumber: string;
  personalEmail: string | null;
  bloodGroup: string | null;
  maritalStatus: string | null;
  permanentAddress: string | null;
  temporaryAddress: string | null;
  emergencyContactNumber1Of: string | null;
  emergencyContactNumber1: string | null;
  emergencyContactNumber2Of: string | null;
  emergencyContactNumber2: string | null;
  employeeId: string | null;
  officialEmailId: string | null;
  skills: string | null;
  dateOfJoining: Date | null;
  reportingManagerId: string | null;
  reportingDirectorId: string | null;
  currentCtc: string | null;
  designation: string | null;
  panCardNumber: string | null;
  bankAccountNumber: string | null;
  ifscCode: string | null;
  aadhaarCardNumber: string | null;
  pfAccountNumber: string | null;
  bankPassbookImage: string | null;
  recentPhotograph: string | null;
  highestEducationalQualification: string | null;
  totalWorkExperience: string | null;
  department: string | null;
  linkedIn: string | null;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date | null;
  updatedBy: string;
  employmentStatus: 'ACTIVE' | 'INACTIVE';
}

/**
 * Employee Creation Attributes Interface
 * --------------------------------------
 * Defines which fields are optional when creating a new Employee
 */
export interface EmployeeCreationAttributes
  extends Optional<
    EmployeeAttributes,
    | 'uuid'
    | 'dateOfBirth'
    | 'personalEmail'
    | 'bloodGroup'
    | 'maritalStatus'
    | 'permanentAddress'
    | 'temporaryAddress'
    | 'emergencyContactNumber1Of'
    | 'emergencyContactNumber1'
    | 'emergencyContactNumber2Of'
    | 'emergencyContactNumber2'
    | 'employeeId'
    | 'officialEmailId'
    | 'skills'
    | 'dateOfJoining'
    | 'reportingManagerId'
    | 'reportingDirectorId'
    | 'currentCtc'
    | 'designation'
    | 'panCardNumber'
    | 'bankAccountNumber'
    | 'ifscCode'
    | 'aadhaarCardNumber'
    | 'pfAccountNumber'
    | 'bankPassbookImage'
    | 'recentPhotograph'
    | 'highestEducationalQualification'
    | 'totalWorkExperience'
    | 'department'
    | 'linkedIn'
    | 'createdAt'
    | 'updatedAt'
    | 'employmentStatus'
  > {}
