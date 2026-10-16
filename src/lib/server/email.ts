import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { isPlaceholderEmail } from "@/lib/emails";

// Gmail SMTP via an App Password (spec Section 12). Failures are logged and
// never block the in-app flow.

let transporter: Transporter | null = null;

function getTransporter() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return null;
  transporter ??= nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, "") },
  });
  return transporter;
}

export const appUrl = (path = "") => `${(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "")}${path}`;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** The single CampusOne template: header, body paragraphs, one teal button. */
export function renderEmail({ heading, paragraphs, buttonText, buttonPath }: { heading: string; paragraphs: string[]; buttonText: string; buttonPath: string }) {
  const body = paragraphs.map((p) => `<p style="margin:0 0 14px;line-height:1.55;color:#1f2937">${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
  return `<!doctype html><html><body style="margin:0;background:#f4f4f8;font-family:Segoe UI,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#031716;padding:18px 24px;color:#ffffff;font-size:18px;font-weight:600">Campus<span style="color:#6BA3BE">One</span></td></tr>
<tr><td style="padding:24px">
<h1 style="margin:0 0 16px;font-size:20px;color:#111827">${esc(heading)}</h1>
${body}
<a href="${appUrl(buttonPath)}" style="display:inline-block;margin-top:8px;background:#0C969C;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">${esc(buttonText)}</a>
</td></tr>
<tr><td style="padding:16px 24px;color:#6b7280;font-size:12px;border-top:1px solid #eee">Connect the communities.</td></tr>
</table></td></tr></table></body></html>`;
}

export async function sendEmail({ to, subject, html, text }: { to: string | string[]; subject: string; html: string; text: string }) {
  const t = getTransporter();
  const recipients = (Array.isArray(to) ? to : [to]).filter((e) => !isPlaceholderEmail(e));
  if (!t) {
    console.info(`[email] skipped (Gmail not configured): "${subject}" -> ${recipients.join(", ")}`);
    return { sent: false, reason: "not_configured" as const };
  }
  if (!recipients.length) return { sent: false, reason: "no_recipient" as const };
  try {
    await t.sendMail({ from: `CampusOne <${process.env.GMAIL_USER}>`, to: recipients.join(", "), subject, html, text });
    return { sent: true as const };
  } catch (e) {
    console.error("[email] send failed", e);
    return { sent: false, reason: "error" as const };
  }
}
