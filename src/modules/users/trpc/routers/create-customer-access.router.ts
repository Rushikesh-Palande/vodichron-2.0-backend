/**
 * Create Customer App Access tRPC Router
 * =======================================
 * tRPC procedure for creating customer application access.
 * Uses protectedProcedure to ensure user is logged in.
 * 
 * Based on old vodichron: POST /user/customer-access
 */

import path from 'path';
import { TRPCError } from '@trpc/server';
import { protectedProcedure } from '../../../../trpc/trpc';
import { logger, logSecurity, PerformanceTimer } from '../../../../utils/logger';
import { createCustomerAppAccessInputSchema } from '../../schemas/customer/create-customer-access.schemas';
import {
  getCustomerById,
  getCustomerAppAccessByCustomerId,
  insertCustomerApplicationUser,
  reGenerateCustomerPassword
} from '../../store/customer/customer-access.store';
import { randomPassGenerator } from '../../helpers/random-password.helper';
import { hashPassword } from '../../../auth/helpers/hash-password.helper';
import { getCustomerActivationNotificationTemplate } from '../../templates/customer-activation.template';
import { sendEmail } from '../../../../services/email.service';
import { config } from '../../../../config';

/**
 * Admin User Roles
 * ================
 */
const ADMIN_USERS = ['super_user', 'hr', 'admin'];

/**
 * Create Customer App Access tRPC Procedure
 * ==========================================
 * Creates customer app access with random password and sends activation email.
 * 
 * Authorization: Admin/HR/SuperUser only
 * 
 * Input: { id: customerId (UUID) }
 * Output: { success, message, timestamp }
 */
export const createCustomerAppAccessProcedure = protectedProcedure
  .input(createCustomerAppAccessInputSchema)
  .mutation(async ({ input, ctx }) => {
    // ============================================================================
    // STEP 1: Initialize Performance Timer
    // ============================================================================
    const timer = new PerformanceTimer('createCustomerAppAccess_trpc');
    
    try {
      logger.info('🔑 Creating customer app access via tRPC', {
        userUuid: ctx.user.uuid,
        customerId: input.id,
        operation: 'createCustomerAppAccess_trpc'
      });

      // ==========================================================================
      // STEP 2: Authorization Check - Only Admin/HR/SuperUser
      // ==========================================================================
      if (!ADMIN_USERS.includes(ctx.user.role)) {
        logger.warn('🚫 Unauthorized customer access creation attempt via tRPC', {
          requestedBy: ctx.user.uuid,
          userRole: ctx.user.role
        });

        logSecurity('CREATE_CUSTOMER_ACCESS_UNAUTHORIZED_TRPC', 'high', {
          userRole: ctx.user.role,
          reason: 'Only Admin/HR/SuperUser can create customer access'
        }, undefined, ctx.user.uuid);

        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied. Only Admin/HR/SuperUser can create customer access.'
        });
      }

      const loggedInUserId = ctx.user.uuid;

      // ==========================================================================
      // STEP 3: Validate Customer Exists
      // ==========================================================================
      logger.debug('🔍 Fetching customer details', { customerId: input.id });

      const customer = await getCustomerById(input.id);

      if (!customer) {
        logger.warn('⚠️ Customer not found via tRPC', {
          customerId: input.id,
          requestedBy: ctx.user.uuid
        });

        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Unable to find the details of the customer to update.'
        });
      }

      // ==========================================================================
      // STEP 4: Generate Random 7-Character Password
      // ==========================================================================
      const password = randomPassGenerator(7);
      logger.debug('🔐 Generated random password', {
        customerId: input.id,
        passwordLength: password.length
      });

      // ==========================================================================
      // STEP 5: Hash Password
      // ==========================================================================
      const encryptedPassword = await hashPassword(password);

      // ==========================================================================
      // STEP 6: Check if Customer App Access Already Exists
      // ==========================================================================
      logger.debug('🔍 Checking if customer app access exists', { customerId: input.id });

      const appUser = await getCustomerAppAccessByCustomerId(input.id);

      if (!appUser) {
        // Create new customer app access
        logger.info('➕ Creating new customer app access', {
          customerId: input.id,
          requestedBy: ctx.user.uuid
        });

        await insertCustomerApplicationUser(
          {
            customerId: customer.uuid,
            password: encryptedPassword
          },
          loggedInUserId
        );
      } else {
        // Regenerate customer password
        logger.info('🔄 Regenerating customer password', {
          customerId: input.id,
          requestedBy: ctx.user.uuid
        });

        await reGenerateCustomerPassword(
          appUser.customerId,
          encryptedPassword,
          loggedInUserId
        );
      }

      // ==========================================================================
      // STEP 7: Send Activation Email
      // ==========================================================================
      try {
        logger.info('📧 Sending customer activation email', {
          to: customer.email,
          customerName: customer.name
        });

        const appLink = config.frontendUrl || 'http://localhost:3000';
        const emailTemplate = getCustomerActivationNotificationTemplate({
          customerName: customer.name,
          appLink,
          password
        });

        // Get absolute path to logo
        const logoPath = path.resolve(process.cwd(), config.asset.path, 'Vodichron-logo.png');

        await sendEmail({
          to: customer.email,
          subject: emailTemplate.subject,
          html: emailTemplate.template,
          attachments: [
            {
              filename: 'vodichron-logo.png',
              path: logoPath,
              cid: 'vodichron-logo'
            }
          ]
        });

        logger.info('✅ Customer activation email sent successfully', {
          to: customer.email,
          customerId: input.id
        });
      } catch (emailError: any) {
        // Log email error but don't fail the operation
        logger.error('❌ Failed to send customer activation email (access created successfully)', {
          error: emailError.message,
          customerId: input.id,
          customerEmail: customer.email
        });
        // Don't throw - customer access was created successfully
      }

      const duration = timer.end();

      logger.info('✅ Customer app access created successfully via tRPC', {
        customerId: input.id,
        isNew: !appUser,
        requestedBy: ctx.user.uuid,
        duration: `${duration}ms`
      });

      logSecurity('CREATE_CUSTOMER_ACCESS_SUCCESS_TRPC', 'medium', {
        customerId: input.id,
        isNew: !appUser,
        createdBy: ctx.user.uuid,
        createdByRole: ctx.user.role,
        duration
      }, undefined, ctx.user.uuid);

      return {
        success: true,
        message: 'Customer app access created successfully',
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      // ==========================================================================
      // STEP 8: Error Handling
      // ==========================================================================
      const duration = timer.end();

      // Re-throw TRPCError as-is
      if (error instanceof TRPCError) {
        throw error;
      }

      logger.error('❌ Failed to create customer app access via tRPC', {
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`
      });

      logSecurity('CREATE_CUSTOMER_ACCESS_ERROR_TRPC', 'critical', {
        error: error.message,
        duration
      }, undefined, ctx.user.uuid);

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error'
      });
    }
  });
