import nodemailer from "nodemailer";
import { isPhoneEmail } from "./util";

// Server-side only. Credentials come from environment variables.
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export type EmailResult = { ok: boolean; error?: string };

export async function sendEmail(to: string, subject: string, html: string): Promise<EmailResult> {
  // Phone-only accounts use a private, undeliverable login address: never try to email it.
  if (isPhoneEmail(to)) return { ok: false, error: "Phone-only account has no email address" };
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return { ok: false, error: "Gmail SMTP not configured" };
  }
  try {
    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME ?? "RK Stores"}" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "send failed" };
  }
}

// Gmail limits sending, so send in small batches with a pause.
// Use BCC-free individual emails so each delivery can be tracked.
export async function sendBulk(
  recipients: { id: string; email: string }[],
  subject: string,
  html: string,
  onResult: (userId: string, r: EmailResult) => Promise<void>
) {
  for (const r of recipients) {
    const res = await sendEmail(r.email, subject, html);
    await onResult(r.id, res);
    await new Promise((s) => setTimeout(s, 300));
  }
}
