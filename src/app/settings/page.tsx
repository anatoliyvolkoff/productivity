import { Database, Sparkles } from "lucide-react";
import { BackupCard, GoogleSettings, LocationForm, ProfileForm, TagManager } from "@/components/settings/SettingsForms";
import { logout } from "@/app/actions/auth";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { authEnabled } from "@/lib/auth";
import { Badge } from "@/components/ui/Chip";
import { PageHeader } from "@/components/ui/PageHeader";
import { getConnection } from "@/lib/db";
import { AI_MODEL, aiConfigured } from "@/lib/services/ai";
import { tableCounts } from "@/lib/services/backup";
import { googleStatus } from "@/lib/services/google";
import { getProfile } from "@/lib/services/profile";
import { listTags } from "@/lib/services/tags";

export default async function SettingsPage(props: PageProps<"/settings">) {
  const sp = await props.searchParams;
  const [profile, conn, google, tags, counts] = await Promise.all([getProfile(), getConnection(), googleStatus(), listTags(), tableCounts()]);
  const googleNotice: Record<string, string> = {
    "missing-config": "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local first.",
    denied: "Google access was declined.",
    invalid: "The Google sign-in expired or didn't match — try again.",
    error: `Connecting failed: ${typeof sp.message === "string" ? sp.message : "unknown error"}`,
  };
  const notice = typeof sp.google === "string" ? googleNotice[sp.google] : undefined;

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader title="Settings" subtitle="Targets, connections and your data." />
      {notice && <div className="mb-4 rounded-md bg-danger/10 px-4 py-2.5 text-[13.5px] text-danger">{notice}</div>}
      <div className="grid grid-cols-2 items-start gap-4">
        <div className="flex flex-col gap-4">
          <ProfileForm profile={profile} />
          <LocationForm current={profile.locationName} />
          <TagManager tags={tags} />
        </div>
        <div className="flex flex-col gap-4">
          <Card title="Database" action={<Database className="size-4 text-fg-subtle" />}>
            <div className="flex items-center gap-2 text-[14px]">
              <Badge tone={conn.kind === "supabase" ? "success" : "primary"}>{conn.kind === "supabase" ? "Supabase" : "Local"}</Badge>
              <span className="truncate font-mono text-[12px] text-fg-muted">{conn.location}</span>
            </div>
            <p className="mt-2 text-[12.5px] text-fg-muted">
              {conn.kind === "supabase"
                ? "Connected through DATABASE_URL. Your data lives in your Supabase project."
                : "Using the embedded database on this computer. To use Supabase, set DATABASE_URL in .env.local and restart — export here first, then import there."}
            </p>
          </Card>
          <GoogleSettings status={google} targetCalendar={profile.googleCalendarId} />
          <Card title="AI" action={<Sparkles className="size-4 text-fg-subtle" />}>
            {aiConfigured() ? (
              <p className="text-[13.5px]">
                <Badge tone="success">Connected</Badge> <span className="ml-1 text-fg-muted">Model</span> <code className="font-mono text-[12px]">{AI_MODEL}</code>
              </p>
            ) : (
              <p className="text-[13px] text-fg-muted">
                Add <code className="font-mono text-[12px]">ANTHROPIC_API_KEY</code> to <code className="font-mono text-[12px]">.env.local</code> and restart to turn on the AI brief, evening summary, weekly review and brain-dump sorting. Until then, the daily brief is rule-based.
              </p>
            )}
            <p className="mt-2 text-[12px] text-fg-subtle">You chose to let the AI read everything: tasks, notes, journal, mood notes and sleep. Nothing is sent unless you press an AI button.</p>
          </Card>
          <BackupCard counts={counts} />
          {authEnabled() && (
            <Card title="Sign-in">
              <p className="mb-3 text-[13px] text-fg-muted">This copy is password-protected (APP_PASSWORD). Change the password in your hosting settings to sign out every device.</p>
              <form action={logout}>
                <button type="submit" className={buttonClass("secondary", "sm")}>
                  Sign out
                </button>
              </form>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
