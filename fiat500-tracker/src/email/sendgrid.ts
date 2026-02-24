import sgMail from '@sendgrid/mail';
import { env } from '../config/env.js';

if (env.SENDGRID_API_KEY) {
  sgMail.setApiKey(env.SENDGRID_API_KEY);
}

export async function sendEmail(params: {
  to: string;
  from: string;
  subject: string;
  body: string;
  replyTo?: string;
}): Promise<boolean> {
  if (!env.SENDGRID_API_KEY) {
    console.warn('[SendGrid] No API key configured — email not sent');
    return false;
  }

  try {
    await sgMail.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.body,
      replyTo: params.replyTo,
    });
    console.log(`[SendGrid] Email sent to ${params.to}: ${params.subject}`);
    return true;
  } catch (err) {
    console.error('[SendGrid] Failed to send email:', err);
    return false;
  }
}
