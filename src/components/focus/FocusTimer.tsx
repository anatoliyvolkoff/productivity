"use client";

import { Coffee, Maximize, Minimize, Pause, Play, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { abandonFocus, completeFocus, logDistraction, pauseFocus, resumeFocus, startFocus } from "@/app/actions/focus";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { toast } from "@/components/ui/toast";
import { askNotificationPermission, notify, playChime } from "@/lib/chime";
import { cn } from "@/lib/cn";
import { BREAK_IDEAS, FOCUS_PRESETS, presetByKey, remainingSec, type PresetKey } from "@/lib/domain/focus";
import { useNow } from "@/lib/hooks/useNow";
import { useRunner } from "@/lib/hooks/useRunner";

type Session = {
  id: string;
  startedAt: Date;
  plannedMin: number;
  breakMin: number;
  pausedAt: Date | null;
  pausedSec: number;
  preset: PresetKey;
  taskTitle: string | null;
  distractions: number;
};

type BreakState = { endsAt: number; minutes: number };
const BREAK_KEY = "pos-focus-break";

const mmss = (sec: number) => {
  const s = Math.max(0, Math.ceil(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export function FocusTimer({
  session,
  tasks,
  sessionsToday,
  energyNow,
}: {
  session: Session | null;
  tasks: Array<{ id: string; title: string; mit: boolean }>;
  sessionsToday: number;
  energyNow: number | null;
}) {
  const now = useNow(250);
  const rootRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [breakState, setBreakState] = useState<BreakState | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(BREAK_KEY) ?? "null") as BreakState | null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore a break that was running before a reload
      if (saved && saved.endsAt > Date.now()) setBreakState(saved);
    } catch {}
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const saveBreak = (b: BreakState | null) => {
    setBreakState(b);
    try {
      if (b) sessionStorage.setItem(BREAK_KEY, JSON.stringify(b));
      else sessionStorage.removeItem(BREAK_KEY);
    } catch {}
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void rootRef.current?.requestFullscreen();
  };

  return (
    <div ref={rootRef} className="relative flex min-h-[600px] flex-col items-center justify-center rounded-xl bg-surface p-8 shadow-card">
      <button
        type="button"
        onClick={toggleFullscreen}
        className="absolute top-5 right-5 grid size-10 place-items-center rounded-full text-fg-muted transition hover:bg-surface-3 hover:text-fg"
        aria-label={fullscreen ? "Exit deep work mode" : "Deep work mode (full screen)"}
        title="Deep work mode"
      >
        {fullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
      </button>

      {session ? (
        <Running session={session} now={now} onBreak={(minutes) => saveBreak({ endsAt: Date.now() + minutes * 60_000, minutes })} sessionsToday={sessionsToday} />
      ) : breakState && now && breakState.endsAt > now.getTime() - 60_000 ? (
        <BreakView breakState={breakState} now={now} onDone={() => saveBreak(null)} />
      ) : (
        <Setup tasks={tasks} sessionsToday={sessionsToday} energyNow={energyNow} />
      )}
    </div>
  );
}

function TimerRing({ progress, color, children }: { progress: number; color: string; children: React.ReactNode }) {
  const size = 340;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(1, progress)))}
          className="transition-[stroke-dashoffset] duration-300 ease-linear"
        />
      </svg>
      <div className="relative flex flex-col items-center">{children}</div>
    </div>
  );
}

function Setup({ tasks, sessionsToday, energyNow }: { tasks: Array<{ id: string; title: string; mit: boolean }>; sessionsToday: number; energyNow: number | null }) {
  const { pending, run } = useRunner();
  const [preset, setPreset] = useState<PresetKey>("pomodoro");
  const [taskId, setTaskId] = useState(tasks.find((t) => t.mit)?.id ?? "");
  const [custom, setCustom] = useState({ focus: 45, break: 10 });
  const p = presetByKey(preset);
  const focusMin = preset === "custom" ? custom.focus : p.focusMin;

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6">
      <TimerRing progress={0} color="var(--primary)">
        <div className="tabular font-mono text-[72px] leading-none font-semibold tracking-tight">{mmss(focusMin * 60)}</div>
        <div className="mt-3 max-w-56 text-center text-[13px] leading-snug text-fg-muted">{p.description}</div>
      </TimerRing>

      <Segmented value={preset} onChange={setPreset} options={FOCUS_PRESETS.map((x) => ({ value: x.key, label: x.label }))} />

      {preset === "custom" && (
        <div className="flex items-center gap-3 text-[13px] text-fg-muted">
          Focus
          <Input type="number" min={5} max={180} value={custom.focus} onChange={(e) => setCustom({ ...custom, focus: Number(e.target.value) })} className="h-9 w-20" />
          min · Break
          <Input type="number" min={1} max={60} value={custom.break} onChange={(e) => setCustom({ ...custom, break: Number(e.target.value) })} className="h-9 w-20" />
          min
        </div>
      )}

      <Select value={taskId} onChange={(e) => setTaskId(e.target.value)} className="h-11" aria-label="Task to focus on">
        <option value="">No specific task</option>
        {tasks.map((t) => (
          <option key={t.id} value={t.id}>
            {t.mit ? "★ " : ""}
            {t.title}
          </option>
        ))}
      </Select>

      <Button
        variant="primary"
        size="lg"
        className="w-full justify-center"
        disabled={pending}
        onClick={() => {
          askNotificationPermission();
          run(() =>
            startFocus({
              taskId: taskId || null,
              preset,
              focusMin: preset === "custom" ? custom.focus : undefined,
              breakMin: preset === "custom" ? custom.break : undefined,
            }),
          );
        }}
      >
        <Play className="size-4" fill="currentColor" /> Start focus
      </Button>

      <p className="text-center text-[12.5px] text-fg-subtle">
        {sessionsToday > 0 ? `${sessionsToday} ${sessionsToday === 1 ? "session" : "sessions"} done today. ` : ""}
        {energyNow !== null && energyNow < 0.45
          ? "Your energy is in a dip — a shorter session or a walk first may work better."
          : "Close other tabs, silence your phone, and pick one task."}
      </p>
    </div>
  );
}

function Running({ session, now, onBreak, sessionsToday }: { session: Session; now: Date | null; onBreak: (minutes: number) => void; sessionsToday: number }) {
  const { pending, run } = useRunner();
  const [thought, setThought] = useState("");
  const [overtime, setOvertime] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [quality, setQuality] = useState<number | null>(null);
  const chimed = useRef(false);
  const left = now ? remainingSec(session, now) : session.plannedMin * 60;
  const finished = left <= 0 && !session.pausedAt;
  const progress = 1 - left / (session.plannedMin * 60);

  useEffect(() => {
    if (finished && !chimed.current && !overtime) {
      chimed.current = true;
      playChime("end");
      notify("Focus session complete", "Time for a real break.");
    }
  }, [finished, overtime]);

  useEffect(() => {
    document.title = `${session.pausedAt ? "Paused" : left > 0 ? mmss(left) : "Done"} · Focus`;
    return () => {
      document.title = "Productivity OS";
    };
  }, [left, session.pausedAt]);

  const preset = presetByKey(session.preset);
  const round = sessionsToday + 1;
  const longBreak = preset.roundsBeforeLongBreak && round % preset.roundsBeforeLongBreak === 0 ? preset.longBreakMin : undefined;
  const breakMin = longBreak ?? session.breakMin;

  const complete = (startBreak: boolean) =>
    run(() => completeFocus(session.id, { quality, keepOvertime: overtime }), {
      success: "Session saved",
      onSuccess: () => startBreak && onBreak(breakMin),
    });

  if ((finished && !overtime) || finishing) {
    return (
      <div className="flex w-full max-w-md flex-col items-center gap-5 text-center">
        <div className="text-[44px]">🎉</div>
        <h2 className="text-[24px] font-semibold tracking-tight">{finished ? "Session complete" : "Finish early?"}</h2>
        <p className="text-[14px] text-fg-muted">
          {session.taskTitle ? `Focus on “${session.taskTitle}”.` : "Focus time logged."} How focused were you?
        </p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setQuality(q)}
              className={cn(
                "grid size-12 place-items-center rounded-full text-[16px] font-semibold transition",
                quality === q ? "bg-primary text-on-primary" : "bg-surface-3 text-fg-muted hover:text-fg",
              )}
            >
              {q}
            </button>
          ))}
        </div>
        <div className="flex w-full flex-col gap-2">
          <Button variant="primary" size="lg" className="justify-center" disabled={pending} onClick={() => complete(true)}>
            <Coffee className="size-4" /> Save & take a {breakMin}-min {longBreak ? "long " : ""}break
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1 justify-center" disabled={pending} onClick={() => complete(false)}>
              Save, skip break
            </Button>
            <Button
              variant="ghost"
              className="flex-1 justify-center"
              onClick={() => {
                setFinishing(false);
                if (finished) setOvertime(true);
              }}
            >
              Keep going
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6">
      <TimerRing progress={overtime ? 1 : progress} color={session.pausedAt ? "var(--fg-subtle)" : overtime ? "var(--accent)" : "var(--primary)"}>
        <div className="text-[13px] font-medium tracking-wide text-fg-muted uppercase">
          {session.pausedAt ? "Paused" : overtime ? "Overtime" : preset.key === "pomodoro" ? `Round ${round}` : preset.label}
        </div>
        <div className="tabular font-mono text-[72px] leading-none font-semibold tracking-tight">
          {overtime ? `+${mmss(-left)}` : mmss(left)}
        </div>
        <div className="mt-3 max-w-60 truncate text-[15px] font-medium">{session.taskTitle ?? "Focus"}</div>
      </TimerRing>

      <div className="flex gap-2">
        {session.pausedAt ? (
          <Button variant="primary" size="lg" disabled={pending} onClick={() => run(() => resumeFocus(session.id))}>
            <Play className="size-4" fill="currentColor" /> Resume
          </Button>
        ) : (
          <Button variant="secondary" size="lg" disabled={pending} onClick={() => run(() => pauseFocus(session.id))}>
            <Pause className="size-4" fill="currentColor" /> Pause
          </Button>
        )}
        <Button variant="tonal" size="lg" disabled={pending} onClick={() => setFinishing(true)}>
          <Square className="size-3.5" fill="currentColor" /> Finish
        </Button>
        <Button
          variant="ghost"
          size="lg"
          disabled={pending}
          onClick={() => {
            if (confirm("Discard this session without logging it?")) run(() => abandonFocus(session.id), { success: "Session discarded" });
          }}
        >
          <X className="size-4" /> Discard
        </Button>
      </div>

      <form
        className="w-full"
        onSubmit={(e) => {
          e.preventDefault();
          if (!thought.trim()) return;
          run(() => logDistraction(session.id, thought), {
            onSuccess: () => {
              setThought("");
              toast("Parked in your brain dump — back to it");
            },
          });
        }}
      >
        <Input
          value={thought}
          onChange={(e) => setThought(e.target.value)}
          placeholder="Distracting thought? Park it here and keep going ↵"
          className="h-11 text-center"
        />
        {session.distractions > 0 && (
          <p className="mt-2 text-center text-[12px] text-fg-subtle">
            {session.distractions} {session.distractions === 1 ? "thought" : "thoughts"} parked — they&apos;ll wait in the brain dump.
          </p>
        )}
      </form>
    </div>
  );
}

function BreakView({ breakState, now, onDone }: { breakState: BreakState; now: Date; onDone: () => void }) {
  const left = (breakState.endsAt - now.getTime()) / 1000;
  const done = left <= 0;
  const chimed = useRef(false);
  const [idea] = useState(() => BREAK_IDEAS[Math.floor(Math.random() * BREAK_IDEAS.length)]);

  useEffect(() => {
    if (done && !chimed.current) {
      chimed.current = true;
      playChime("break");
      notify("Break's over", "Ready for the next session?");
    }
  }, [done]);

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
      <TimerRing progress={1 - left / (breakState.minutes * 60)} color="var(--success)">
        <div className="text-[13px] font-medium tracking-wide text-fg-muted uppercase">{done ? "Break over" : "Break"}</div>
        <div className="tabular font-mono text-[72px] leading-none font-semibold tracking-tight">{mmss(left)}</div>
      </TimerRing>
      <p className="max-w-sm text-[15px] text-fg-muted">
        <b className="text-fg">Screen-free idea:</b> {idea}
      </p>
      <Button variant={done ? "primary" : "secondary"} size="lg" onClick={onDone}>
        {done ? "Start next session" : "Skip break"}
      </Button>
    </div>
  );
}
