import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyUnsubscribeToken, unsubscribeSecret } from "@/lib/unsubscribe-token";

export const runtime = "nodejs";

// GET /api/unsubscribe?token=...
// One-click unsubscribe target for the expiring-deal reminder email. The token
// is a stateless HMAC of the user id (see unsubscribe-token.ts), so this works
// even when the recipient isn't signed in / opens the email on another device.
// Turning the alert back on is a single toggle in Settings → Notifications.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const secret = unsubscribeSecret();

  if (!token || !secret) {
    return htmlResponse(
      400,
      "Invalid link",
      "This unsubscribe link is missing or malformed. You can manage email alerts in Settings → Notifications.",
    );
  }

  const userId = verifyUnsubscribeToken(token, secret);
  if (!userId) {
    return htmlResponse(
      400,
      "Invalid link",
      "This unsubscribe link is no longer valid. You can manage email alerts in Settings → Notifications.",
    );
  }

  try {
    // Idempotent: updateMany so an already-unsubscribed or deleted user is a
    // no-op rather than an error (the user clicked a valid link either way).
    await db.user.updateMany({ where: { id: userId }, data: { notifyExpiring: false } });
  } catch (err) {
    console.error("[GET /api/unsubscribe]", err);
    return htmlResponse(
      500,
      "Something went wrong",
      "We couldn't update your preferences just now. Please try again, or turn alerts off in Settings → Notifications.",
    );
  }

  return htmlResponse(
    200,
    "You're unsubscribed",
    "You won't get any more expiring-deal emails. Changed your mind? Turn them back on any time in Settings → Notifications.",
  );
}

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL ??
    process.env.AUTH_URL ??
    "http://localhost:3000"
  );
}

function htmlResponse(status: number, heading: string, body: string): Response {
  const settingsUrl = `${appBaseUrl()}/dashboard/settings`;
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>${heading} — PointStash</title>
  </head>
  <body style="margin:0;padding:0;background:#0a0a0b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#fafafa;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0b;padding:40px 20px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#171717;border:1px solid #262626;border-radius:16px;padding:32px;">
            <tr>
              <td>
                <p style="font-size:14px;color:#a3a3a3;margin:0 0 24px;letter-spacing:0.2em;text-transform:uppercase;">PointStash</p>
                <h1 style="font-size:24px;font-weight:600;margin:0 0 16px;color:#fafafa;">${heading}</h1>
                <p style="font-size:15px;line-height:1.5;color:#d4d4d4;margin:0 0 24px;">${body}</p>
                <p style="margin:0;">
                  <a href="${settingsUrl}" style="display:inline-block;background:#f59e0b;color:#0a0a0b;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:15px;">Go to Settings</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  return new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
