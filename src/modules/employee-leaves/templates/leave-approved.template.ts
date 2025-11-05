/**
 * Leave Approved Email Template
 * ==============================
 * Email sent to employee when leave request is approved
 */

interface LeaveApprovedParams {
  employeeName: string;
  requestNumber: string;
  appLink: string;
}

export function getLeaveApprovedNotificationTemplate(
  params: LeaveApprovedParams
): { subject: string; template: string } {
  const { employeeName, requestNumber, appLink } = params;

  return {
    subject: `Leave Request Approved #${requestNumber} - Vodichron`,
    template: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  
                  <!-- Header with Logo -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px 40px; text-align: center;">
                      <img src="cid:vodichron-logo" alt="Vodichron" style="height: 50px; margin-bottom: 15px;" />
                      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">✓ Leave Approved</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <p style="color: #333333; font-size: 16px; margin: 0 0 20px 0;">Dear ${employeeName},</p>
                      
                      <p style="color: #555555; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
                        Great news! Your leave request <strong>#${requestNumber}</strong> has been <span style="color: #10b981; font-weight: 600;">APPROVED</span>.
                      </p>
                      
                      <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 20px; margin: 0 0 25px 0; border-radius: 4px;">
                        <p style="color: #065f46; font-size: 16px; font-weight: 600; margin: 0;">
                          ✓ Your leave has been approved
                        </p>
                      </div>
                      
                      <p style="color: #555555; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
                        You can view the complete details by logging into the application.
                      </p>
                      
                      <!-- Login Button -->
                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td align="center" style="padding: 10px 0;">
                            <a href="${appLink}" style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">View Details</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8f9fa; padding: 20px 40px; text-align: center; border-top: 1px solid #e0e0e0;">
                      <p style="color: #999999; font-size: 13px; margin: 0; line-height: 1.5;">
                        This is an automated email from Vodichron HRMS.<br/>
                        Please do not reply to this email.
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
