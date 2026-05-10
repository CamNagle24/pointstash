import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAuth, chainSelect, errorJson } from "@/lib/api";

export const runtime = "nodejs";

export async function GET() {
  try {
    const guard = await requireAuth();
    if ("response" in guard) return guard.response;

    const accounts = await db.account.findMany({
      where: { userId: guard.userId, isActive: true },
      include: { chain: chainSelect() },
      orderBy: { currentPoints: "desc" },
    });

    return NextResponse.json({ accounts });
  } catch (err) {
    console.error("[GET /api/accounts]", err);
    return errorJson("Failed to load accounts", 500);
  }
}

const createSchema = z.object({
  chainSlug: z.string().min(1),
  loyaltyId: z.string().optional(),
  currentPoints: z.number().int().nonnegative().optional(),
  syncMethod: z.enum(["MANUAL", "SCREENSHOT", "API", "SCRAPE"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const guard = await requireAuth();
    if ("response" in guard) return guard.response;

    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return errorJson("Invalid input", 400, parsed.error.flatten());
    }

    const chain = await db.chain.findUnique({ where: { slug: parsed.data.chainSlug } });
    if (!chain) return errorJson("Chain not found", 404);

    try {
      const account = await db.account.create({
        data: {
          userId: guard.userId,
          chainId: chain.id,
          loyaltyId: parsed.data.loyaltyId,
          currentPoints: parsed.data.currentPoints ?? 0,
          syncMethod: parsed.data.syncMethod ?? "MANUAL",
          lastSynced: parsed.data.currentPoints != null ? new Date() : null,
        },
        include: { chain: chainSelect() },
      });
      return NextResponse.json(account, { status: 201 });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return errorJson("Account already exists for this chain", 409);
      }
      throw err;
    }
  } catch (err) {
    console.error("[POST /api/accounts]", err);
    return errorJson("Failed to create account", 500);
  }
}
