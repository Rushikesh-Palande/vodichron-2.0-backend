/**
 * User Registration tRPC Router
 * ==============================
 * 
 * tRPC procedure for registering new application users (grant access).
 * Uses protectedProcedure to ensure user is logged in.
 * Authorization checks (Admin/HR/SuperUser only) are done in service layer.
 */

import path from 'path';
import { protectedProcedure } from '../../../../trpc/trpc';
import { logger } from '../../../../utils/logger';
import { registerUserInputSchema } from '../../schemas/register-user.schemas';
import { hashPassword } from '../../../auth/helpers/hash-password.helper';
import { 
  getApplicationUserByEmployeeId, 
  getEmployeeByUuid,
  insertApplicationUser 
} from '../../store/registration/register-user.store';
import { ApplicationUserRole } from '../../schemas/register-user.schemas';
import { TRPCError } from '@trpc/server';
import { sendEmail } from '../../../../services/email.service';
import { getWelcomeEmailTemplate } from '../../templates/welcome-email.template';
import { config } from '../../../../config';

/**
 * Register User tRPC Procedure
 * =============================
 * 
 * Registers a new application user for an employee.
 * Requires authentication (protectedProcedure).
 * 
 * Input: { employeeId, password, confirmPassword?, role }
 * Output: { success, message, data: { userUuid }, timestamp }
 */
export const registerUserProcedure = protectedProcedure
  .input(registerUserInputSchema)
  .mutation(async ({ ctx, input }) => {
    try {
      const loggedInUser = ctx.user;
      const loggedInUserRole = loggedInUser.role;
      const loggedInUserEmail = loggedInUser.email;
      
      logger.info('🔐 User registration attempt via tRPC', { 
        requestedBy: loggedInUserEmail,
        role: loggedInUserRole,
        employeeId: input.employeeId,
        type: 'USER_REGISTRATION_TRPC_START' 
      });
      
      // Step 1: Validate employee exists
      const employee = await getEmployeeByUuid(input.employeeId);
      
      if (!employee) {
        logger.warn('⚠️ Employee not found for user registration', { 
          employeeId: input.employeeId,
          type: 'USER_REGISTRATION_EMPLOYEE_NOT_FOUND' 
        });
        
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Employee not found. Cannot create user account for non-existent employee.',
        });
      }
      
      // Step 2: Check if user already exists for this employee
      const existingUser = await getApplicationUserByEmployeeId(input.employeeId);
      
      if (existingUser) {
        logger.warn('⚠️ User already exists for employee', { 
          employeeId: input.employeeId,
          existingUserUuid: existingUser.uuid,
          type: 'USER_REGISTRATION_DUPLICATE' 
        });
        
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User already assigned to application.',
        });
      }
      
      // Step 3: Authorization check - Only SuperUsers can create SuperUsers
      if (input.role === ApplicationUserRole.superUser && loggedInUserRole !== ApplicationUserRole.superUser) {
        logger.warn('⚠️ Unauthorized attempt to create SuperUser via tRPC', { 
          requestedBy: loggedInUserEmail,
          requestedByRole: loggedInUserRole,
          type: 'USER_REGISTRATION_FORBIDDEN' 
        });
        
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Super users can add other Super users.',
        });
      }
      
      // Step 4: Store plain password for email (before hashing)
      const plainPassword = input.password;
      
      // Step 5: Hash password
      const hashedPassword = await hashPassword(input.password);
      
      // Step 6: Insert user into database
      const userUuid = await insertApplicationUser(
        {
          employeeId: input.employeeId,
          password: hashedPassword,
          role: input.role,
        },
        loggedInUserEmail || 'system'
      );
      
      logger.info('✅ User registered successfully via tRPC', { 
        userUuid,
        employeeId: input.employeeId,
        role: input.role,
        createdBy: loggedInUserEmail,
        type: 'USER_REGISTRATION_TRPC_SUCCESS' 
      });
      
      // Step 7: Send welcome email with credentials
      try {
        // Ensure employee has an official email
        if (!employee.officialEmailId) {
          throw new Error('Employee does not have an official email address');
        }
        
        logger.info('📧 Sending welcome email with credentials (tRPC)', {
          to: employee.officialEmailId,
          employeeName: employee.name
        });
        
        const loginUrl = config.frontendUrl || 'http://localhost:3000';
        const emailTemplate = getWelcomeEmailTemplate({
          employeeName: employee.name,
          officialEmail: employee.officialEmailId,
          temporaryPassword: plainPassword,
          loginUrl,
          role: input.role,
        });
        
        // Get absolute path to logo
        const logoPath = path.resolve(process.cwd(), config.asset.path, 'Vodichron-logo.png');
        
        await sendEmail({
          to: employee.officialEmailId,
          subject: emailTemplate.subject,
          html: emailTemplate.template,
          attachments: [
            {
              filename: 'vodichron-logo.png',
              path: logoPath,
              cid: 'vodichron-logo', // Content ID for embedding in HTML
            },
          ],
        });
        
        logger.info('✅ Welcome email sent successfully (tRPC)', {
          to: employee.officialEmailId,
          userUuid
        });
      } catch (emailError: any) {
        // Log email error but don't fail the registration
        logger.error('❌ Failed to send welcome email (user created successfully - tRPC)', {
          error: emailError.message,
          userUuid,
          employeeEmail: employee.officialEmailId,
        });
        // Don't throw - registration was successful, email is secondary
      }
      
      // Step 8: Return success response
      return {
        success: true,
        message: 'User details saved successfully. Welcome email sent to employee.',
        data: {
          userUuid,
        },
        timestamp: new Date().toISOString(),
      };
      
    } catch (error: any) {
      // Re-throw TRPCError as-is
      if (error instanceof TRPCError) {
        throw error;
      }
      
      logger.error('💥 User registration tRPC error', {
        type: 'USER_REGISTRATION_TRPC_ERROR',
        error: error?.message,
        stack: error?.stack
      });
      
      // Handle specific database errors
      if (error.message === 'Unable to add a user, try again after some time.') {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }
      
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      });
    }
  });
