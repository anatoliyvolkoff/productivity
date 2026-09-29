import { BenchmarksStrip } from "@/components/widgets/BenchmarksStrip";
import { ClockWidget } from "@/components/widgets/ClockWidget";
import { MoodGridPreview } from "@/components/widgets/MoodGridPreview";
import { PlaceholderWidget } from "@/components/widgets/Placeholder";
import { TodayRings } from "@/components/widgets/TodayRings";

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-12 gap-4">
      <PlaceholderWidget
        className="col-span-5"
        title="AI Daily Brief"
        phase={5}
        lines={["What matters today — top 3 with reasons", "What can wait or be dropped", "Best deep-work window"]}
      />
      <div className="col-span-4 grid">
        <ClockWidget />
      </div>
      <PlaceholderWidget
        className="col-span-3"
        title="Now"
        phase={1}
        lines={["Current focus session", "Next calendar event", "Distraction inbox"]}
      />

      <PlaceholderWidget
        className="col-span-5"
        title="Top 3 & active tasks"
        phase={1}
        lines={["Most important tasks (max 3)", "Priority, tags and energy fit", "Quick-add with N"]}
      />
      <PlaceholderWidget
        className="col-span-4"
        title="Timeline"
        phase={2}
        lines={["Google Calendar events", "Time blocks", "Tracked time & focus sessions"]}
      />
      <div className="col-span-3 grid">
        <TodayRings />
      </div>

      <PlaceholderWidget
        className="col-span-5"
        title="Goals"
        phase={3}
        lines={["Progress vs. expected pace", "Auto-progress from tasks, habits & time"]}
      />
      <div className="col-span-4 grid">
        <MoodGridPreview />
      </div>
      <PlaceholderWidget
        className="col-span-3"
        title="Sleep last night"
        phase={4}
        lines={["Duration & quality", "Sleep debt (14 days)", "Consistency"]}
      />

      <div className="col-span-12">
        <BenchmarksStrip />
      </div>
    </div>
  );
}
