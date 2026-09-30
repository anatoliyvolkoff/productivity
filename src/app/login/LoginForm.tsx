"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";

export function LoginForm({ next }: { next: string }) {
  const [error, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="next" value={next} />
      <Input type="password" name="password" placeholder="Password" autoFocus autoComplete="current-password" className="h-11" />
      {error && <p className="text-[13px] text-danger">{error}</p>}
      <Button type="submit" variant="primary" size="lg" className="justify-center" disabled={pending}>
        {pending ? "Checking…" : "Unlock"}
      </Button>
    </form>
  );
}
