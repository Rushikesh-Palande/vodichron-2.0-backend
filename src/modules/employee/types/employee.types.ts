/**
 * Employee Module - Type Definitions
 * ==================================
 * 
 * This file contains all TypeScript type definitions and interfaces
 * for the employee module in the Vodichron HRMS system.
 * 
 * It includes:
 * - Employee entity interfaces
 * - Employee with manager/director details
 * - Online status enums
 * - Filter interfaces
 * - Request/Response types
 * 
 * These types ensure type safety across the employee module and
 * provide clear documentation of data structures.
 */

/**
 * Online Status Enum
 * ------------------
 * Represents the online/offline status of an employee in the system.
 */
export enum OnlineStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  AWAY = 'AWAY',
}

/**
 * Application User Role Enum
 * --------------------------
 * Represents different user roles in the system for authorization.
 * Values match database role column format (snake_case).
 */
export enum ApplicationUserRole {
  superUser = 'super_user',
  admin = 'admin',
  hr = 'hr',
  manager = 'manager',
  director = 'director',
  employee = 'employee',
  customer = 'customer',
}

/**
 * Employee Interface
 * -----------------
 * Core employee entity representing a single employee record.
 * Maps directly to the employees table in the database.
 */
export interface Employee {
  uuid: string;
  name: string;
  gender: 'Male' | 'Female' | 'Other';
  dateOfBirth: string | null;
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
  dateOfJoining: string | null;
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
 * Employee With Manager Detail Interface
 * --------------------------------------
 * Extended employee interface that includes additional computed fields
 * from JOIN operations:
 * - Manager details (name and email)
 * - Director details (name and email)
 * - User role from application_users table
 * - Online status from employee_online_status table
 */
export interface EmployeeWithManagerDetail extends Employee {
  role?: string;
  managerDetail?: string | null;
  directorDetail?: string | null;
  onlineStatus: OnlineStatus;
}

/**
 * Get Employee By ID Request
 * --------------------------
 * Request parameters for fetching employee by ID.
 */
export interface GetEmployeeByIdRequest {
  employeeId: string;
}

/**
 * Get Employee By ID Response
 * ---------------------------
 * Response structure for employee profile data.
 * Returns the employee with manager details and decrypted sensitive fields.
 */
export interface GetEmployeeByIdResponse {
  employee: EmployeeWithManagerDetail;
}
