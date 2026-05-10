import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import sharp from "sharp";
import { db } from "@/lib/db";
import { requireAuth, errorJson } from "@/lib/api";
import { extractPointsFromText } from "@/lib/ocr";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const guard = await requireAuth();
    if ("response" in guard) return guard.response;

    const form = await req.formData().catch(() => null);
    if (!form) return errorJson("Invalid multipart body", 400);

    const file = form.get("file");
    const chainSlug = form.get("chainSlug")?.toString();

    if (!(file instanceof File)) return errorJson("Missing file", 400);
    if (!chainSlug) return errorJson("Missing chainSlug", 400);
    if (file.size > MAX_FILE_BYTES) return errorJson("File too large (max 10MB)", 413);
    if (!file.type.startsWith("image/")) return errorJson("File must be an image", 400);

    const chain = await db.chain.findUnique({ where: { slug: chainSlug } });
    if (!chain) return errorJson("Chain not found", 404);

    const original = Buffer.from(await file.arrayBuffer());
    const processed = await sharp(original)
      .rotate()
      .resize({ width: 1400, withoutEnlargement: true })
      .grayscale()
      .normalize()
      .webp({ quality: 85 })
      .toBuffer();

    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");
    let rawText = "";
    try {
      const result = await worker.recognize(processed);
      rawText = result.data.text;
    } finally {
      await worker.terminate();
    }

    const extraction = extractPointsFromText(rawText, chainSlug);

    const blob = await put(
      `screenshots/${guard.userId}/${Date.now()}-${chainSlug}.webp`,
      processed,
      { access: "public", contentType: "image/webp" },
    );

    return NextResponse.json({
      imageUrl: blob.url,
      extractedPoints: extraction.extractedPoints,
      confidence: extraction.confidence,
      matchedPattern: extraction.matchedPattern,
      rawText: extraction.extractedPoints === null ? extraction.rawText : undefined,
    });
  } catch (err) {
    console.error("[POST /api/upload]", err);
    return errorJson("Failed to process upload", 500);
  }
}
