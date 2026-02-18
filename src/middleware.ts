import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware for optional authentication.
 * Only enforced when AUTH_ENABLED=true.
 * API routes and static assets are excluded from auth checks.
 */
export function middleware(request: NextRequest) {
  const authEnabled = process.env.AUTH_ENABLED === "true";

  if (!authEnabled) {
    return NextResponse.next();
  }

  // Allow auth routes, static files, and API routes through
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/uploads")
  ) {
    return NextResponse.next();
  }

  // Check for auth session cookie
  const sessionToken =
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value;

  if (!sessionToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
