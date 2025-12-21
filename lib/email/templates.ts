/**
 * Email templates for GSC product
 */

export function getWelcomeEmail(email: string, magicLink: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return {
    subject: 'Welcome to Your GSC Diagnostic Report',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="color: #2563eb; margin: 0; font-size: 28px;">Thank You for Your Purchase!</h1>
          </div>

          <!-- Success Icon -->
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; width: 60px; height: 60px; border-radius: 50%; background-color: #10b981; color: white; font-size: 36px; line-height: 60px;">✓</div>
          </div>

          <!-- Body -->
          <div style="background-color: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 30px;">
            <p style="margin: 0 0 20px 0; font-size: 16px;">Your GSC diagnostic report is ready to generate!</p>

            <h2 style="color: #1f2937; font-size: 20px; margin: 0 0 15px 0;">Next Steps:</h2>
            <ol style="margin: 0; padding-left: 20px; color: #4b5563;">
              <li style="margin-bottom: 10px;">Click the button below to access your account</li>
              <li style="margin-bottom: 10px;">Connect your Google Search Console</li>
              <li style="margin-bottom: 10px;">Generate your report</li>
            </ol>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 40px 0;">
            <a href="${magicLink}"
               style="display: inline-block; background-color: #2563eb; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Access My Account
            </a>
          </div>

          <!-- Account Info -->
          <div style="background-color: #eff6ff; border-left: 4px solid: #2563eb; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; color: #1e40af;">
              <strong>Your login email:</strong> ${email}
            </p>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 10px 0; font-size: 13px; color: #6b7280;">
              This login link expires in 24 hours.
            </p>
            <p style="margin: 0; font-size: 13px; color: #6b7280;">
              Need help? Visit <a href="${appUrl}/support" style="color: #2563eb; text-decoration: none;">our support page</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  };
}

export function getReportGeneratedEmail(email: string, reportUrl: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return {
    subject: 'Your GSC Report is Ready to View',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="color: #2563eb; margin: 0; font-size: 28px;">Your Report is Ready!</h1>
          </div>

          <!-- Body -->
          <p style="font-size: 16px; margin-bottom: 30px;">
            Your Google Search Console diagnostic report has been successfully generated and is ready to view.
          </p>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 40px 0;">
            <a href="${reportUrl}"
               style="display: inline-block; background-color: #2563eb; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View My Report
            </a>
          </div>

          <!-- Upsell -->
          <div style="background-color: #f9fafb; border-radius: 8px; padding: 30px; margin: 30px 0;">
            <h3 style="color: #1f2937; font-size: 18px; margin: 0 0 15px 0;">Want to analyze another site?</h3>
            <p style="margin: 0 0 20px 0; color: #4b5563;">
              Purchase another report for just $9.99 to analyze a different property or get updated data.
            </p>
            <div style="text-align: center;">
              <a href="${appUrl}/pricing"
                 style="display: inline-block; background-color: white; color: #2563eb; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; border: 2px solid #2563eb;">
                Buy Another Report
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; font-size: 13px; color: #6b7280;">
              Need help? Visit <a href="${appUrl}/support" style="color: #2563eb; text-decoration: none;">our support page</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  };
}
