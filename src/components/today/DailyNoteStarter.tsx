"use client";

import { NotebookPen } from "lucide-react";
import { openDailyNote } from "@/app/actions/notes";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useRunner } from "@/lib/hooks/useRunner";

export function DailyNoteStarter({ date }: { date: string }) {
  const { pending, run } = useRunner();
  return (
    <Card title="Daily note">
      <p className="text-[13.5px] text-fg-muted">A few lines a day — wins, worries, ideas. Writing things down frees up attention.</p>
      <Button variant="tonal" className="mt-3 self-start" disabled={pending} onClick={() => run(() => openDailyNote(date))}>
        <NotebookPen className="size-4" /> Start today&apos;s note
      </Button>
    </Card>
  );
}
