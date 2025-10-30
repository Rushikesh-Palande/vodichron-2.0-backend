import { z } from 'zod';

/**
 * Create Employee Schema
 * ======================
 * Comprehensive Zod validation schema for creating a new employee
 * Replaces the old EmployeeFormValidation with type-safe Zod validation
 * 
 * Validation Rules:
 * - Personal information validation (name, gender, DOB, contact)
 * - Email format validation (personal and official)
 * - Employment details validation (employee ID, designation, department)
 * - Manager/Director assignment validation
 * - Financial information validation (PAN, Aadhaar, Bank Account)
 * - Optional fields with conditional validation
 */

/**
 * Create Employee Input Schema
 * -----------------------------
 * Validates all fields required for creating a new employee record
 */
export const createEmployeeSchema = z.object({
  // ============================================================================
  // PERSONAL INFORMATION (Required Fields)
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
  // PERSONAL DETAILS (Optional Fields)
  // ============================================================================
  
  bloodGroup: z.string().optional().nullable(),
  maritalStatus: z.string().optional().nullable(),
  
  permanentAddress: z.string()
    .min(15, 'Permanent address must be at least 15 characters')
    .optional()
    .nullable(),
  
  temporaryAddress: z.string()
    .min(15, 'Temporary address must be at least 15 characters')
    .optional()
    .nullable(),
  
  // ============================================================================
  // EMERGENCY CONTACTS
  // ============================================================================
  
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
  // EMPLOYMENT INFORMATION (Required Fields)
  // ============================================================================
  
  employeeId: z.string().min(1, 'Employee ID is required')
    .regex(/^[a-zA-Z0-9]+$/, 'Employee ID should only contain alphanumeric characters'),
  
  officialEmailId: z.string().min(1, 'Official email is required').email('Enter valid email address'),
  
  dateOfJoining: z.string().min(1, 'Date of joining is required'),
  
  reportingManagerId: z.string().min(1, 'Reporting manager is required').uuid('Reporting manager must be a valid UUID'),
  
  reportingDirectorId: z.string()
    .uuid('Reporting director must be a valid UUID')
    .optional()
    .nullable(),
  
  designation: z.string().min(1, 'Designation is required'),
  
  department: z.string().min(1, 'Department is required'),
  
  currentCtc: z.string().optional().nullable(),
  skills: z.string().optional().nullable(),
  
  // ============================================================================
  // EDUCATION & EXPERIENCE
  // ============================================================================
  
  highestEducationalQualification: z.string().optional().nullable(),
  totalWorkExperience: z.string().optional().nullable(),
  linkedIn: z.string().url('Enter valid LinkedIn URL').optional().or(z.literal('')).nullable(),
  
  // ============================================================================
  // FINANCIAL INFORMATION
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
  // OTHER FIELDS
  // ============================================================================
  
  bankPassbookImage: z.string().optional().nullable(),
  recentPhotograph: z.string().optional().nullable(),
  employmentStatus: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
});

/**
 * TypeScript Type for Create Employee Input
 * ------------------------------------------
 * Inferred from Zod schema for type safety
 */
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
