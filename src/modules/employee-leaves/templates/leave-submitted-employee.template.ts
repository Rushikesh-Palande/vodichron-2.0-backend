/**
 * Leave Submitted Employee Email Template
 * ========================================
 * Email sent to employee after submitting leave request
 */

interface LeaveSubmittedEmployeeParams {
  employeeName: string;
  requestNumber: string;
  leaveDays: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  appLink: string;
}

export function getLeaveSubmittedEmployeeNotificationTemplate(
  params: LeaveSubmittedEmployeeParams
): { subject: string; template: string } {
  const { employeeName, requestNumber, leaveDays, startDate, endDate, appLink, leaveType } = params;

  return {
    subject: `Leave Request Submitted #${requestNumber} - Vodichron`,
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
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 40px; text-align: center;">
                      <img src="cid:vodichron-logo" alt="Vodichron" style="height: 50px; margin-bottom: 15px;" />
                      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Leave Request Submitted</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <p style="color: #333333; font-size: 16px; margin: 0 0 20px 0;">Dear ${employeeName},</p>
                      
                      <p style="color: #555555; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
                        Your leave request has been <strong>successfully submitted</strong> and is awaiting approval from your manager.
                      </p>
                      
                      <!-- Leave Details Table -->
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 30px 0; border: 1px solid #e0e0e0; border-radius: 6px; overflow: hidden;">
                        <tr>
                          <td style="padding: 12px 20px; background-color: #f8f9fa; border-bottom: 1px solid #e0e0e0; font-weight: 600; color: #333333; width: 40%;">Request Number:</td>
                          <td style="padding: 12px 20px; background-color: #ffffff; border-bottom: 1px solid #e0e0e0; color: #555555;">#${requestNumber}</td>
                        </tr>
                        <tr>
                          <td style="padding: 12px 20px; background-color: #f8f9fa; border-bottom: 1px solid #e0e0e0; font-weight: 600; color: #333333;">Leave Type:</td>
                          <td style="padding: 12px 20px; background-color: #ffffff; border-bottom: 1px solid #e0e0e0; color: #555555;">${leaveType}</td>
                        </tr>
                        <tr>
                          <td style="padding: 12px 20px; background-color: #f8f9fa; border-bottom: 1px solid #e0e0e0; font-weight: 600; color: #333333;">Duration:</td>
                          <td style="padding: 12px 20px; background-color: #ffffff; border-bottom: 1px solid #e0e0e0; color: #555555;">${leaveDays} day(s)</td>
                        </tr>
                        <tr>
                          <td style="padding: 12px 20px; background-color: #f8f9fa; border-bottom: 1px solid #e0e0e0; font-weight: 600; color: #333333;">Start Date:</td>
                          <td style="padding: 12px 20px; background-color: #ffffff; border-bottom: 1px solid #e0e0e0; color: #555555;">${startDate}</td>
                        </tr>
                        <tr>
                          <td style="padding: 12px 20px; background-color: #f8f9fa; font-weight: 600; color: #333333;">End Date:</td>
                          <td style="padding: 12px 20px; background-color: #ffffff; color: #555555;">${endDate}</td>
                        </tr>
                      </table>
                      
                      <p style="color: #555555; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
                        You will receive an email notification once your leave request is reviewed.
                      </p>
                      
                      <!-- Login Button -->
                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td align="center" style="padding: 10px 0;">
                            <a href="${appLink}" style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">View Request</a>
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
