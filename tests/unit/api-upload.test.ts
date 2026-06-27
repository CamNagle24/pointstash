import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// Heavy IO is mocked: sharp (native), tesseract (dynamic import), @vercel/blob,
// and the OCR extractor. The real requireAuth guard runs against the mocked
// auth(); db is stubbed for the chain lookup. The validation branches all
// return before the image pipeline, so most tests never touch the mocks below.
const { authMock, chainFindUniqueMock, extractMock, putMock, toBufferMock, recognizeMock, terminateMock } =
  vi.hoisted(() => ({
    authMock: vi.fn(),
    chainFindUniqueMock: vi.fn(),
    extractMock: vi.fn(),
    putMock: vi.fn(),
    toBufferMock: vi.fn(),
    recognizeMock: vi.fn(),
    terminateMock: vi.fn(),
  }));
vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/db", () => ({ db: { chain: { findUnique: chainFindUniqueMock } } }));
vi.mock("@/lib/ocr", () => ({ extractPointsFromText: extractMock }));
vi.mock("@vercel/blob", () => ({ put: putMock }));
vi.mock("sharp", () => {
  const make = () => {
    const api: Record<string, unknown> = {};
    for (const m of ["rotate", "resize", "grayscale", "normalize", "webp"]) api[m] = () => api;
    api.toBuffer = toBufferMock;
    return api;
  };
  return { default: () => make() };
});
vi.mock("tesseract.js", () => ({
  createWorker: vi.fn(async () => ({ recognize: recognizeMock, terminate: terminateMock })),
}));

import { POST } from "@/app/api/upload/route";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const pngFile = () => {
  const f = new File([new Uint8Array([1, 2, 3])], "shot.png", { type: "image/png" });
  // jsdom's File doesn't implement arrayBuffer(); the route awaits it.
  if (typeof f.arrayBuffer !== "function") {
    Object.defineProperty(f, "arrayBuffer", {
      value: async () => new Uint8Array([1, 2, 3]).buffer,
    });
  }
  return f;
};

// The route only calls req.formData(); hand it the FormData directly rather
// than round-tripping through multipart (which drops the File's type/size).
function uploadReq({ file, chainSlug }: { file?: File; chainSlug?: string }) {
  const fd = new FormData();
  if (file !== undefined) fd.set("file", file);
  if (chainSlug !== undefined) fd.set("chainSlug", chainSlug);
  return { formData: async () => fd } as unknown as NextRequest;
}

beforeEach(() => {
  authMock.mockReset().mockResolvedValue({ user: { id: "u1", email: "u@x.com" } });
  chainFindUniqueMock.mockReset().mockResolvedValue({ id: "c1", slug: "wendys" });
  extractMock.mockReset().mockReturnValue({
    extractedPoints: 500,
    confidence: 0.9,
    matchedPattern: "points: N",
    rawText: "you have 500 points",
  });
  putMock.mockReset().mockResolvedValue({ url: "https://blob.example/shot.webp" });
  toBufferMock.mockReset().mockResolvedValue(Buffer.from("processed"));
  recognizeMock.mockReset().mockResolvedValue({ data: { text: "you have 500 points" } });
  terminateMock.mockReset().mockResolvedValue(undefined);
});

describe("POST /api/upload — guard & validation", () => {
  it("401s when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    expect((await POST(uploadReq({ file: pngFile(), chainSlug: "wendys" }))).status).toBe(401);
  });

  it("400s a missing file", async () => {
    const res = await POST(uploadReq({ chainSlug: "wendys" }));
    expect(res.status).toBe(400);
  });

  it("400s a missing chainSlug", async () => {
    const res = await POST(uploadReq({ file: pngFile() }));
    expect(res.status).toBe(400);
  });

  it("413s a file over the size limit", async () => {
    const big = pngFile();
    Object.defineProperty(big, "size", { value: MAX_FILE_BYTES + 1 });
    expect((await POST(uploadReq({ file: big, chainSlug: "wendys" }))).status).toBe(413);
  });

  it("400s a non-image file", async () => {
    const txt = new File(["hello"], "notes.txt", { type: "text/plain" });
    expect((await POST(uploadReq({ file: txt, chainSlug: "wendys" }))).status).toBe(400);
  });

  it("404s an unknown chain", async () => {
    chainFindUniqueMock.mockResolvedValue(null);
    const res = await POST(uploadReq({ file: pngFile(), chainSlug: "nope" }));
    expect(res.status).toBe(404);
  });

  it("400s a spoofed image (valid content-type, undecodable bytes)", async () => {
    toBufferMock.mockRejectedValue(new Error("Input buffer contains unsupported image format"));
    const res = await POST(uploadReq({ file: pngFile(), chainSlug: "wendys" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid image/i);
    // Never reaches OCR/blob storage for undecodable input.
    expect(putMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/upload — OCR happy path", () => {
  it("processes the image, runs OCR, stores the blob, and returns the extraction", async () => {
    const res = await POST(uploadReq({ file: pngFile(), chainSlug: "wendys" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      imageUrl: "https://blob.example/shot.webp",
      extractedPoints: 500,
      confidence: 0.9,
      matchedPattern: "points: N",
    });
    // rawText is withheld once points are found.
    expect(body.rawText).toBeUndefined();
    expect(extractMock).toHaveBeenCalledWith("you have 500 points", "wendys");
    expect(terminateMock).toHaveBeenCalled();
  });

  it("returns rawText when no points could be extracted", async () => {
    extractMock.mockReturnValue({
      extractedPoints: null,
      confidence: 0,
      matchedPattern: null,
      rawText: "unreadable",
    });
    const body = await (await POST(uploadReq({ file: pngFile(), chainSlug: "wendys" }))).json();
    expect(body.extractedPoints).toBeNull();
    expect(body.rawText).toBe("unreadable");
  });
});
