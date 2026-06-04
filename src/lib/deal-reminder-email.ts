import { Resend } from "resend";
import {
  reminderDealLink,
  expiresInLabel,
  type ReminderDeal,
} from "@/lib/deal-reminders";

// Mirrors the Resend setup in reset-tokens.ts: send when RESEND_API_KEY is
// configured, otherwise (in dev) log a summary so the flow can be exercised
// without actually emailing anyone.
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type ReminderSendResult = "sent" | "logged";

/**
 * Email a user the list of their soon-expiring deals. Returns "sent" when the
 * email went out via Resend, or "logged" when RESEND_API_KEY isn't configured
 * (dev). Throws if Resend returns an error or the key is missing in production.
 */
export async function sendExpiringDealsEmail({
  to,
  name,
  deals,
  now,
}: {
  to: string;
  name: string | null;
  deals: ReminderDeal[];
  now: Date;
}): Promise<ReminderSendResult> {
  const resend = getResend();
  const dealsUrl = `${appBaseUrl()}/dashboard/deals`;
  const count = deals.length;
  const subject =
    count === 1
      ? `A deal is expiring soon: ${deals[0].title}`
      : `${count} deals expiring soon`;

  if (!resend) {
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[deal-reminder-email] RESEND_API_KEY not set — would email ${to}: ` +
          deals.map((d) => `${d.chainName}: ${d.title} (${expiresInLabel(d, now)})`).join("; "),
      );
      return "logged";
    }
    throw new Error("RESEND_API_KEY is not configured");
  }

  const from = process.env.RESEND_FROM_EMAIL ?? "PointStash <onboarding@resend.dev>";
  const greeting = name ? `Hi ${name},` : "Hi there,";

  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    html: buildHtml({ greeting, deals, now, dealsUrl }),
    text: buildText({ greeting, deals, now, dealsUrl }),
  });

  if (error) throw new Error(error.message ?? "Email send failed");
  return "sent";
}

function buildHtml({
  greeting,
  deals,
  now,
  dealsUrl,
}: {
  greeting: string;
  deals: ReminderDeal[];
  now: Date;
  dealsUrl: string;
}): string {
  const rows = deals
    .map((d) => {
      const link = reminderDealLink(d);
      const titleCell = link
        ? `<a href="${escapeHtml(link)}" style="color:#fafafa;text-decoration:none;font-weight:600;">${escapeHtml(d.title)}</a>`
        : `<span style="color:#fafafa;font-weight:600;">${escapeHtml(d.title)}</span>`;
      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #262626;">
            <p style="margin:0;font-size:12px;color:#a3a3a3;text-transform:uppercase;letter-spacing:0.1em;">${escapeHtml(d.chainName)}</p>
            <p style="margin:4px 0 0;font-size:15px;line-height:1.4;">${titleCell}</p>
            <p style="margin:4px 0 0;font-size:13px;color:#f59e0b;">Expires ${escapeHtml(expiresInLabel(d, now))}</p>
          </td>
        </tr>`;
    })
    .join("");

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
                <h1 style="font-size:24px;font-weight:600;margin:0 0 16px;color:#fafafa;">Deals expiring soon</h1>
                <p style="font-size:15px;line-height:1.5;color:#d4d4d4;margin:0 0 20px;">${greeting}</p>
                <p style="font-size:15px;line-height:1.5;color:#d4d4d4;margin:0 0 8px;">
                  These deals for your chains are about to expire — tap a deal to jump straight to it:
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
                <p style="margin:28px 0 0;">
                  <a href="${escapeHtml(dealsUrl)}" style="display:inline-block;background:#f59e0b;color:#0a0a0b;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:15px;">See all your deals</a>
                </p>
                <p style="font-size:13px;line-height:1.5;color:#737373;margin:24px 0 0;border-top:1px solid #262626;padding-top:16px;">
                  You're getting this because expiring-deal alerts are on. Turn them off any time in Settings → Notifications.
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

function buildText({
  greeting,
  deals,
  now,
  dealsUrl,
}: {
  greeting: string;
  deals: ReminderDeal[];
  now: Date;
  dealsUrl: string;
}): string {
  return [
    "PointStash — deals expiring soon",
    "",
    greeting,
    "",
    "These deals for your chains are about to expire:",
    "",
    ...deals.map((d) => {
      const link = reminderDealLink(d);
      const base = `- ${d.chainName}: ${d.title} (expires ${expiresInLabel(d, now)})`;
      return link ? `${base}\n  ${link}` : base;
    }),
    "",
    `See all your deals: ${dealsUrl}`,
    "",
    "Turn off expiring-deal alerts any time in Settings → Notifications.",
  ].join("\n");
}
