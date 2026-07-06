import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock auth so that auth(handler) simply returns handler — this lets us import
// the middleware's default export as a plain function we can call directly,
// with req.auth set however each test needs.
vi.mock("@/lib/auth", () => ({
  auth: vi.fn((handler: (req: unknown) => unknown) => handler),
}));

// Middleware lives at the repo root (not under src/), so we use a relative import.
import middleware from "../../middleware";

type AuthedRequest = NextRequest & { auth: object | null };

function makeReq(pathname: string, session: object | null = null): AuthedRequest {
  const req = new NextRequest(`http://localhost${pathname}`) as AuthedRequest;
  req.auth = session;
  return req;
}

// The mocked middleware returns Response | null | void — cast to Response for assertions.
async function runMiddleware(req: AuthedRequest): Promise<Response> {
  return (await (middleware as unknown as (r: AuthedRequest) => Promise<Response>)(req));
}

const authed = { user: { id: "u1", email: "test@example.com" } };

describe("middleware", () => {
  it("redirects unauthenticated /dashboard to /login with ?from=%2Fdashboard", async () => {
    const res = await runMiddleware(makeReq("/dashboard"));
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/login");
    expect(location).toContain("from=%2Fdashboard");
  });

  it("redirects unauthenticated /dashboard/settings to /login with ?from preserved", async () => {
    const res = await runMiddleware(makeReq("/dashboard/settings"));
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/login");
    expect(location).toContain("from=");
  });

  it("redirects authenticated /login to /dashboard", async () => {
    const res = await runMiddleware(makeReq("/login", authed));
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/dashboard");
    expect(location).not.toContain("/login");
  });

  it("authenticated /signup also redirects to /dashboard", async () => {
    const res = await runMiddleware(makeReq("/signup", authed));
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/dashboard");
  });

  it("passes through unauthenticated / (public path) without redirecting", async () => {
    const res = await runMiddleware(makeReq("/", null));
    expect(res.headers.get("location")).toBeNull();
  });

  it("passes through authenticated /dashboard without redirecting", async () => {
    const res = await runMiddleware(makeReq("/dashboard", authed));
    expect(res.headers.get("location")).toBeNull();
  });
});
