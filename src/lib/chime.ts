/** A soft two-tone chime with the Web Audio API (no audio files needed). */
export function playChime(kind: "end" | "break" = "end") {
  try {
    const ctx = new AudioContext();
    const notes = kind === "end" ? [660, 880, 1320] : [880, 660];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.22;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 1);
    });
    setTimeout(() => ctx.close(), 2000);
  } catch {}
}

export function notify(title: string, body?: string) {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") new Notification(title, { body, silent: true });
  } catch {}
}

export function askNotificationPermission() {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "default") void Notification.requestPermission();
  } catch {}
}
