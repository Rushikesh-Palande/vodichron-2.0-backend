/**
 * Welcome Email Template for New Application Users
 * =================================================
 * Modern, professional HTML email template sent when employee is granted application access.
 * Includes login credentials and welcome message.
 * 
 * Design Features:
 * - Vodichron branding with logo
 * - Brand color scheme (#F26A21 primary, #E64A2E accent)
 * - Responsive design
 * - Clear credentials display
 * - Security reminders
 * - Getting started guide
 */

export interface WelcomeEmailData {
  employeeName: string;
  officialEmail: string;
  temporaryPassword: string;
  loginUrl: string;
  role: string;
}

/**
 * Get Welcome Email Template
 * --------------------------
 * Generates subject and HTML template for new user welcome email.
 * Sent when employee is granted application access.
 * 
 * @param data - Object containing employee details and credentials
 * @returns Object with subject and template (HTML string)
 */
export function getWelcomeEmailTemplate(data: WelcomeEmailData) {
  const { employeeName, officialEmail, temporaryPassword, loginUrl, role } = data;

  const formatRole = (r: string) => {
    return r.replace(/_/g, ' ').split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  return {
    subject: 'Welcome to Vodichron HRMS - Your Account is Ready! 🎉',
    template: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Vodichron HRMS</title>
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
                Welcome Aboard! 🎉
              </h1>
              <p style="color: rgba(255, 255, 255, 0.95); margin: 8px 0 0 0; font-size: 14px; letter-spacing: 0.3px;">
                Your Vodichron HRMS account is ready
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1f2937; font-size: 24px; margin: 0 0 20px 0; font-weight: 600;">
                Hello ${employeeName}! 👋
              </h2>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Congratulations and welcome to <strong style="color: #F26A21;">Vodichron HRMS</strong>! 
                We're excited to have you on board.
              </p>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Your application access has been granted with the role of <strong style="color: #F26A21;">${formatRole(role)}</strong>. 
                Below are your login credentials:
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
                        <td style="color: #6b7280; font-size: 14px; font-weight: 600; width: 40%;">
                          Email:
                        </td>
                        <td style="color: #1f2937; font-size: 14px; font-family: 'Courier New', monospace; background-color: #ffffff; padding: 8px 12px; border-radius: 6px;">
                          ${officialEmail}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; font-weight: 600;">
                          Password:
                        </td>
                        <td style="color: #1f2937; font-size: 14px; font-family: 'Courier New', monospace; background-color: #ffffff; padding: 8px 12px; border-radius: 6px;">
                          ${temporaryPassword}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; font-weight: 600;">
                          Role:
                        </td>
                        <td style="color: #F26A21; font-size: 14px; font-weight: 600; background-color: #ffffff; padding: 8px 12px; border-radius: 6px;">
                          ${formatRole(role)}
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
                    <a href="${loginUrl}" 
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
                      <li>Click the "Login to Vodichron" button above or visit the login page</li>
                      <li>Enter your email and the temporary password provided</li>
                      <li><strong>Change your password immediately</strong> after first login for security</li>
                      <li>Complete your profile information</li>
                      <li>Explore the dashboard and available features</li>
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
                      <li>If you didn't expect this email, please contact HR immediately</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 30px 0 0 0;">
                If you have any questions or need assistance, please don't hesitate to contact the HR department.
              </p>

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
