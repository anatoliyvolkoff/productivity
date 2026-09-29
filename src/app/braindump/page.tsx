import { startOfDay } from "@/lib/domain/dates";
import { BraindumpInbox } from "@/components/braindump/BraindumpInbox";
import { CaptureBox } from "@/components/braindump/CaptureBox";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { listInbox, listProcessedSince } from "@/lib/services/braindump";
import { aiConfigured } from "@/lib/services/ai";

const RESULT_LABEL: Record<string, string> = { task: "→ Task", note: "→ Note", goal: "→ Goal", habit: "→ Habit", deleted: "Let go" };

export default async function BraindumpPage() {
  const [inbox, processed] = await Promise.all([listInbox(), listProcessedSince(startOfDay(new Date()))]);

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader title="Brain dump" subtitle="Get everything out of your head first. Sort it later." />
      <div className="grid grid-cols-[1fr_300px] gap-6">
        <div className="flex min-w-0 flex-col gap-4">
          <CaptureBox />
          <BraindumpInbox items={inbox} aiEnabled={aiConfigured()} />
        </div>
        <aside className="flex flex-col gap-4">
          <Card title={`Processed today · ${processed.length}`}>
            {processed.length === 0 ? (
              <p className="text-[13px] text-fg-subtle">Nothing yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {processed.slice(0, 20).map((p) => (
                  <li key={p.id} className="flex items-baseline justify-between gap-2 text-[13px]">
                    <span className="truncate text-fg-muted">{p.text}</span>
                    <span className="shrink-0 text-[11.5px] text-fg-subtle">{RESULT_LABEL[p.resultType ?? ""] ?? ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Why it works">
            <p className="text-[13px] leading-relaxed text-fg-muted">
              Unfinished tasks keep nagging at your attention. Writing them down with a plan for what happens next
              reduces those intrusive thoughts (Masicampo &amp; Baumeister, 2011). Capture now, decide later, and your
              focus comes back.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
