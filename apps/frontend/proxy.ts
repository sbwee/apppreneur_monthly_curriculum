import { NextResponse, type NextRequest } from "next/server";

/** Must match AUTH_COOKIE_NAME in src/lib/auth.ts */
const AUTH_COOKIE_NAME = "ledger_session";

const PROTECTED_PREFIXES = ["/home", "/workspace", "/settings"];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies.get(AUTH_COOKIE_NAME)?.value === "1";
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authenticated = hasSessionCookie(request);

  if (isProtectedPath(pathname) && !authenticated) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/" && authenticated) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/home";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/home/:path*", "/workspace/:path*", "/settings/:path*"],
};
