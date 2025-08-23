module.exports = {
  createUserTemplate: (name, url) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0; padding:0; background-color:#fafaf5;">
        
        <!-- Full width wrapper -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#fafaf5;">
          <tr>
            <td align="center" style="padding:20px;">
              
              <!-- Inner container -->
              <table role="presentation" width="100%" style="max-width:600px; background:#ffffff; border-radius:10px;" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding:20px; font-family:Arial, sans-serif; color:#333;">
                    
                    <p>Hi ${name},</p>
                    <p>Exciting news! You’ve received an invitation to join FormMatic. Let’s get started!</p>
                    <p>Welcome to FormMatic - where your visual journey begins!</p>
                    
                    <!-- Button -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" bgcolor="#41ccad" style="border-radius:5px; padding:12px;">
                          <a href="${url}" target="_blank" 
                            style="font-family:Arial, sans-serif; font-size:16px; color:#ffffff; text-decoration:none; display:block;">
                            Go to FormMatic
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin-top:20px;">Best Regards,</p>
                    <p>FormMatic Team</p>

                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>

      </body>
      </html>
    `;
  },
};
