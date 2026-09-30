/** Sensory settings shared by the server layout (init script) and the client store in sensory.ts. */
export type MotionLevel = "calm" | "gentle" | "playful";
export type Sensory = {
  motion: MotionLevel;
  /** "readable" switches to Lexend, designed for reading ease. */
  font: "default" | "readable";
  spacing: "normal" | "relaxed" | "airy";
  textSize: "100" | "110" | "125";
  /** Muted accents, flat surfaces, fewer decorations. */
  lowStim: boolean;
  celebration: "quiet" | "glow" | "confetti";
  /** Show "read aloud" buttons (uses the browser's built-in voice). */
  readAloud: boolean;
};

export const SENSORY_DEFAULTS: Sensory = {
  motion: "calm",
  font: "default",
  spacing: "normal",
  textSize: "100",
  lowStim: false,
  celebration: "glow",
  readAloud: false,
};

export const SENSORY_STORAGE_KEY = "pos-sensory";

/** Inlined in <head>: applies saved settings before first paint. */
export const sensoryInitScript = `try{var s=Object.assign(${JSON.stringify(SENSORY_DEFAULTS)},JSON.parse(localStorage.getItem("${SENSORY_STORAGE_KEY}")||"{}"));var r=document.documentElement;r.dataset.motion=s.motion;r.dataset.font=s.font;r.dataset.spacing=s.spacing;r.dataset.textSize=s.textSize;if(s.lowStim)r.dataset.lowstim="";}catch(e){}`;

