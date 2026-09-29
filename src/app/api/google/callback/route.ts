import { NextResponse, type NextRequest } from "next/server";
import { connectGoogle } from "@/lib/services/google";

/** OAuth redirect target: verify state, exchange the code, then sync. */
export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const expected = request.cookies.get("google_oauth_state")?.value;
  const done = (path: string) => {
    const response = NextResponse.redirect(`${origin}${path}`);
    response.cookies.delete("google_oauth_state");
    return response;
  };

  if (searchParams.get("error")) return done("/settings?google=denied");
  const code = searchParams.get("code");
  if (!code || !expected || searchParams.get("state") !== expected) return done("/settings?google=invalid");

  try {
    await connectGoogle(code, `${origin}/api/google/callback`);
    return done("/calendar?google=connected");
  } catch (error) {
    console.error("Google connect failed:", error);
    return done(`/settings?google=error&message=${encodeURIComponent(error instanceof Error ? error.message : "Unknown error")}`);
  }
}
