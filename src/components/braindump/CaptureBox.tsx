"use client";

import { useState } from "react";
import { captureThoughts } from "@/app/actions/braindump";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/toast";
import { useRunner } from "@/lib/hooks/useRunner";

export function CaptureBox() {
  const [text, setText] = useState("");
  const { pending, run } = useRunner();
  const lines = text.split("\n").filter((l) => l.trim()).length;

  const submit = () =>
    run(() => captureThoughts(text), {
      onSuccess: (n) => {
        setText("");
        toast(`Captured ${n} ${n === 1 ? "thought" : "thoughts"}`);
      },
    });

  return (
    <div className="rounded-lg bg-surface p-5 shadow-card">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
        }}
        autoFocus
        rows={7}
        placeholder={"One thought per line. Don't sort, don't judge — just dump.\n\nCall the bank\nIdea: weekly review on Sundays\nWorried about the deadline…"}
        className="w-full resize-none bg-transparent text-[16px] leading-relaxed outline-none placeholder:text-fg-subtle"
      />
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[12px] text-fg-subtle">
          {lines > 0 ? `${lines} ${lines === 1 ? "line" : "lines"}` : "Tip: press B anywhere to come here"} · ⌘/Ctrl + Enter to capture
        </span>
        <Button variant="primary" onClick={submit} disabled={pending || lines === 0}>
          Capture
        </Button>
      </div>
    </div>
  );
}
