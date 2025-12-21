/**
 * Email sending utility
 *
 * NOTE: This uses console.log for now. In production, integrate with:
 * - Resend (recommended)
 * - SendGrid
 * - AWS SES
 * - Postmark
 *
 * To implement with Resend:
 * 1. Install: npm install resend
 * 2. Add RESEND_API_KEY to .env
 * 3. Uncomment the Resend code below
 */

// import { Resend } from 'resend'
// const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    console.log('[Email] Sending email:', {
      to,
      subject,
      preview: html.substring(0, 100) + '...',
    });

    // TODO: Implement actual email sending
    // Uncomment this when ready:
    /*
    await resend.emails.send({
      from: 'GSC Diagnostics <noreply@yourdomain.com>',
      to,
      subject,
      html,
    })
    */

    // For now, just log
    console.log('[Email] Email would be sent to:', to);
    console.log('[Email] Subject:', subject);
    console.log('[Email] HTML preview:', html.substring(0, 200));

    return { success: true };
  } catch (error) {
    console.error('[Email] Failed to send email:', error);
    // Don't throw - email failure shouldn't break user flow
    // Log to error monitoring service in production
    return { success: false, error };
  }
}
