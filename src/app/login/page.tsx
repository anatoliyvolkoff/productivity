import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in · Productivity OS" };

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/";
  return (
    <div className="grid min-h-screen w-full place-items-center p-6">
      <div className="w-full max-w-sm rounded-xl bg-surface p-8 shadow-card">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-[10px] bg-fg text-[14px] font-bold text-bg">P</div>
          <span className="text-[17px] font-semibold tracking-tight">Productivity OS</span>
        </div>
        <LoginForm next={next} />
      </div>
    </div>
  );
}
