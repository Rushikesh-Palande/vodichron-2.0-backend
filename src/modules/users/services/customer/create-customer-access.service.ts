/**
 * Create Customer App Access Service
 * ====================================
 * Business logic for creating customer application access.
 * 
 * Based on old backend: userController.createCustomerAppAccess (lines 207-236)
 * 
 * Endpoint: POST /user/customer-access
 * Authorization: Admin/HR/SuperUser only
 * 
 * Process:
 * 1. Validate customer exists
 * 2. Generate random 7-character password
 * 3. Create or regenerate customer app user
 * 4. Send activation email with credentials
 */

import { Request, Response } from 'express';
import path from 'path';
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
 * Roles authorized to create customer access
 */
const ADMIN_USERS = ['super_user', 'hr', 'admin'];

/**
 * Handle Create Customer App Access
 * ==================================
 * Creates customer app access with random password and sends activation email.
 * 
 * Old backend logic (userController.ts:207-236):
 * 1. Extract customer ID from body (line 208)
 * 2. Get customer by ID (lines 209-214)
 * 3. Generate random 7-char password (line 215)
 * 4. Hash password (line 216)
 * 5. Check if customer app access exists (line 217)
 * 6. If not exists: insertCustomerApplicationUser (lines 219-225)
 * 7. If exists: reGenerateCustomerPassword (line 227)
 * 8. Send activation email (lines 229-234)
 * 9. Return 204 No Content (line 235)
 */
export async function handleCreateCustomerAppAccess(req: Request, res: Response) {
  const timer = new PerformanceTimer('createCustomerAppAccess_service');
  const user = (req as any).user;

  try {
    logger.info('🔑 Creating customer app access', {
      requestedBy: user?.uuid,
      operation: 'createCustomerAppAccess'
    });

    // Step 1: Validate authentication
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - No authentication provided',
        timestamp: new Date().toISOString()
      });
    }

    // Step 2: Authorization check - Only Admin/HR/SuperUser
    if (!ADMIN_USERS.includes(user.role)) {
      logger.warn('🚫 Unauthorized customer access creation attempt', {
        requestedBy: user.uuid,
        userRole: user.role
      });

      logSecurity('CREATE_CUSTOMER_ACCESS_UNAUTHORIZED', 'high', {
        userRole: user.role,
        reason: 'Only Admin/HR/SuperUser can create customer access'
      }, undefined, user.uuid);

      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Admin/HR/SuperUser can create customer access.',
        timestamp: new Date().toISOString()
      });
    }

    const loggedInUserId = user.uuid;

    // Step 3: Validate input with Zod schema
    const parseResult = createCustomerAppAccessInputSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message
      }));

      logger.warn('⚠️ Create customer access validation failed', {
        errors,
        requestedBy: user.uuid
      });

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
        timestamp: new Date().toISOString()
      });
    }

    const { id: customerId } = parseResult.data;

    // Step 4: Validate customer exists
    // (Old backend lines 209-214)
    logger.debug('🔍 Fetching customer details', { customerId });

    const customer = await getCustomerById(customerId);

    if (!customer) {
      logger.warn('⚠️ Customer not found', {
        customerId,
        requestedBy: user.uuid
      });

      return res.status(400).json({
        success: false,
        message: 'Unable to find the details of the customer to update.',
        timestamp: new Date().toISOString()
      });
    }

    // Step 5: Generate random 7-character password
    // (Old backend line 215)
    const password = randomPassGenerator(7);
    logger.debug('🔐 Generated random password', {
      customerId,
      passwordLength: password.length
    });

    // Step 6: Hash password
    // (Old backend line 216)
    const encryptedPassword = await hashPassword(password);

    // Step 7: Check if customer app access already exists
    // (Old backend line 217)
    logger.debug('🔍 Checking if customer app access exists', { customerId });

    const appUser = await getCustomerAppAccessByCustomerId(customerId);

    if (!appUser) {
      // Step 8a: Create new customer app access
      // (Old backend lines 219-225)
      logger.info('➕ Creating new customer app access', {
        customerId,
        requestedBy: user.uuid
      });

      await insertCustomerApplicationUser(
        {
          customerId: customer.uuid,
          password: encryptedPassword
        },
        loggedInUserId
      );
    } else {
      // Step 8b: Regenerate customer password
      // (Old backend line 227)
      logger.info('🔄 Regenerating customer password', {
        customerId,
        requestedBy: user.uuid
      });

      await reGenerateCustomerPassword(
        appUser.customerId,
        encryptedPassword,
        loggedInUserId
      );
    }

    // Step 9: Send activation email
    // (Old backend lines 229-234)
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
        customerId
      });
    } catch (emailError: any) {
      // Log email error but don't fail the operation
      logger.error('❌ Failed to send customer activation email (access created successfully)', {
        error: emailError.message,
        customerId,
        customerEmail: customer.email
      });
      // Don't throw - customer access was created successfully
    }

    const duration = timer.end();

    logger.info('✅ Customer app access created successfully', {
      customerId,
      isNew: !appUser,
      requestedBy: user.uuid,
      duration: `${duration}ms`
    });

    logSecurity('CREATE_CUSTOMER_ACCESS_SUCCESS', 'medium', {
      customerId,
      isNew: !appUser,
      createdBy: user.uuid,
      createdByRole: user.role,
      duration
    }, undefined, user.uuid);

    // Old backend returns 204 No Content
    return res.status(204).send();

  } catch (error: any) {
    const duration = timer.end();

    logger.error('❌ Failed to create customer app access', {
      requestedBy: user?.uuid,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });

    logSecurity('CREATE_CUSTOMER_ACCESS_ERROR', 'critical', {
      error: error.message,
      duration
    }, undefined, user?.uuid);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
}
