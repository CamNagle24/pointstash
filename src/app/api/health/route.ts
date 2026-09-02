import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({
    ok: true,
    version: process.env.npm_package_version ?? null,
    timestamp: new Date().toISOString(),
  });
}
