/**
 * Seed Data Constants
 * ===================
 * Contains default/initial data for seeding the database.
 * Used during application startup to ensure essential records exist.
 */

/**
 * Default Super User Employee
 * ---------------------------
 * Initial employee record for the super user account.
 * This employee record is created during system initialization.
 */
export const DEFAULT_SUPER_USER_EMPLOYEE = {
  uuid: '5bebf1b8-f149-62js-87h3-52540245096b',
  name: 'Rushikesh Palande',
  gender: 'Male' as const,
  dateOfBirth: '1990-01-01',
  contactNumber: '+919876543210',
  personalEmail: 'rushikesh@embedsquare.com',
  bloodGroup: 'O+',
  maritalStatus: 'Single',
  permanentAddress: 'Pune, Maharashtra, India',
  temporaryAddress: 'Pune, Maharashtra, India',
  emergencyContactNumber1Of: '',
  emergencyContactNumber1: '',
  emergencyContactNumber2Of: '',
  emergencyContactNumber2: '',
  employeeId: '0000001',
  officialEmailId: 'rushikesh@embedsquare.com',
  skills: 'System Administration, Management',
  dateOfJoining: '2024-01-01',
  reportingManagerId: null,
  reportingDirectorId: null,
  currentCtc: '1000000',
  designation: 'Super Administrator',
  panCardNumber: 'ABCDE1234F',
  bankAccountNumber: '1234567890',
  ifscCode: 'SBIN0000001',
  aadhaarCardNumber: '123456789012',
  pfAccountNumber: '',
  bankPassbookImage: '',
  recentPhotograph: '',
  highestEducationalQualification: 'Bachelor of Engineering',
  totalWorkExperience: '5 years',
  department: 'Administration',
  linkedIn: null,
  createdBy: 'system',
  updatedBy: 'system',
  employmentStatus: 'ACTIVE' as const,
};

/**
 * Default Super User Account
 * --------------------------
 * Initial super user account for system access.
 * Credentials:
 *   Email: rushikesh@embedsquare.com
 *   Password: Embed@123 (will be hashed during seeding)
 * 
 * IMPORTANT: Change this password immediately after first login in production!
 */
export const DEFAULT_SUPER_USER = {
  uuid: 'xxebebb8-f749-11ed-97a3-52540145056b',
  employeeId: '5bebf1b8-f149-62js-87h3-52540245096b',
  role: 'super_user' as const,
  plainPassword: 'Embed@123', // This will be hashed in the helper
  status: 'ACTIVE' as const,
  createdBy: 'system',
  updatedBy: 'system',
  isSystemGenerated: false,
  lastLogin: null,
};

/**
 * System User Identifier
 * ----------------------
 * Used in createdBy/updatedBy fields for system-generated records
 */
export const SYSTEM_USER = 'system';
