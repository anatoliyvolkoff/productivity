import { NextResponse, type NextRequest } from "next/server";
import { authEnabled, safeEqual, SESSION_COOKIE, sessionToken } from "@/lib/auth";

/** When APP_PASSWORD is set, every page, action and API route needs the session cookie. */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const headers = new Headers(request.headers);
  headers.set("x-pos-path", pathname);

  if (!authEnabled() || pathname === "/login") return NextResponse.next({ request: { headers } });

  const cookie = request.cookies.get(SESSION_COOKIE)?.value ?? "";
  if (safeEqual(cookie, await sessionToken())) return NextResponse.next({ request: { headers } });

  if (request.method !== "GET" || pathname.startsWith("/api/")) return new NextResponse("Unauthorized", { status: 401 });
  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
