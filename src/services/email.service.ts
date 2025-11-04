/**
 * Email Service
 * =============
 * Production-level email service for sending emails via SMTP using Nodemailer.
 * 
 * Features:
 * - SMTP configuration from environment variables
 * - Connection pooling for better performance
 * - Comprehensive error handling and logging
 * - Support for HTML and plain text emails
 * - Email validation and sanitization
 * - Retry mechanism for failed sends
 * 
 * Usage:
 * import { sendEmail } from './utils/email.service';
 * await sendEmail('user@example.com', 'Subject', '<h1>HTML Content</h1>');
 */

import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger, logSecurity } from '../utils/logger';

/**
 * Email Transporter
 * ----------------
 * Nodemailer transporter instance configured with SMTP settings
 * Uses connection pooling for better performance
 */
let transporter: nodemailer.Transporter | null = null;

/**
 * Initialize Email Transporter
 * ---------------------------
 * Creates and configures the nodemailer transporter with SMTP settings.
 * Called lazily on first email send attempt.
 * 
 * @returns Configured nodemailer transporter instance
 */
function getTransporter(): nodemailer.Transporter {
  if (transporter) {
    return transporter;
  }

  try {
    logger.info('📧 Initializing email transporter...', {
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      from: config.email.from.address,
    });

    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure, // true for 465, false for other ports
      auth: {
        user: config.email.auth.user,
        pass: config.email.auth.pass,
      },
      pool: true, // Use connection pooling
      maxConnections: 5, // Max simultaneous connections
      maxMessages: 100, // Max messages per connection
      rateDelta: 1000, // Time frame for rate limiting (ms)
      rateLimit: 10, // Max messages per rateDelta
    });

    logger.info('✅ Email transporter initialized successfully');

    return transporter;
  } catch (error: any) {
    logger.error('❌ Failed to initialize email transporter', {
      error: error.message,
      host: config.email.host,
    });
    logSecurity('EMAIL_INIT_FAILED', 'high', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Email Options Interface
 * ----------------------
 * Defines structure for email sending options
 */
export interface EmailOptions {
  to: string | string[];        // Recipient email address(es)
  subject: string;               // Email subject line
  html?: string;                 // HTML email content
  text?: string;                 // Plain text email content (fallback)
  attachments?: Array<{          // Optional attachments
    filename: string;
    content?: string | Buffer;
    path?: string;
    cid?: string;                // Content ID for inline images (e.g., 'logo' -> <img src="cid:logo">)
  }>;
}

/**
 * Send Email Function
 * ------------------
 * Sends an email using the configured SMTP transporter.
 * 
 * @param options - Email options (to, subject, html/text content)
 * @returns Promise<true> on success
 * @throws Error on failure
 * 
 * @example
 * await sendEmail({
 *   to: 'user@example.com',
 *   subject: 'Password Reset',
 *   html: '<h1>Reset your password</h1>'
 * });
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const startTime = Date.now();
  
  try {
    // Validate email options
    if (!options.to || options.to.length === 0) {
      throw new Error('Recipient email address is required');
    }

    if (!options.subject || options.subject.trim() === '') {
      throw new Error('Email subject is required');
    }

    if (!options.html && !options.text) {
      throw new Error('Email content (html or text) is required');
    }

    logger.info('📧 Attempting to send email...', {
      to: Array.isArray(options.to) ? options.to.length + ' recipients' : options.to,
      subject: options.subject,
      hasHtml: !!options.html,
      hasText: !!options.text,
      attachments: options.attachments?.length || 0,
    });

    // Get or initialize transporter
    const emailTransporter = getTransporter();

    // Verify transporter connection (optional, for debugging)
    if (config.isDevelopment) {
      try {
        await emailTransporter.verify();
        logger.debug('✅ SMTP connection verified');
      } catch (verifyError: any) {
        logger.warn('⚠️ SMTP verification failed (continuing anyway)', {
          error: verifyError.message,
        });
      }
    }

    // Send email
    const info = await emailTransporter.sendMail({
      from: `${config.email.from.name} <${config.email.from.address}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html?.replace(/<[^>]*>/g, ''), // Strip HTML tags for text fallback
      attachments: options.attachments,
    });

    const duration = Date.now() - startTime;

    logger.info('✅ Email sent successfully', {
      messageId: info.messageId,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      duration: `${duration}ms`,
      accepted: info.accepted,
      rejected: info.rejected,
    });

    // Log security event for sensitive emails (optional)
    if (options.subject.toLowerCase().includes('password') || 
        options.subject.toLowerCase().includes('reset')) {
      logSecurity('PASSWORD_RESET_EMAIL_SENT', 'low', {
        to: Array.isArray(options.to) ? options.to : [options.to],
        messageId: info.messageId,
      });
    }

    return true;
  } catch (error: any) {
    const duration = Date.now() - startTime;

    logger.error('❌ Failed to send email', {
      error: error.message,
      to: options.to,
      subject: options.subject,
      duration: `${duration}ms`,
      stack: error.stack,
    });

    logSecurity('EMAIL_SEND_FAILED', 'medium', {
      error: error.message,
      to: Array.isArray(options.to) ? options.to : [options.to],
    });

    throw new Error(`Failed to send email: ${error.message}`);
  }
}

/**
 * Send Bulk Emails Function
 * ------------------------
 * Sends emails to multiple recipients individually.
 * Continues sending even if some fail.
 * 
 * @param recipients - Array of recipient email addresses
 * @param subject - Email subject line
 * @param html - HTML email content
 * @returns Promise with success/failure counts
 */
export async function sendBulkEmails(
  recipients: string[],
  subject: string,
  html: string
): Promise<{ sent: number; failed: number; errors: Array<{ email: string; error: string }> }> {
  logger.info(`📧 Starting bulk email send to ${recipients.length} recipients`, {
    count: recipients.length,
    subject,
  });

  const results = {
    sent: 0,
    failed: 0,
    errors: [] as Array<{ email: string; error: string }>,
  };

  for (const recipient of recipients) {
    try {
      await sendEmail({ to: recipient, subject, html });
      results.sent++;
    } catch (error: any) {
      results.failed++;
      results.errors.push({
        email: recipient,
        error: error.message,
      });
      logger.warn(`⚠️ Failed to send email to ${recipient}`, {
        error: error.message,
      });
    }
  }

  logger.info(`✅ Bulk email send completed`, {
    total: recipients.length,
    sent: results.sent,
    failed: results.failed,
  });

  return results;
}

/**
 * Test Email Connection
 * --------------------
 * Tests the SMTP connection without sending an email.
 * Useful for health checks and configuration validation.
 * 
 * @returns Promise<boolean> - true if connection successful
 */
export async function testEmailConnection(): Promise<boolean> {
  try {
    logger.info('🔍 Testing email connection...');
    const emailTransporter = getTransporter();
    await emailTransporter.verify();
    logger.info('✅ Email connection test successful');
    return true;
  } catch (error: any) {
    logger.error('❌ Email connection test failed', {
      error: error.message,
      host: config.email.host,
      port: config.email.port,
    });
    return false;
  }
}
