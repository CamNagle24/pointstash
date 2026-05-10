import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const PROTECTED = ["/dashboard"];
const AUTH_PAGES = ["/login", "/signup"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthed = !!req.auth;
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isAuthPage = AUTH_PAGES.some((p) => pathname === p);

  if (!isAuthed && isProtected) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
  if (isAuthed && isAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  // Skip Next internals, the auth route, and static assets — let everything
  // else run through the middleware so we can gate /dashboard.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|chains|.*\\..*).*)"],
};
