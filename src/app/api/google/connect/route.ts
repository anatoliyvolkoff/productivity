import { NextResponse, type NextRequest } from "next/server";
import { googleAuthUrl, googleConfigured } from "@/lib/services/google";

/** Start the Google OAuth flow (consent screen → /api/google/callback). */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  if (!googleConfigured()) return NextResponse.redirect(`${origin}/settings?google=missing-config`);

  const state = crypto.randomUUID();
  const response = NextResponse.redirect(googleAuthUrl(`${origin}/api/google/callback`, state));
  response.cookies.set("google_oauth_state", state, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  return response;
}
