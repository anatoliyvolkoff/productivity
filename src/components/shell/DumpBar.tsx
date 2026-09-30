"use client";

import { motion, useAnimate } from "framer-motion";
import { Inbox, Mic, MicOff } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { captureThoughts } from "@/app/actions/braindump";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { trackWrite } from "@/lib/pendingWrites";
import { useMotion } from "@/lib/sensory";

type Flying = { id: number; text: string; from: DOMRect; to: DOMRect };

// Minimal typing for the Web Speech API (not in TypeScript's DOM lib everywhere).
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
};
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Always-visible brain dump: type (or say) a thought, press Enter, and it
 * floats down into the inbox, which "gulps" — visual proof it's safe.
 * No fields, no categories. Press / anywhere to start typing.
 */
export function DumpBar() {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [voice, setVoice] = useState(false);
  const [flying, setFlying] = useState<Flying | null>(null);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<Recognition | null>(null);
  const baseText = useRef("");
  const flightId = useRef(0);
  const [inboxRef, animateInbox] = useAnimate<HTMLAnchorElement>();
  const m = useMotion();

  useEffect(() => {
    // Feature-detect voice, and keep anything typed before the page finished loading.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only APIs, read once after hydration
    setVoice(Boolean(recognitionCtor()));
    const early = inputRef.current?.value;
    if (early) setText(early);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !document.querySelector("[role=dialog]")) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const gulp = useCallback(async () => {
    setFlying(null);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
    if (!inboxRef.current) return;
    if (m.reduced) return;
    const amount = m.level === "calm" ? 0.06 : m.level === "playful" ? 0.22 : 0.14;
    await animateInbox(inboxRef.current, { scale: [1, 1 + amount, 1 - amount / 2, 1] }, { duration: m.level === "calm" ? 0.5 : 0.45, ease: "easeOut" });
  }, [animateInbox, inboxRef, m.level, m.reduced]);

  const submit = () => {
    const value = text.trim();
    if (!value) return;
    stopListening();
    const from = inputRef.current?.getBoundingClientRect();
    const to = inboxRef.current?.getBoundingClientRect();
    setText("");
    void trackWrite(captureThoughts(value)).then((r) => {
      if (!r.ok) {
        setText(value);
        toast.error(r.error);
      }
    });
    if (from && to && !m.reduced) setFlying({ id: ++flightId.current, text: value, from, to });
    else void gulp();
  };

  const stopListening = () => {
    recRef.current?.stop();
    recRef.current = null;
    setListening(false);
  };

  const toggleVoice = () => {
    if (listening) return stopListening();
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    baseText.current = text ? `${text.trim()} ` : "";
    rec.onresult = (e) => {
      let said = "";
      for (let i = 0; i < e.results.length; i++) said += e.results[i][0].transcript;
      setText(baseText.current + said);
    };
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
      inputRef.current?.focus();
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed") toast.error("Microphone access is blocked for this site.");
    };
    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <div className={cn("flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full bg-surface-3 pr-1.5 pl-4 transition focus-within:bg-surface focus-within:ring-2 focus-within:ring-primary/40", listening && "ring-2 ring-accent/50")}>
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            } else if (e.key === "Escape") {
              inputRef.current?.blur();
            }
          }}
          placeholder={listening ? "Listening… say what's on your mind" : "Dump a thought — it's safe here  ( / )"}
          aria-label="Brain dump: type a thought and press Enter"
          className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-fg-subtle"
        />
        {voice && (
          <button
            type="button"
            onClick={toggleVoice}
            className={cn("grid size-8 place-items-center rounded-full transition", listening ? "bg-accent text-white" : "text-fg-muted hover:bg-surface-3 hover:text-fg")}
            aria-label={listening ? "Stop listening" : "Say it instead"}
            aria-pressed={listening}
            title={listening ? "Stop listening" : "Say it instead"}
          >
            {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
          </button>
        )}
      </div>
      <div className="relative">
        <Link
          ref={inboxRef}
          href="/braindump"
          className="grid size-10 place-items-center rounded-full text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg"
          aria-label="Brain dump inbox"
          title="Brain dump inbox (B)"
        >
          <Inbox className="size-[19px]" strokeWidth={1.75} />
        </Link>
        <span aria-live="polite" className={cn("pointer-events-none absolute top-full left-1/2 mt-1 -translate-x-1/2 text-[11px] whitespace-nowrap text-fg-muted transition-opacity duration-[var(--motion-slow)]", saved ? "opacity-100" : "opacity-0")}>
          {saved ? "Safe in your inbox" : ""}
        </span>
      </div>
      {flying && <FloatingThought key={flying.id} flying={flying} onDone={gulp} />}
    </div>
  );
}

/** The captured words drift down into the inbox icon, then disappear. */
function FloatingThought({ flying, onDone }: { flying: Flying; onDone: () => void }) {
  const m = useMotion();
  const { from, to } = flying;
  const startX = from.left + 16;
  const startY = from.top + from.height / 2 - 10;
  const endX = to.left + to.width / 2 - 12;
  const endY = to.top + to.height / 2 - 10;
  const arc = m.level === "playful" ? 36 : m.level === "calm" ? 8 : 20;
  return (
    <motion.div
      className="pointer-events-none fixed top-0 left-0 z-[70] max-w-[320px] truncate rounded-full bg-surface px-3 py-0.5 text-[13px] text-fg shadow-card"
      initial={{ x: startX, y: startY, opacity: 1, scale: 1 }}
      animate={{ x: [startX, (startX + endX) / 2, endX], y: [startY, startY + arc, endY], opacity: [1, 0.9, 0], scale: [1, 0.7, 0.25] }}
      transition={{ duration: m.level === "calm" ? 0.7 : 0.55, ease: [0.4, 0, 0.2, 1], times: [0, 0.6, 1] }}
      onAnimationComplete={onDone}
      aria-hidden
    >
      {flying.text}
    </motion.div>
  );
}
