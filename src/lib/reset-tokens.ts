import crypto from "node:crypto";
import { Resend } from "resend";

// One hour is the industry standard for password-reset link TTL — long enough
// that the email doesn't expire while sitting in the user's inbox, short
// enough that a leaked link doesn't stay live.
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function mintResetToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function resetTokenExpiry(): Date {
  return new Date(Date.now() + RESET_TOKEN_TTL_MS);
}

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL ??
    process.env.AUTH_URL ??
    "http://localhost:3000"
  );
}

export async function sendResetEmail({
  to,
  token,
  name,
}: {
  to: string;
  token: string;
  name?: string | null;
}): Promise<void> {
  const resend = getResend();
  const link = `${appBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;

  if (!resend) {
    // RESEND_API_KEY missing — log the link so dev can still test the flow
    // without signing up for Resend. Never log this in production.
    if (process.env.NODE_ENV !== "production") {
      console.log("[reset-tokens] RESEND_API_KEY not set — reset link:", link);
      return;
    }
    throw new Error("RESEND_API_KEY is not configured");
  }

  const from = process.env.RESEND_FROM_EMAIL ?? "PointStash <onboarding@resend.dev>";
  const greeting = name ? `Hi ${name},` : "Hi there,";

  const { error } = await resend.emails.send({
    from,
    to,
    subject: "Reset your PointStash password",
    html: buildHtml({ greeting, link }),
    text: buildText({ greeting, link }),
  });

  if (error) throw new Error(error.message ?? "Email send failed");
}

function buildHtml({ greeting, link }: { greeting: string; link: string }) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#0a0a0b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#fafafa;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0b;padding:40px 20px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#171717;border:1px solid #262626;border-radius:16px;padding:32px;">
            <tr>
              <td>
                <p style="font-size:14px;color:#a3a3a3;margin:0 0 24px;letter-spacing:0.2em;text-transform:uppercase;">PointStash</p>
                <h1 style="font-size:24px;font-weight:600;margin:0 0 16px;color:#fafafa;">Reset your password</h1>
                <p style="font-size:15px;line-height:1.5;color:#d4d4d4;margin:0 0 12px;">${greeting}</p>
                <p style="font-size:15px;line-height:1.5;color:#d4d4d4;margin:0 0 24px;">
                  Someone (hopefully you) asked to reset your PointStash password. Click the button below to set a new one. This link expires in 1 hour.
                </p>
                <p style="margin:0 0 24px;">
                  <a href="${link}" style="display:inline-block;background:#f59e0b;color:#0a0a0b;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:15px;">Reset password</a>
                </p>
                <p style="font-size:13px;line-height:1.5;color:#737373;margin:0 0 8px;">
                  Or paste this URL into your browser:
                </p>
                <p style="font-size:12px;line-height:1.5;color:#a3a3a3;word-break:break-all;margin:0 0 24px;">${link}</p>
                <p style="font-size:13px;line-height:1.5;color:#737373;margin:24px 0 0;border-top:1px solid #262626;padding-top:16px;">
                  Didn't request this? You can safely ignore this email — your password won't change.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildText({ greeting, link }: { greeting: string; link: string }) {
  return [
    "PointStash — reset your password",
    "",
    greeting,
    "",
    "Someone (hopefully you) asked to reset your PointStash password.",
    "Open this link to set a new one. It expires in 1 hour.",
    "",
    link,
    "",
    "Didn't request this? Ignore this email — your password won't change.",
  ].join("\n");
}
