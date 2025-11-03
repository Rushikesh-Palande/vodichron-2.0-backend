/**
 * Password Reset Email Template
 * =============================
 * Modern, professional HTML email template for password reset requests.
 * Matches the Vodichron 2.0 frontend design system.
 * 
 * Design Features:
 * - Brand color scheme (#F26A21 primary, #E64A2E accent)
 * - Responsive design
 * - Clean, modern UI
 * - Clear call-to-action
 * - Security information
 * - 15-minute expiration notice
 */

export interface ResetPasswordEmailData {
  passwordResetUrl: string;
}

/**
 * Get Password Reset Email Template
 * --------------------------------
 * Generates subject and HTML template for password reset email.
 * Matches Vodichron 2.0 frontend design language.
 * 
 * @param data - Object containing passwordResetUrl
 * @returns Object with subject and template (HTML string)
 */
export function getResetPasswordEmailTemplate(data: ResetPasswordEmailData) {
  const { passwordResetUrl } = data;

  return {
    subject: 'Reset Your Password - Vodichron HRMS',
    template: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #FFF6F1;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FFF6F1; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          
          <!-- Header with gradient background -->
          <tr>
            <td style="background: linear-gradient(135deg, #F26A21 0%, #E64A2E 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: 0.5px;">
                🔐 VODICHRON
              </h1>
              <p style="color: rgba(255, 255, 255, 0.95); margin: 8px 0 0 0; font-size: 14px; letter-spacing: 0.3px;">
                Resource Management System
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1f2937; font-size: 24px; margin: 0 0 20px 0; font-weight: 600;">
                Password Reset Request
              </h2>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hello,
              </p>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                We received a request to reset your password for your Vodichron HRMS account. 
                Click the button below to create a new password:
              </p>

              <!-- Reset Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${passwordResetUrl}" 
                       style="display: inline-block; 
                              padding: 16px 48px; 
                              background-color: #F26A21; 
                              color: #ffffff; 
                              text-decoration: none; 
                              border-radius: 50px; 
                              font-size: 16px; 
                              font-weight: 600;
                              box-shadow: 0 4px 12px rgba(242, 106, 33, 0.3);
                              transition: background-color 0.3s ease;">
                      Reset My Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td style="background-color: #FFF6F1; 
                             border-left: 4px solid #F26A21; 
                             padding: 16px 20px; 
                             border-radius: 6px;">
                    <p style="color: #6b7280; font-size: 14px; margin: 0; line-height: 1.5;">
                      ⏱️ <strong style="color: #F26A21;">This link expires in 15 minutes</strong> for security reasons.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="color: #F26A21; 
                        font-size: 13px; 
                        word-break: break-all; 
                        background-color: #f9fafb; 
                        padding: 12px; 
                        border-radius: 6px;
                        border: 1px solid #e5e7eb;
                        margin: 10px 0 30px 0;">
                ${passwordResetUrl}
              </p>

              <!-- Security Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td style="background-color: #f9fafb; 
                             border: 1px solid #e5e7eb; 
                             padding: 20px; 
                             border-radius: 8px;">
                    <p style="color: #1f2937; font-size: 14px; margin: 0 0 12px 0; font-weight: 600;">
                      🛡️ Security Tips:
                    </p>
                    <ul style="color: #6b7280; 
                               font-size: 14px; 
                               line-height: 1.8; 
                               margin: 0; 
                               padding-left: 20px;">
                      <li>If you didn't request this, please ignore this email or contact HR</li>
                      <li>Never share your password or reset link with anyone</li>
                      <li>This link can only be used once</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 30px 0 0 0;">
                Best regards,<br>
                <strong style="color: #1f2937;">Vodichron HRMS Team</strong><br>
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
                © ${new Date().getFullYear()} Vodichron HRMS · Embed Square Solutions Pvt. Ltd.
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
