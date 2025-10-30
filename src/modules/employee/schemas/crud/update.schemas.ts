import { z } from 'zod';

/**
 * Update Employee Schema
 * ======================
 * Comprehensive Zod validation schema for updating existing employee
 * Based on old vodichron employeeController.patch (lines 232-300)
 * 
 * Key Features:
 * - All fields are optional (partial update support)
 * - UUID is required to identify the employee to update
 * - Password field is optional for password updates
 * - Same validation rules as create schema for provided fields
 * - Role-based field restrictions are enforced in service layer
 * 
 * Authorization Rules (enforced in service):
 * - HR/Super users can update all fields
 * - Regular employees can only update certain fields (not name, employeeId, CTC, etc.)
 */

/**
 * Update Employee Input Schema
 * -----------------------------
 * Validates fields for updating an existing employee record.
 * All fields are optional except uuid (to identify the employee).
 */
export const updateEmployeeSchema = z.object({
  // ============================================================================
  // REQUIRED FIELD - Employee Identifier
  // ============================================================================
  
  uuid: z.string().uuid('Employee UUID is required and must be valid'),
  
  // ============================================================================
  // OPTIONAL PASSWORD FIELD
  // ============================================================================
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .optional(),
  
  // ============================================================================
  // PERSONAL INFORMATION (All Optional)
  // ============================================================================
  
  name: z.string().min(1, 'Name is required')
    .regex(/^[a-zA-Z0-9 ._-]+$/, 'Name should only contain alphanumeric characters, hyphens, underscores, dots and spaces')
    .optional(),
  
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  
  dateOfBirth: z.string().optional().nullable(),
  
  contactNumber: z.string()
    .regex(/^[0-9]{10}$/, 'Enter valid 10-digit contact number')
    .optional(),
  
  personalEmail: z.string().email('Enter valid email address').optional(),
  
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
  // EMPLOYMENT INFORMATION (Optional - Some fields restricted by role)
  // ============================================================================
  
  employeeId: z.string()
    .regex(/^[a-zA-Z0-9]+$/, 'Employee ID should only contain alphanumeric characters')
    .optional(),
  
  officialEmailId: z.string().email('Enter valid email address').optional(),
  
  dateOfJoining: z.string().optional().nullable(),
  
  reportingManagerId: z.string()
    .uuid('Reporting manager must be a valid UUID')
    .optional()
    .nullable(),
  
  reportingDirectorId: z.string()
    .uuid('Reporting director must be a valid UUID')
    .optional()
    .nullable(),
  
  designation: z.string().optional().nullable(),
  
  department: z.string().optional().nullable(),
  
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
  employmentStatus: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

/**
 * TypeScript Type for Update Employee Input
 * ------------------------------------------
 * Inferred from Zod schema for type safety
 */
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
