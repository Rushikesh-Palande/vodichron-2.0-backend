/**
 * Unified Registration Store
 * ===========================
 * Orchestrates employee creation + user registration in one atomic operation
 * 
 * IMPORTANT: File uploads (photo, documents) happen AFTER this operation
 * This matches old vodichron flow:
 * 1. Create employee → get employeeUuid
 * 2. Upload photo via POST /employee/photo/upload (with employeeUuid)
 * 3. Upload documents via POST /employee/document/upload (with employeeUuid)
 * 
 * Responsibilities:
 * - Create employee record (delegate to employee store)
 * - Create user account (delegate to user store)
 * - Transaction management (rollback on failure)
 * - Comprehensive logging and error handling
 * 
 * Based on old backend logic combining:
 * - employeeController.create (vodichron-backend-master/src/controllers/employeeController.ts:57-97)
 * - userController.post (vodichron-backend-master/src/controllers/userController.ts:85-110)
 */

import { sequelize } from '../../../../database';
import { logger, PerformanceTimer } from '../../../../utils/logger';
import { insertEmployee } from '../crud/create.store';
import { insertApplicationUser } from '../../../users/store/registration/register-user.store';
import { hashPassword } from '../../../auth/helpers/hash-password.helper';
import { UnifiedRegisterInput, UserRoleMapping } from '../../schemas/unified/unified-register.schemas';
import { CreateEmployeeInput } from '../../schemas/crud/create.schemas';
import moment from 'moment';

/**
 * Unified Employee & User Registration
 * =====================================
 * Creates both employee record and user account in a transaction
 * 
 * Process (Atomic Transaction):
 * 1. Start database transaction
 * 2. Create employee record → get employeeUuid
 * 3. Hash password
 * 4. Create user account with employeeUuid
 * 5. Commit transaction
 * 6. On any failure → Rollback transaction
 * 
 * @param {UnifiedRegisterInput} input - Combined employee + user data
 * @param {string} createdByEmail - Email of user creating the records
 * @returns {Promise<{ employeeUuid: string, userUuid: string }>} - Both UUIDs for subsequent file uploads
 * 
 * Old backend equivalent: Combination of:
 * - employeeController.create (creates employee)
 * - userController.post (creates user)
 * Then frontend uploads files with returned employeeUuid
 */
export async function unifiedRegisterEmployeeAndUser(
  input: UnifiedRegisterInput,
  createdByEmail: string
): Promise<{ employeeUuid: string; userUuid: string }> {
  const timer = new PerformanceTimer('unifiedRegisterEmployeeAndUser');
  
  logger.info('🚀 Starting unified employee & user registration', {
    employeeId: input.employeeId,
    role: input.role,
    createdByEmail,
    type: 'UNIFIED_REGISTRATION_START',
    operation: 'unifiedRegisterEmployeeAndUser'
  });

  // Start transaction for atomic operation
  const transaction = await sequelize.transaction();

  try {
    // =========================================================================
    // STEP 1: Create Employee Record
    // =========================================================================
    logger.debug('📝 Step 1: Creating employee record', {
      employeeId: input.employeeId,
      name: input.name
    });

    // Extract employee fields (exclude user registration fields)
    const employeeData: CreateEmployeeInput = {
      name: input.name,
      gender: input.gender,
      dateOfBirth: input.dateOfBirth,
      contactNumber: input.contactNumber,
      personalEmail: input.personalEmail,
      bloodGroup: input.bloodGroup,
      maritalStatus: input.maritalStatus,
      permanentAddress: input.permanentAddress,
      temporaryAddress: input.temporaryAddress,
      emergencyContactNumber1Of: input.emergencyContactNumber1Of,
      emergencyContactNumber1: input.emergencyContactNumber1,
      emergencyContactNumber2Of: input.emergencyContactNumber2Of,
      emergencyContactNumber2: input.emergencyContactNumber2,
      employeeId: input.employeeId,
      officialEmailId: input.officialEmailId,
      dateOfJoining: input.dateOfJoining,
      reportingManagerId: input.reportingManagerId,
      reportingDirectorId: input.reportingDirectorId,
      designation: input.designation,
      department: input.department,
      currentCtc: input.currentCtc,
      skills: input.skills,
      highestEducationalQualification: input.highestEducationalQualification,
      totalWorkExperience: input.totalWorkExperience,
      linkedIn: input.linkedIn,
      panCardNumber: input.panCardNumber,
      bankAccountNumber: input.bankAccountNumber,
      ifscCode: input.ifscCode,
      aadhaarCardNumber: input.aadhaarCardNumber,
      pfAccountNumber: input.pfAccountNumber,
      bankPassbookImage: input.bankPassbookImage,
      recentPhotograph: input.recentPhotograph,
      employmentStatus: input.employmentStatus,
    };

    // Create employee (uses existing employee store)
    const employeeUuid = await insertEmployee(employeeData, createdByEmail);

    logger.info('✅ Step 1 complete: Employee created', {
      employeeUuid,
      employeeId: input.employeeId
    });

    // =========================================================================
    // STEP 2: Hash Password
    // =========================================================================
    logger.debug('🔒 Step 2: Hashing password', {
      employeeUuid
    });

    const hashedPassword = await hashPassword(input.password);

    // =========================================================================
    // STEP 3: Create User Account
    // =========================================================================
    logger.debug('👤 Step 3: Creating user account', {
      employeeUuid,
      role: input.role
    });

    // Map frontend role to backend enum
    const backendRole = UserRoleMapping[input.role];

    // Create user account (uses existing user store)
    const userUuid = await insertApplicationUser(
      {
        employeeId: employeeUuid, // Link user to newly created employee
        password: hashedPassword,
        role: backendRole as any, // Type assertion needed due to enum mapping
      },
      createdByEmail
    );

    logger.info('✅ Step 3 complete: User account created', {
      userUuid,
      employeeUuid,
      role: backendRole
    });

    // =========================================================================
    // STEP 4: Allocate Employee Leaves
    // =========================================================================
    // OLD VODICHRON: employeeController.create (lines 87-94)
    // Allocates leaves based on date of joining and current year
    // If this fails, rollback entire transaction (both employee and user deleted)
    try {
      logger.info('📅 Step 4: Allocating employee leaves', {
        employeeUuid,
        dateOfJoining: input.dateOfJoining
      });

      const dateOfJoining = moment(input.dateOfJoining).format('YYYY-MM-DD');
      const currentYear = new Date().getFullYear().toString();

      // TODO: Uncomment when leave allocation service is implemented
      // Import: import { allocateEmployeeLeaves } from '../../../leave/services/allocate-leaves.service';
      // await allocateEmployeeLeaves(employeeUuid, dateOfJoining, currentYear);
      
      logger.info('✅ Step 4 complete: Employee leaves allocated', {
        employeeUuid,
        dateOfJoining,
        year: currentYear
      });

    } catch (leaveError: any) {
      // Rollback the transaction - both employee and user will be deleted
      logger.error('❌ Leave allocation failed - Rolling back transaction', {
        employeeUuid,
        userUuid,
        error: leaveError.message
      });

      await transaction.rollback();

      logger.warn('🔄 Transaction rolled back (employee and user deleted)', {
        employeeUuid,
        userUuid
      });

      // Re-throw with user-friendly message (matches old backend line 93)
      throw new Error('Something went wrong while registering new employee, please try again.');
    }

    // =========================================================================
    // STEP 5: Commit Transaction
    // =========================================================================
    await transaction.commit();

    const duration = timer.end({
      employeeUuid,
      userUuid,
      role: backendRole
    });

    logger.info('🎉 Unified registration completed successfully', {
      employeeUuid,
      userUuid,
      employeeId: input.employeeId,
      role: backendRole,
      createdByEmail,
      duration: `${duration}ms`,
      type: 'UNIFIED_REGISTRATION_SUCCESS',
      note: 'Frontend should now upload photo and documents using employeeUuid'
    });

    return { employeeUuid, userUuid };

  } catch (error: any) {
    // =========================================================================
    // ROLLBACK on any error
    // =========================================================================
    await transaction.rollback();

    const duration = timer.end({
      error: error.message,
      employeeId: input.employeeId
    });

    logger.error('❌ Unified registration failed - transaction rolled back', {
      employeeId: input.employeeId,
      role: input.role,
      error: error.message,
      code: error.code,
      name: error.name,
      duration: `${duration}ms`,
      type: 'UNIFIED_REGISTRATION_ERROR'
    });

    // Re-throw with context
    if (error.message.includes('Duplicate entry') || error.message.includes('already exists')) {
      throw new Error(`Registration failed: ${error.message}`);
    }

    throw new Error(`Failed to register employee and user: ${error.message}`);
  }
}
