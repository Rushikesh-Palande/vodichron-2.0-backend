/**
 * Timesheet Approved Email Template
 * ==================================
 * Email sent to employee when their timesheet is approved
 * 
 * Based on old vodichron mailTemplates/timesheetRequests.ts
 * Updated with Vodichron 2.0 design system
 */

export interface TimesheetApprovedData {
  employeeName: string;
  requestNumber: string;
  totalHours: string;
  weekEndingDate: string;
  approverName: string;
  appLink: string;
}

/**
 * Get Timesheet Approved Notification Template
 * ---------------------------------------------
 * Generates subject and HTML template for approval notification
 * Sent when manager/director/hr approves employee's timesheet
 * 
 * @param data - Object containing timesheet approval details
 * @returns Object with subject and template (HTML string)
 */
export function getTimesheetApprovedNotificationTemplate(
  data: TimesheetApprovedData
) {
  const { employeeName, requestNumber, totalHours, weekEndingDate, approverName, appLink } = data;

  return {
    subject: `Timesheet Approved #${requestNumber} - Vodichron HRMS`,
    template: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Timesheet Approved</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #FFF6F1;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FFF6F1; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
              <img src="cid:vodichron-logo" alt="Vodichron" style="max-width: 160px; height: auto; margin-bottom: 12px;" />
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
                Timesheet Approved ✓
              </h1>
              <p style="color: rgba(255, 255, 255, 0.95); margin: 8px 0 0 0; font-size: 14px;">
                Request #${requestNumber}
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1f2937; font-size: 20px; margin: 0 0 16px 0; font-weight: 600;">
                Hello ${employeeName}! 🎉
              </h2>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Great news! Your timesheet request has been <strong style="color: #10b981;">approved</strong>. 
                Please review the details below:
              </p>

              <!-- Success Badge -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0 0 24px 0;">
                    <div style="display: inline-block; 
                               background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                               color: #ffffff; 
                               padding: 10px 24px; 
                               border-radius: 50px; 
                               font-size: 14px; 
                               font-weight: 600;
                               box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                      ✓ Approved
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                <tr>
                  <td style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); 
                             border: 2px solid #10b981; 
                             padding: 20px; 
                             border-radius: 12px;">
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; font-weight: 600; width: 45%;">
                          Request Number:
                        </td>
                        <td style="color: #1f2937; font-size: 14px; font-weight: 600;">
                          #${requestNumber}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; font-weight: 600;">
                          Week Ending Date:
                        </td>
                        <td style="color: #1f2937; font-size: 14px;">
                          ${weekEndingDate}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; font-weight: 600;">
                          Total Hours:
                        </td>
                        <td style="color: #10b981; font-size: 14px; font-weight: 600;">
                          ${totalHours} hours
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; font-weight: 600;">
                          Approved By:
                        </td>
                        <td style="color: #1f2937; font-size: 14px;">
                          ${approverName}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; font-weight: 600;">
                          Status:
                        </td>
                        <td style="color: #10b981; font-size: 14px; font-weight: 600;">
                          Approved
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 24px 0;">
                Your timesheet has been successfully approved. You can view the complete details by clicking the button below.
              </p>

              <!-- Action Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${appLink}" 
                       style="display: inline-block; 
                              padding: 14px 40px; 
                              background-color: #10b981; 
                              color: #ffffff; 
                              text-decoration: none; 
                              border-radius: 50px; 
                              font-size: 16px; 
                              font-weight: 600;
                              box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                      View Timesheet
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
                Best regards,<br>
                <strong style="color: #1f2937;">Vodichron HRMS Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; 
                       padding: 20px 30px; 
                       text-align: center; 
                       border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0 0 4px 0;">
                © ${new Date().getFullYear()} Vodichron HRMS · Vodichron Resource Management
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
