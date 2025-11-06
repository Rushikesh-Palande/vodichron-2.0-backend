/**
 * Customer Activation Email Template
 * ===================================
 * Modern, professional HTML email template sent when customer is granted application access.
 * Includes login credentials and welcome message.
 * 
 * Based on old backend: src/mailTemplates/customerAccountActivation.ts
 * 
 * Design Features:
 * - Vodichron branding with logo
 * - Brand color scheme (#F26A21 primary, #E64A2E accent)
 * - Responsive design
 * - Clear credentials display
 * - Security reminders
 * - Getting started guide
 */

export interface CustomerActivationEmailData {
  customerName: string;
  appLink: string;
  password: string;
}

/**
 * Get Customer Activation Email Template
 * =======================================
 * Generates subject and HTML template for customer activation email.
 * Sent when customer is granted application access with random password.
 * 
 * @param data - Object containing customer details and credentials
 * @returns Object with subject and template (HTML string)
 */
export function getCustomerActivationNotificationTemplate(data: CustomerActivationEmailData) {
  const { customerName, appLink, password } = data;

  return {
    subject: 'Welcome to Vodichron - Your Account is Active! 🎉',
    template: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Vodichron</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #FFF6F1;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FFF6F1; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          
          <!-- Header with gradient and logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #F26A21 0%, #E64A2E 100%); padding: 40px 30px; text-align: center;">
              <img src="cid:vodichron-logo" alt="Vodichron" style="max-width: 180px; height: auto; margin-bottom: 16px;" />
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: 0.5px;">
                Account Activated! 🎉
              </h1>
              <p style="color: rgba(255, 255, 255, 0.95); margin: 8px 0 0 0; font-size: 14px; letter-spacing: 0.3px;">
                Your Vodichron account is ready to use
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1f2937; font-size: 24px; margin: 0 0 20px 0; font-weight: 600;">
                Hello ${customerName}! 👋
              </h2>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Great news! Your <strong style="color: #F26A21;">Vodichron</strong> account has been activated. 
                You can now access our platform to manage your projects and track progress.
              </p>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Below are your login credentials. Please keep them secure:
              </p>

              <!-- Credentials Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td style="background: linear-gradient(135deg, #FFF6F1 0%, #FFE8DC 100%); 
                             border: 2px solid #F26A21; 
                             padding: 24px; 
                             border-radius: 12px;">
                    <p style="color: #1f2937; font-size: 16px; margin: 0 0 16px 0; font-weight: 600;">
                      🔑 Your Login Credentials
                    </p>
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; font-weight: 600; width: 35%;">
                          Login Portal:
                        </td>
                        <td style="color: #1f2937; font-size: 14px; background-color: #ffffff; padding: 8px 12px; border-radius: 6px;">
                          <a href="${appLink}" style="color: #F26A21; text-decoration: none; font-weight: 500;">${appLink}</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; font-weight: 600;">
                          Password:
                        </td>
                        <td style="color: #1f2937; font-size: 16px; font-family: 'Courier New', monospace; font-weight: 600; background-color: #ffffff; padding: 8px 12px; border-radius: 6px; letter-spacing: 1px;">
                          ${password}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Login Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${appLink}" 
                       style="display: inline-block; 
                              padding: 16px 48px; 
                              background-color: #F26A21; 
                              color: #ffffff; 
                              text-decoration: none; 
                              border-radius: 50px; 
                              font-size: 16px; 
                              font-weight: 600;
                              box-shadow: 0 4px 12px rgba(242, 106, 33, 0.3);">
                      Login to Vodichron
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Getting Started Guide -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td style="background-color: #f9fafb; 
                             border: 1px solid #e5e7eb; 
                             padding: 24px; 
                             border-radius: 8px;">
                    <p style="color: #1f2937; font-size: 16px; margin: 0 0 16px 0; font-weight: 600;">
                      🚀 Getting Started
                    </p>
                    <ol style="color: #4b5563; 
                               font-size: 14px; 
                               line-height: 1.8; 
                               margin: 0; 
                               padding-left: 20px;">
                      <li>Click the "Login to Vodichron" button above or visit the portal link</li>
                      <li>Enter your email and the password provided above</li>
                      <li><strong>Change your password immediately</strong> after first login for security</li>
                      <li>Explore your dashboard and available features</li>
                      <li>Contact your project manager if you need any assistance</li>
                    </ol>
                  </td>
                </tr>
              </table>

              <!-- Security Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td style="background-color: #FFF6F1; 
                             border-left: 4px solid #F26A21; 
                             padding: 16px 20px; 
                             border-radius: 6px;">
                    <p style="color: #1f2937; font-size: 14px; margin: 0 0 12px 0; font-weight: 600;">
                      🛡️ Important Security Reminders:
                    </p>
                    <ul style="color: #6b7280; 
                               font-size: 14px; 
                               line-height: 1.8; 
                               margin: 0; 
                               padding-left: 20px;">
                      <li><strong>Change your password immediately</strong> after first login</li>
                      <li>Never share your password with anyone</li>
                      <li>Use a strong, unique password</li>
                      <li>If you didn't expect this email, please contact us immediately</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 30px 0 0 0;">
                If you have any questions or need assistance, please feel free to reach out to your project manager 
                or contact our support team.
              </p>

              <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 30px 0 0 0;">
                Best regards,<br>
                <strong style="color: #1f2937;">Vodichron Team</strong><br>
                <span style="color: #9ca3af; font-size: 14px;">Embed Square Solutions Pvt. Ltd.</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; 
                       padding: 24px 30px; 
                       text-align: center; 
                       border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0 0 8px 0;">
                © ${new Date().getFullYear()} Vodichron · Embed Square Solutions Pvt. Ltd.
              </p>
              <p style="color: #9ca3af; font-size: 11px; margin: 0;">
                This is an automated email. Please do not reply to this message.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };
}
