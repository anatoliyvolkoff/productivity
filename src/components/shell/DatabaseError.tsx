import { DatabaseZap } from "lucide-react";

/** Shown instead of the app when the database can't be opened. */
export function DatabaseError({ message, usingSupabase }: { message: string; usingSupabase: boolean }) {
  return (
    <div className="grid min-h-screen w-full place-items-center p-8">
      <div className="max-w-lg rounded-xl bg-surface p-8 shadow-card">
        <div className="grid size-12 place-items-center rounded-lg bg-danger/10 text-danger">
          <DatabaseZap className="size-6" />
        </div>
        <h1 className="mt-4 text-[22px] font-semibold tracking-tight">Can&apos;t open the database</h1>
        <p className="mt-2 text-[14px] text-fg-muted">
          {usingSupabase
            ? `The app is set to use Supabase (DATABASE_URL in ${process.env.VERCEL ? "the Vercel project's Environment Variables" : ".env.local"}) but couldn't connect.`
            : "The embedded local database in .data/pglite couldn't be opened. Is another copy of the app running?"}
        </p>
        <pre className="mt-4 overflow-x-auto rounded-md bg-surface-3 p-3 font-mono text-[12px] whitespace-pre-wrap text-fg-muted">{message}</pre>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-[13px] text-fg-muted">
          {usingSupabase ? (
            <>
              <li>Copy the strings from Supabase → Connect, and replace [YOUR-PASSWORD] (brackets too) with your database password.</li>
              {process.env.VERCEL && <li>After changing a variable on Vercel, redeploy (Deployments → ⋯ → Redeploy).</li>}
              <li>Use the transaction pooler (port 6543) for DATABASE_URL.</li>
              <li>Remove DATABASE_URL to fall back to the local database.</li>
            </>
          ) : (
            <li>Stop other running copies (only one process can open the local database), then reload.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
