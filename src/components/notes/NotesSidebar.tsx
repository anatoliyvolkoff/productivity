"use client";

import { CalendarDays, Pin, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { newNote, openDailyNote } from "@/app/actions/notes";
import { Button } from "@/components/ui/Button";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { cn } from "@/lib/cn";
import { todayISO } from "@/lib/domain/dates";
import { useRunner } from "@/lib/hooks/useRunner";

type Item = { id: string; title: string; excerpt: string; updatedAt: Date; pinned: boolean; dailyDate: string | null };

export function NotesSidebar({ notes, selectedId, query }: { notes: Item[]; selectedId: string | null; query: string }) {
  const router = useRouter();
  const { pending, run } = useRunner();
  const [q, setQ] = useState(query);

  useEffect(() => {
    const t = setTimeout(() => {
      if (q !== query) router.replace(q ? `/notes?q=${encodeURIComponent(q)}` : "/notes");
    }, 250);
    return () => clearTimeout(t);
  }, [q, query, router]);

  return (
    <aside className="flex min-h-0 flex-col rounded-xl bg-surface shadow-card">
      <div className="flex gap-2 p-3">
        <Button variant="primary" size="sm" disabled={pending} onClick={() => run(() => newNote(), { onSuccess: (id) => router.push(`/notes?id=${id}`) })}>
          <Plus className="size-3.5" /> New
        </Button>
        <Button variant="secondary" size="sm" disabled={pending} onClick={() => run(() => openDailyNote(todayISO()), { onSuccess: (id) => router.push(`/notes?id=${id}`) })}>
          <CalendarDays className="size-3.5" /> Today
        </Button>
      </div>
      <label className="mx-3 mb-2 flex h-9 items-center gap-2 rounded-full bg-surface-3 px-3">
        <Search className="size-4 text-fg-subtle" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes" className="w-full bg-transparent text-[13px] outline-none" />
      </label>
      <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {notes.length === 0 && <li className="p-4 text-center text-[13px] text-fg-subtle">{query ? "No matches" : "No notes"}</li>}
        {notes.map((n) => (
          <li key={n.id}>
            <Link
              href={`/notes?id=${n.id}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
              className={cn("block rounded-md px-3 py-2.5 transition", n.id === selectedId ? "bg-primary-soft" : "hover:bg-surface-3")}
            >
              <div className="flex items-center gap-1.5">
                {n.pinned && <Pin className="size-3 shrink-0 text-accent" fill="currentColor" />}
                {n.dailyDate && <CalendarDays className="size-3 shrink-0 text-primary" />}
                <span className={cn("truncate text-[14px] font-medium", n.id === selectedId && "text-primary")}>{n.title || "Untitled"}</span>
              </div>
              <div className="mt-0.5 flex gap-2 text-[12px] text-fg-subtle">
                <RelativeTime date={n.updatedAt} className="shrink-0" />
                <span className="truncate">{n.excerpt.replace(/[#*_>`-]/g, "").trim()}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
