"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authEnabled, safeEqual, SESSION_COOKIE, sessionToken } from "@/lib/auth";

export async function login(_prev: string | null, form: FormData): Promise<string | null> {
  if (!authEnabled()) redirect("/");
  const password = String(form.get("password") ?? "");
  if (!safeEqual(password, process.env.APP_PASSWORD!.trim())) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return "Wrong password.";
  }
  const store = await cookies();
  store.set(SESSION_COOKIE, await sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && Boolean(process.env.VERCEL || process.env.HTTPS),
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });
  const next = String(form.get("next") ?? "/");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
