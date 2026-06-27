import { Resend } from "resend";
import { signUnsubscribeToken, unsubscribeSecret } from "@/lib/unsubscribe-token";

// Deliberately independent of src/lib/affordable-alerts.ts's AffordableCandidate
// (which pairs an account with a RedemptionOption) — the email only needs these
// four display fields, so the cron route can flatten whatever detection shape
// it ends up with into this instead of coupling the two modules together.
export interface AffordableRedemptionItem {
  chainSlug: string;
  chainName: string;
  itemName: string;
  pointsCost: number;
}

// Mirrors the Resend setup in deal-reminder-email.ts: send when
// RESEND_API_KEY is configured, otherwise (in dev) log a summary so the flow
// can be exercised without actually emailing anyone.
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

// Absolute one-click unsubscribe URL for `userId`, or "" when no signing secret
// is configured (the email then falls back to the Settings-only footer copy).
function buildUnsubscribeUrl(userId: string): string {
  const secret = unsubscribeSecret();
  if (!secret) return "";
  const token = signUnsubscribeToken(userId, secret);
  return `${appBaseUrl()}/api/unsubscribe?token=${encodeURIComponent(token)}`;
}

function redeemUrl(chainSlug: string): string {
  return `${appBaseUrl()}/dashboard/redeem?chain=${encodeURIComponent(chainSlug)}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type AffordableAlertSendResult = "sent" | "logged";

/**
 * Email a user the redemptions they can now afford. Returns "sent" when the
 * email went out via Resend, or "logged" when RESEND_API_KEY isn't configured
 * (dev). Throws if Resend returns an error or the key is missing in
 * production. Mirrors sendExpiringDealsEmail's plumbing, but with "you can
 * now afford this" framing rather than expiry urgency.
 */
export async function sendAffordableRedemptionEmail({
  to,
  name,
  userId,
  items,
}: {
  to: string;
  name: string | null;
  userId: string;
  items: AffordableRedemptionItem[];
}): Promise<AffordableAlertSendResult> {
  const resend = getResend();
  const unsubscribeUrl = buildUnsubscribeUrl(userId);
  const count = items.length;
  const subject =
    count === 1
      ? `You can now afford: ${items[0].itemName}`
      : `${count} redemptions you can now afford`;

  if (!resend) {
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[affordable-alert-email] RESEND_API_KEY not set — would email ${to}: ` +
          items.map((i) => `${i.chainName}: ${i.itemName} (${i.pointsCost} pts)`).join("; "),
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
    html: buildHtml({ greeting, items, unsubscribeUrl }),
    text: buildText({ greeting, items, unsubscribeUrl }),
    // One-click unsubscribe (RFC 8058) so inbox providers can honor it and the
    // sender reputation stays healthy. Only set when we could sign a token.
    ...(unsubscribeUrl
      ? {
          headers: {
            "List-Unsubscribe": `<${unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        }
      : {}),
  });

  if (error) throw new Error(error.message ?? "Email send failed");
  return "sent";
}

function buildHtml({
  greeting,
  items,
  unsubscribeUrl,
}: {
  greeting: string;
  items: AffordableRedemptionItem[];
  unsubscribeUrl: string;
}): string {
  const rows = items
    .map((item) => {
      const link = redeemUrl(item.chainSlug);
      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #262626;">
            <p style="margin:0;font-size:12px;color:#a3a3a3;text-transform:uppercase;letter-spacing:0.1em;">${escapeHtml(item.chainName)}</p>
            <p style="margin:4px 0 0;font-size:15px;line-height:1.4;">
              <a href="${escapeHtml(link)}" style="color:#fafafa;text-decoration:none;font-weight:600;">${escapeHtml(item.itemName)}</a>
            </p>
            <p style="margin:4px 0 0;font-size:13px;color:#22c55e;">${item.pointsCost.toLocaleString()} pts — you have enough</p>
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
                <h1 style="font-size:24px;font-weight:600;margin:0 0 16px;color:#fafafa;">Good news — you can redeem now</h1>
                <p style="font-size:15px;line-height:1.5;color:#d4d4d4;margin:0 0 20px;">${greeting}</p>
                <p style="font-size:15px;line-height:1.5;color:#d4d4d4;margin:0 0 8px;">
                  Your balance now covers these redemptions — tap one to go redeem it:
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
                <p style="font-size:13px;line-height:1.5;color:#737373;margin:24px 0 0;border-top:1px solid #262626;padding-top:16px;">
                  You're getting this because affordable-redemption alerts are on.${
                    unsubscribeUrl
                      ? ` <a href="${escapeHtml(unsubscribeUrl)}" style="color:#a3a3a3;text-decoration:underline;">Unsubscribe</a> or manage alerts in Settings → Notifications.`
                      : " Turn them off any time in Settings → Notifications."
                  }
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
  items,
  unsubscribeUrl,
}: {
  greeting: string;
  items: AffordableRedemptionItem[];
  unsubscribeUrl: string;
}): string {
  return [
    "PointStash — you can now afford these redemptions",
    "",
    greeting,
    "",
    "Your balance now covers these redemptions:",
    "",
    ...items.map((item) => {
      const base = `- ${item.chainName}: ${item.itemName} (${item.pointsCost.toLocaleString()} pts)`;
      return `${base}\n  ${redeemUrl(item.chainSlug)}`;
    }),
    "",
    unsubscribeUrl
      ? `Unsubscribe from these emails: ${unsubscribeUrl}`
      : "Turn off affordable-redemption alerts any time in Settings → Notifications.",
  ].join("\n");
}
