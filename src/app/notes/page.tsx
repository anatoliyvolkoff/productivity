import { NotebookPen } from "lucide-react";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { NotesSidebar } from "@/components/notes/NotesSidebar";
import { EmptyState } from "@/components/ui/EmptyState";
import { getNote, listNotes } from "@/lib/services/notes";

export default async function NotesPage(props: PageProps<"/notes">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const notes = await listNotes(q);
  const selectedId = typeof sp.id === "string" ? sp.id : notes[0]?.id;
  const note = selectedId ? await getNote(selectedId) : null;

  return (
    <div className="mx-auto grid h-[calc(100vh-8rem)] max-w-[1300px] grid-cols-[300px_1fr] gap-4">
      <NotesSidebar
        notes={notes.map((n) => ({ id: n.id, title: n.title, excerpt: n.contentMd.slice(0, 120), updatedAt: n.updatedAt, pinned: n.pinned, dailyDate: n.dailyDate }))}
        selectedId={note?.id ?? null}
        query={q}
      />
      {note ? (
        <NoteEditor
          key={note.id}
          note={{ id: note.id, title: note.title, contentMd: note.contentMd, pinned: note.pinned, tags: note.tags, dailyDate: note.dailyDate, updatedAt: note.updatedAt }}
        />
      ) : (
        <div className="grid place-items-center rounded-xl bg-surface shadow-card">
          <EmptyState icon={NotebookPen} title="No notes yet">
            Create one, or open today&apos;s daily note.
          </EmptyState>
        </div>
      )}
    </div>
  );
}
