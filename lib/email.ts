interface SendEmailProps {
  to: string;
  subject: string;
  html: string;
}

/**
 * Email service supporting Resend and SMTP
 *
 * Environment variables:
 * - EMAIL_PROVIDER: "resend" or "smtp"
 * - RESEND_API_KEY: API key for Resend
 * - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD: SMTP config
 * - EMAIL_FROM: Sender email address
 */
export async function sendEmail({
  to,
  subject,
  html,
}: SendEmailProps): Promise<void> {
  const provider = process.env.EMAIL_PROVIDER || "smtp";
  const from = process.env.EMAIL_FROM || "noreply@dropboard.app";

  if (provider === "resend") {
    await sendWithResend({ to, subject, html, from });
  } else {
    await sendWithSMTP({ to, subject, html, from });
  }
}

async function sendWithResend({
  to,
  subject,
  html,
  from,
}: SendEmailProps & { from: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend error: ${error}`);
  }
}

async function sendWithSMTP({
  to,
  subject,
  html,
  from,
}: SendEmailProps & { from: string }): Promise<void> {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error(
      "SMTP configuration incomplete. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD",
    );
  }

  // Dynamic import for nodemailer (server-only)
  const nodemailer = await import("nodemailer");

  const transporter = nodemailer.default.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  await transporter.sendMail({
    from,
    to,
    subject,
    html,
  });
}

/**
 * Generate reset password email HTML
 */
export function getResetPasswordEmailHtml(resetUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">🔐 Password Reset</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p>Hi there,</p>
    
    <p>You requested to reset your password. Click the button below to create a new password:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
        Reset Password
      </a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px;">This link will expire in 1 hour.</p>
    
    <p style="color: #6b7280; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
    
    <p style="color: #9ca3af; font-size: 12px; text-align: center;">
      Dropboard - Your personal drop board
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate team invite email HTML
 */
export function getTeamInviteEmailHtml(params: {
  inviteUrl: string;
  workspaceName: string;
  inviterName: string;
  role: string;
}): string {
  const { inviteUrl, workspaceName, inviterName, role } = params;
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Invite</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">👋 You're Invited!</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p>Hi there,</p>
    
    <p><strong>${inviterName}</strong> has invited you to join <strong>${workspaceName}</strong> as a <strong>${role}</strong>.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${inviteUrl}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
        Accept Invite
      </a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px;">This invite will expire in 7 days.</p>
    
    <p style="color: #6b7280; font-size: 14px;">If you weren't expecting this invite, you can safely ignore this email.</p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
    
    <p style="color: #9ca3af; font-size: 12px; text-align: center;">
      Dropboard - Your personal drop board
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send team invite email
 */
export async function sendTeamInviteEmail(params: {
  to: string;
  inviteUrl: string;
  workspaceName: string;
  inviterName: string;
  role: string;
}): Promise<void> {
  const { to, inviteUrl, workspaceName, inviterName, role } = params;
  await sendEmail({
    to,
    subject: `${inviterName} invited you to ${workspaceName} - Dropboard`,
    html: getTeamInviteEmailHtml({
      inviteUrl,
      workspaceName,
      inviterName,
      role,
    }),
  });
}
