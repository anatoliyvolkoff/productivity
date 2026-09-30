"use client";

import { motion } from "framer-motion";
import { Ear, Waves } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";
import { setSensory, speak, useMotion, useSensory, type Sensory } from "@/lib/sensory";

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-3">
      <div className="min-w-0">
        <div className="text-[14px] font-medium">{label}</div>
        {hint && <div className="text-[12.5px] text-fg-muted">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/** First-class sensory settings: motion, stimulation, reading comfort. Saved on this device. */
export function SensorySettings() {
  const s = useSensory();
  const set = <K extends keyof Sensory>(key: K) => (value: Sensory[K]) => setSensory({ [key]: value } as Partial<Sensory>);
  const onOff = (v: boolean) => (v ? "on" : "off");

  return (
    <Card title="Sensory & comfort" action={<Waves className="size-4 text-fg-subtle" />}>
      <p className="mb-1 text-[12.5px] text-fg-muted">Saved on this device. If your system asks for reduced motion, the app always follows it.</p>
      <div className="divide-y divide-outline">
        <Row label="Motion" hint="Calm: slow fades, almost no movement. Gentle: soft glides. Playful: bouncier rewards.">
          <div className="flex items-center gap-3">
            <MotionPreview />
            <Segmented
              value={s.motion}
              onChange={set("motion")}
              options={[
                { value: "calm", label: "Calm" },
                { value: "gentle", label: "Gentle" },
                { value: "playful", label: "Playful" },
              ]}
            />
          </div>
        </Row>
        <Row label="Low-stimulation colors" hint="Muted accents, flat surfaces, fewer decorations.">
          <Segmented value={onOff(s.lowStim)} onChange={(v) => setSensory({ lowStim: v === "on" })} options={[{ value: "off", label: "Off" }, { value: "on", label: "On" }]} />
        </Row>
        <Row label="Font" hint="Lexend was designed to make reading easier, including with dyslexia.">
          <Segmented
            value={s.font}
            onChange={set("font")}
            options={[
              { value: "default", label: "Default" },
              { value: "readable", label: <span style={{ fontFamily: "var(--font-readable)" }}>Easy-read</span> },
            ]}
          />
        </Row>
        <Row label="Letter & line spacing">
          <Segmented
            value={s.spacing}
            onChange={set("spacing")}
            options={[
              { value: "normal", label: "Normal" },
              { value: "relaxed", label: "Relaxed" },
              { value: "airy", label: "Airy" },
            ]}
          />
        </Row>
        <Row label="Text size">
          <Segmented
            value={s.textSize}
            onChange={set("textSize")}
            options={[
              { value: "100", label: "100%" },
              { value: "110", label: "110%" },
              { value: "125", label: "125%" },
            ]}
          />
        </Row>
        <Row label="Celebrations" hint="What happens when you finish something.">
          <Segmented
            value={s.celebration}
            onChange={set("celebration")}
            options={[
              { value: "quiet", label: "Quiet" },
              { value: "glow", label: "Soft glow" },
              { value: "confetti", label: "Confetti" },
            ]}
          />
        </Row>
        <Row label="Read aloud" hint="Adds a speaker button to the task in front of you (uses your browser's voice).">
          <div className="flex items-center gap-2">
            {s.readAloud && (
              <Button variant="ghost" size="icon-sm" aria-label="Test the voice" onClick={() => speak("Hi. One small step at a time.")}>
                <Ear className="size-4" />
              </Button>
            )}
            <Segmented value={onOff(s.readAloud)} onChange={(v) => setSensory({ readAloud: v === "on" })} options={[{ value: "off", label: "Off" }, { value: "on", label: "On" }]} />
          </div>
        </Row>
      </div>
    </Card>
  );
}

/** A dot that shows how the chosen motion level feels. */
function MotionPreview() {
  const m = useMotion();
  const [on, setOn] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setOn((v) => !v)}
      className="relative h-7 w-14 rounded-full bg-surface-3"
      aria-label="Preview motion"
      title="Tap to preview"
    >
      <motion.span
        className="absolute top-1 left-1 size-5 rounded-full bg-primary"
        animate={{ x: on ? 28 : 0, scale: on && !m.reduced ? [1, 1 + m.d(0.12), 1] : 1 }}
        transition={m.spring}
      />
    </button>
  );
}
