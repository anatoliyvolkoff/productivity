"use client";

import { Pin, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { removeNote, saveNote, saveNoteAndRefresh } from "@/app/actions/notes";
import { Markdown } from "@/components/notes/Markdown";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { cn } from "@/lib/cn";
import { useRunner } from "@/lib/hooks/useRunner";

type Note = { id: string; title: string; contentMd: string; pinned: boolean; tags: string[]; dailyDate: string | null; updatedAt: Date };

/** Markdown note editor with debounced autosave. */
export function NoteEditor({ note, compact = false }: { note: Note; compact?: boolean }) {
  const router = useRouter();
  const { run } = useRunner();
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.contentMd);
  const [tags, setTags] = useState(note.tags.join(" "));
  const [mode, setMode] = useState<"write" | "preview">(note.contentMd && !compact ? "preview" : "write");
  const [status, setStatus] = useState<"saved" | "saving" | "dirty">("saved");
  const last = useRef({ title: note.title, content: note.contentMd });

  useEffect(() => {
    if (title === last.current.title && content === last.current.content) return;
    setStatus("dirty");
    const t = setTimeout(async () => {
      setStatus("saving");
      const result = await saveNote(note.id, { title, contentMd: content });
      if (result.ok) {
        last.current = { title, content };
        setStatus("saved");
      }
    }, 700);
    return () => clearTimeout(t);
  }, [title, content, note.id]);

  return (
    <section className={cn("flex min-h-0 flex-col rounded-xl bg-surface shadow-card", compact ? "p-4" : "p-6")}>
      <div className="flex items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => router.refresh()}
          placeholder="Title"
          className={cn("min-w-0 flex-1 bg-transparent font-semibold tracking-tight outline-none placeholder:text-fg-subtle", compact ? "text-[17px]" : "text-[24px]")}
        />
        <span className="text-[12px] text-fg-subtle">{status === "saved" ? "Saved" : status === "saving" ? "Saving…" : "Editing"}</span>
        <Segmented value={mode} onChange={setMode} options={[{ value: "write", label: "Write" }, { value: "preview", label: "Preview" }]} />
        {!compact && (
          <>
            <Button
              size="icon"
              variant="ghost"
              aria-label={note.pinned ? "Unpin" : "Pin"}
              onClick={() => run(() => saveNoteAndRefresh(note.id, { pinned: !note.pinned }))}
              className={note.pinned ? "text-accent" : ""}
            >
              <Pin className="size-4" fill={note.pinned ? "currentColor" : "none"} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Delete note"
              onClick={() => {
                if (confirm("Delete this note?")) run(() => removeNote(note.id), { success: "Note deleted", onSuccess: () => router.push("/notes") });
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </>
        )}
      </div>
      {!compact && (
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          onBlur={() => run(() => saveNoteAndRefresh(note.id, { tags: tags.split(/[\s,]+/).filter(Boolean) }))}
          placeholder="#tags"
          className="mt-1 bg-transparent text-[13px] text-fg-muted outline-none placeholder:text-fg-subtle"
        />
      )}
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        {mode === "write" ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={note.dailyDate ? "How is the day going? Wins, worries, ideas…" : "Write in Markdown…"}
            className={cn("h-full w-full resize-none bg-transparent font-sans text-[15px] leading-relaxed outline-none placeholder:text-fg-subtle", compact ? "min-h-40" : "min-h-[60vh]")}
          />
        ) : (
          <div onDoubleClick={() => setMode("write")} className="cursor-text">
            {content.trim() ? <Markdown>{content}</Markdown> : <p className="text-[14px] text-fg-subtle">Nothing yet — double-click to write.</p>}
          </div>
        )}
      </div>
    </section>
  );
}
