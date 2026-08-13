/**
 * Email Sending Integration
 * Handles transactional emails via Resend API
 */

import { Resend } from "resend";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@aether-os.com";
const FROM_NAME = process.env.FROM_NAME || "Aether OS";

export interface OutreachEmailParams {
  userId: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  html: string;
  plainText: string;
}

/**
 * Build professional outreach email HTML
 */
export function buildOutreachEmailHtml(params: {
  recipientName: string;
  subject: string;
  body: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { margin-bottom: 20px; }
    .body { margin: 20px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
    .signature { margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <p>Hi ${params.recipientName},</p>
    </div>

    <div class="body">
      ${params.body}
    </div>

    <div class="signature">
      <p>Best regards,<br/>Aether</p>
    </div>

    <div class="footer">
      <p>This message was sent by <strong>Aether</strong>, your AI career copilot.</p>
      <p><a href="https://aether-os.com/unsubscribe" style="color: #666; text-decoration: none;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Send outreach email and log to database
 */
export async function sendOutreachEmail(
  params: OutreachEmailParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Send email via Resend
    const result = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: params.recipientEmail,
      subject: params.subject,
      html: params.html,
      text: params.plainText,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    const messageId = result.data?.id;

    // Log to database
    const { error: dbError } = await supabaseAdmin.from("email_log").insert({
      user_id: params.userId,
      recipient_email: params.recipientEmail,
      recipient_name: params.recipientName,
      subject: params.subject,
      message_id: messageId,
      status: "sent",
      sent_at: new Date().toISOString(),
    });

    if (dbError) {
      console.error("Failed to log outreach:", dbError);
    }

    return {
      success: true,
      messageId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Log failed send to database
    await supabaseAdmin.from("email_log").insert({
      user_id: params.userId,
      recipient_email: params.recipientEmail,
      recipient_name: params.recipientName,
      subject: params.subject,
      status: "failed",
      error: errorMessage,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Send batch outreach emails
 */
export async function sendBatchOutreachEmails(
  params: OutreachEmailParams[]
): Promise<Array<{ email: string; success: boolean; messageId?: string }>> {
  return Promise.all(
    params.map(async (param) => {
      const result = await sendOutreachEmail(param);
      return {
        email: param.recipientEmail,
        success: result.success,
        messageId: result.messageId,
      };
    })
  );
}
