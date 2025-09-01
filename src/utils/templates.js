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
  subscriptionTemplate: () => {
    return `
    <!DOCTYPE html>
    <html lang="en">

    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
      @media only screen and (max-width: 600px) {
        .container {
          width: 95%;
        }
      }
      @media only screen and (min-width: 601px) {
        .container {
         width: 50%;
        }
      }
    </style>
  </head>

    <body style='background-color:#fafaf5;padding-top:5px'>
      <div style='display:flex;margin-bottom:10px;margin-top:10px'>
        <img src='https://serene-chimera-01cee3.netlify.app/static/media/logo.8602b9819fe5c3195656.png' alt=''style='height:2.5rem;margin-left:auto;margin-right:auto' />
      </div>
      <div style='display:flex;border-radius:10px;padding:10px;height:max-content;'>
        <div class='container' style='background-color:white;margin-left:auto;margin-right:auto;border-radius:10px;padding:10px;height:max-content;'>
          <div style='text-align:center'>
            <img src='https://serene-chimera-01cee3.netlify.app/static/media/mail.03e2e15adf70c6f45509.png'style='height:225px;' />
          </div>
          <div>
            <p>Hi there,</p>
            <p>Congratualtions</strong> on your recent purchase of<strong> FormMatic subscription!</strong> We are excited to have you on board. You can access the details of your purchase in your Account.</p>
          </div>
        <p style='color:#333333'>Need assistance or have questions? Our dedicated team is ready to help. Reach out to us at <span style='color:#41ccad;cursor:pointer;text-decoration: none;'>support@FormMatic.com</span>, and we'll be more happy to assist you.</p>
          <div>
          <p>Best Regards,</p>
        </div>
        <div>
          <p>FormMatic Team</p>
        </div>
            <div style='text-align: center;'>
              <p style='color:#A3A9BB;font-size:0.7rem;'>© 2025 FormMatic Inc. All rights reserved.</p>
            </div>
          </div>

      </div>
    </body>
    `
  },
  subscriptionFailedTemplate: () => {
    return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      @media only screen and (max-width: 600px) {
        .container {
          width: 95%;
        }
      }
      @media only screen and (min-width: 601px) {
        .container {
          width: 50%;
        }
      }
    </style>
  </head>
  <body style="background-color:#fafaf5;padding-top:5px;">
    <div style="display:flex;margin:20px 0;">
      <img src="https://serene-chimera-01cee3.netlify.app/static/media/logo.8602b9819fe5c3195656.png" 
           alt="FormMatic Logo" 
           style="height:2.5rem;margin-left:auto;margin-right:auto;" />
    </div>
    <div style="display:flex;border-radius:10px;padding:10px;height:max-content;">
      <div class="container" 
           style="background-color:white;margin-left:auto;margin-right:auto;
                  border-radius:10px;padding:20px;height:max-content;
                  box-shadow:0 2px 6px rgba(0,0,0,0.1);">
        
        <div style="text-align:center;margin-bottom:15px;">
          <img src="https://cdn-icons-png.flaticon.com/512/463/463612.png" 
               alt="Payment Failed" 
               style="height:150px;" />
        </div>
        
        <div style="font-family:Arial, sans-serif;color:#333;">
          <p>Hi there,</p>
          <p>Unfortunately, your recent payment attempt for your <strong>FormMatic subscription</strong> was <strong>unsuccessful</strong>.</p>
          <p>Please check your payment method or update your billing details in your account to avoid any interruption in service.</p>
        </div>

        <p style="color:#333;">If you need assistance, our support team is here to help. Contact us at 
          <a href="mailto:support@FormMatic.com" 
             style="color:#41ccad;cursor:pointer;text-decoration:none;">support@FormMatic.com</a>.
        </p>

        <div style="margin-top:20px;">
          <p>Best Regards,</p>
          <p><strong>FormMatic Team</strong></p>
        </div>

        <div style="text-align:center;margin-top:20px;">
          <p style="color:#A3A9BB;font-size:0.7rem;">© 2025 FormMatic Inc. All rights reserved.</p>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;
  },

};
