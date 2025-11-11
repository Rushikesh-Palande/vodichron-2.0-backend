import { z } from 'zod';

/**
 * Unified Employee Registration Schema
 * =====================================
 * Combines employee creation and user registration in one atomic operation
 * Used by the frontend unified registration page (6 tabs including Grant Access)
 * 
 * This schema extends createEmployeeSchema with user registration fields:
 * - role: User role for application access
 * - password: User password
 * - confirmPassword: Password confirmation
 */

/**
 * Password validation regex from old backend
 * Minimum eight characters, at least one uppercase letter, one lowercase letter, one number and one special character
 */
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

/**
 * Map frontend role values to backend enum values
 * Frontend: 'Super Users', 'HR Executive', 'Employee', 'Manager', 'Director'
 * Backend: 'super_user', 'hr', 'employee', 'manager', 'director'
 */
export const UserRoleMapping = {
  'Super Users': 'super_user',
  'HR Executive': 'hr',
  'Employee': 'employee',
  'Manager': 'manager',
  'Director': 'director',
} as const;

/**
 * Unified Employee Registration Input Schema
 * -------------------------------------------
 * Combines all employee fields (Tabs 1-5) + user registration fields (Tab 6)
 */
export const unifiedRegisterSchema = z.object({
  // ============================================================================
  // PERSONAL INFORMATION (Tab 1 - Required Fields)
  // ============================================================================
  
  name: z.string().min(1, 'Name is required')
    .regex(/^[a-zA-Z0-9 ._-]+$/, 'Name should only contain alphanumeric characters, hyphens, underscores, dots and spaces'),
  
  gender: z.enum(['Male', 'Female', 'Other']),
  
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  
  contactNumber: z.string()
    .min(1, 'Contact number is required')
    .regex(/^[0-9]{10}$/, 'Enter valid 10-digit contact number'),
  
  personalEmail: z.string().min(1, 'Personal email is required').email('Enter valid email address'),
  
  // ============================================================================
  // PERSONAL DETAILS (Tab 1 - Optional Fields)
  // ============================================================================
  
  bloodGroup: z.string().optional().nullable(),
  maritalStatus: z.string().optional().nullable(),
  
  // ============================================================================
  // CONTACT INFORMATION (Tab 2)
  // ============================================================================
  
  permanentAddress: z.string()
    .min(15, 'Permanent address must be at least 15 characters')
    .optional()
    .nullable(),
  
  temporaryAddress: z.string()
    .min(15, 'Temporary address must be at least 15 characters')
    .optional()
    .nullable(),
  
  emergencyContactNumber1Of: z.string().optional().nullable(),
  emergencyContactNumber1: z.string()
    .regex(/^[0-9]{10}$/, 'Enter valid 10-digit contact number')
    .optional()
    .nullable(),
  
  emergencyContactNumber2Of: z.string().optional().nullable(),
  emergencyContactNumber2: z.string()
    .regex(/^[0-9]{10}$/, 'Enter valid 10-digit contact number')
    .optional()
    .nullable(),
  
  // ============================================================================
  // EDUCATION & EXPERIENCE (Tab 3)
  // ============================================================================
  
  education: z.array(z.object({
    institution: z.string().min(2),
    degreeCourse: z.string().min(2),
    startYear: z.string().regex(/^\d{4}$/),
    endYear: z.string().regex(/^\d{4}$/),
  })).optional().default([]),
  
  experience: z.array(z.object({
    experienceStatus: z.enum(['FRESHER', 'EXPERIENCED']),
    company: z.string().optional().nullable(),
    position: z.string().optional().nullable(),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
  })).optional().default([]),
  
  highestEducationalQualification: z.string().optional().nullable(),
  totalWorkExperience: z.string().optional().nullable(),
  
  // ============================================================================
  // EMPLOYMENT INFORMATION (Tab 4 - Required Fields)
  // ============================================================================
  
  employeeId: z.string().min(1, 'Employee ID is required')
    .regex(/^[a-zA-Z0-9]+$/, 'Employee ID should only contain alphanumeric characters'),
  
  officialEmailId: z.string().min(1, 'Official email is required').email('Enter valid email address'),
  
  dateOfJoining: z.string().min(1, 'Date of joining is required'),
  
  reportingManagerId: z.union([
    z.string().uuid('Reporting manager must be a valid UUID'),
    z.null(),
  ]).optional(),
  
  reportingDirectorId: z.union([
    z.string().uuid('Reporting director must be a valid UUID'),
    z.null(),
  ]).optional(),
  
  designation: z.string().min(1, 'Designation is required'),
  
  department: z.string().min(1, 'Department is required'),
  
  currentCtc: z.string().optional().nullable(),
  skills: z.string().optional().nullable(),
  linkedIn: z.string().url('Enter valid LinkedIn URL').optional().or(z.literal('')).nullable(),
  
  // ============================================================================
  // FINANCIAL INFORMATION (Tab 5)
  // ============================================================================
  
  panCardNumber: z.string()
    .regex(/^[a-zA-Z0-9]+$/, 'PAN number should only contain alphanumeric characters')
    .length(10, 'PAN number should be exactly 10 characters')
    .optional()
    .nullable(),
  
  bankAccountNumber: z.string()
    .regex(/^[0-9]+$/, 'Bank account number should be numbers only')
    .min(5, 'Bank account number must be at least 5 digits')
    .max(20, 'Bank account number must be at most 20 digits')
    .optional()
    .nullable(),
  
  ifscCode: z.string()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Enter valid IFSC code (e.g., SBIN0001234)')
    .optional()
    .or(z.literal(''))
    .nullable(),
  
  aadhaarCardNumber: z.string()
    .regex(/^[0-9]{12}$/, 'Aadhaar number should be exactly 12 digits')
    .optional()
    .nullable(),
  
  pfAccountNumber: z.string()
    .regex(/^[0-9]+$/, 'PF account number should be numbers only')
    .min(5, 'PF account number must be at least 5 digits')
    .max(20, 'PF account number must be at most 20 digits')
    .optional()
    .nullable(),
  
  // ============================================================================
  // GRANT ACCESS - USER REGISTRATION (Tab 6)
  // ============================================================================
  
  role: z.enum(['Super Users', 'HR Executive', 'Employee', 'Manager', 'Director'], {
    message: 'Please select a role',
  }),
  
  password: z
    .string()
    .min(8, 'Password must be minimum eight characters')
    .regex(
      PASSWORD_REGEX,
      'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
    ),
  
  confirmPassword: z.string().optional(),
  
  // ============================================================================
  // OTHER FIELDS
  // ============================================================================
  
  bankPassbookImage: z.string().optional().nullable(),
  recentPhotograph: z.string().optional().nullable(),
  employmentStatus: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
}).refine((data) => !data.confirmPassword || data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

/**
 * TypeScript Type for Unified Registration Input
 * -----------------------------------------------
 * Inferred from Zod schema for type safety
 */
export type UnifiedRegisterInput = z.infer<typeof unifiedRegisterSchema>;

/**
 * Unified Registration Output Schema
 * -----------------------------------
 * Response format including both employee and user UUIDs
 */
export const unifiedRegisterOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    employeeUuid: z.string().uuid(),
    userUuid: z.string().uuid(),
  }),
  timestamp: z.string(),
});

export type UnifiedRegisterOutput = z.infer<typeof unifiedRegisterOutputSchema>;
