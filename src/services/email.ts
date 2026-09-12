import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { db } from '../db/index.js';

export interface SendEmailOptions {
  to: string;
  subject: string;
  body: string;
  attachResume?: boolean;
  resumeFilePath?: string;
  resumeFileName?: string;
}

/**
 * Creates Nodemailer transporter using saved settings
 */
function createTransporter() {
  const settings = db.getSettings();

  if (!settings.gmailAddress || !settings.gmailAppPassword) {
    throw new Error(
      'Gmail address or App Password is not configured. Please configure it in the Settings page.'
    );
  }

  // Clean password (remove spaces if user pasted from Google with spaces)
  const cleanPassword = settings.gmailAppPassword.replace(/\s+/g, '');

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: settings.gmailAddress.trim(),
      pass: cleanPassword,
    },
  });
}

/**
 * Verifies email credentials by connecting to Gmail SMTP
 */
export async function testGmailConnection(
  gmailAddress: string,
  appPassword: string
): Promise<{ success: boolean; message: string }> {
  try {
    const cleanPassword = appPassword.replace(/\s+/g, '');
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: gmailAddress.trim(),
        pass: cleanPassword,
      },
    });

    await transporter.verify();
    return {
      success: true,
      message: `Successfully authenticated with Gmail as ${gmailAddress}`,
    };
  } catch (err: any) {
    const rawMsg = err?.message || String(err);
    if (rawMsg.includes('534-5.7.9') || rawMsg.includes('Application-specific password required')) {
      return {
        success: false,
        message:
          'Google requires a 16-letter "App Password" instead of your normal account password. Please visit https://myaccount.google.com/apppasswords to create one named "Job Referral Agent", copy the 16 letters, and paste it here.',
      };
    }
    return {
      success: false,
      message: `Gmail SMTP Authentication failed: ${rawMsg}`,
    };
  }
}

/**
 * Sends a cold referral email with optional resume attachment
 */
export async function sendReferralEmail(
  options: SendEmailOptions
): Promise<{ messageId: string; success: boolean }> {
  const settings = db.getSettings();
  const transporter = createTransporter();

  const attachments: Array<{ filename: string; path: string }> = [];

  if (options.attachResume && options.resumeFilePath && fs.existsSync(options.resumeFilePath)) {
    attachments.push({
      filename: options.resumeFileName || path.basename(options.resumeFilePath),
      path: options.resumeFilePath,
    });
  }

  const senderHeader = settings.senderName
    ? `"${settings.senderName}" <${settings.gmailAddress}>`
    : settings.gmailAddress;

  // Convert plain text line breaks to clean HTML paragraphs
  const htmlBody = options.body
    .split(/\n\n+/)
    .map((p) => `<p style="margin: 0 0 12px 0; line-height: 1.6;">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');

  const mailOptions = {
    from: senderHeader,
    to: options.to,
    subject: options.subject,
    text: options.body,
    html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; color: #2d3748;">
      ${htmlBody}
    </div>`,
    attachments,
  };

  const info = await transporter.sendMail(mailOptions);
  return {
    messageId: info.messageId,
    success: true,
  };
}
