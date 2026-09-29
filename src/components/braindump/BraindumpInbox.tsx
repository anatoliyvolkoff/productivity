"use client";

import { CheckSquare, Flag, NotebookPen, Repeat, Sparkles, Timer, X } from "lucide-react";
import { useState } from "react";
import { triageItem, type TriageTarget } from "@/app/actions/braindump";
import { suggestTriage } from "@/app/actions/ai";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Chip";
import { RelativeTime } from "@/components/ui/RelativeTime";
import type { BraindumpItem } from "@/lib/db/schema";
import { useRunner } from "@/lib/hooks/useRunner";

type Suggestion = { type?: TriageTarget; priority?: number; tags?: string[]; title?: string; reason?: string };

const ACTIONS: Array<{ as: TriageTarget; label: string; icon: typeof CheckSquare }> = [
  { as: "task", label: "Task", icon: CheckSquare },
  { as: "note", label: "Note", icon: NotebookPen },
  { as: "goal", label: "Goal", icon: Flag },
  { as: "habit", label: "Habit", icon: Repeat },
];

export function BraindumpInbox({ items, aiEnabled }: { items: BraindumpItem[]; aiEnabled: boolean }) {
  const { pending, run } = useRunner();

  return (
    <Card
      title={`Inbox · ${items.length}`}
      action={
        aiEnabled && items.length > 0 ? (
          <Button size="sm" variant="tonal" disabled={pending} onClick={() => run(() => suggestTriage(), { success: "Suggestions ready" })}>
            <Sparkles className="size-3.5" /> {pending ? "Thinking…" : "Suggest with AI"}
          </Button>
        ) : null
      }
    >
      {items.length === 0 ? (
        <EmptyState icon={CheckSquare} title="Inbox zero">
          Your head is clear. Capture anything new above.
        </EmptyState>
      ) : (
        <ul className="flex flex-col divide-y divide-outline/70">
          {items.map((item) => (
            <InboxItem key={item.id} item={item} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function InboxItem({ item }: { item: BraindumpItem }) {
  const { pending, run } = useRunner();
  const [text, setText] = useState(item.text);
  const suggestion = item.aiSuggestion as Suggestion | null;

  const triage = (as: TriageTarget, extra: { priority?: number; tags?: string[]; text?: string } = {}) =>
    run(() => triageItem(item.id, as, { text: extra.text ?? text, priority: extra.priority, tags: extra.tags }), {
      success: as === "deleted" ? "Let go" : `Saved as ${as}`,
    });

  return (
    <li className={`flex flex-col gap-2 py-3 ${pending ? "opacity-50" : ""}`}>
      <div className="flex items-start gap-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-w-0 flex-1 rounded-xs bg-transparent px-1 py-0.5 text-[14.5px] outline-none focus:bg-surface-3"
          aria-label="Edit thought"
        />
        <RelativeTime date={item.createdAt} className="shrink-0 pt-1 text-[11.5px] text-fg-subtle" />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {item.source === "focus" && (
          <Badge tone="primary">
            <Timer className="size-3" /> from focus
          </Badge>
        )}
        {ACTIONS.map((a) => (
          <Button key={a.as} size="sm" variant="secondary" disabled={pending} onClick={() => triage(a.as)}>
            <a.icon className="size-3.5" /> {a.label}
          </Button>
        ))}
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => triage("deleted")} aria-label="Let it go">
          <X className="size-3.5" /> Let go
        </Button>
        {suggestion?.type && (
          <button
            type="button"
            disabled={pending}
            onClick={() => triage(suggestion.type!, { priority: suggestion.priority, tags: suggestion.tags, text: suggestion.title || text })}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[12px] font-medium text-primary transition hover:bg-primary/20"
            title={suggestion.reason}
          >
            <Sparkles className="size-3.5" />
            {suggestion.type === "deleted" ? "Let go" : `${suggestion.type}${suggestion.priority ? ` · P${suggestion.priority}` : ""}${suggestion.tags?.length ? ` · #${suggestion.tags.join(" #")}` : ""}`}
          </button>
        )}
      </div>
    </li>
  );
}
