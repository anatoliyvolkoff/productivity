import { exportAll } from "@/lib/services/backup";

/** Download everything as JSON (OAuth tokens excluded). */
export async function GET() {
  const backup = await exportAll();
  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="productivity-os-${backup.exportedAt.slice(0, 10)}.json"`,
    },
  });
}
