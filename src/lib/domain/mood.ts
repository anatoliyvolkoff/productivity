export type Quadrant = "red" | "yellow" | "blue" | "green";

/** Energy and pleasantness are each −5…5 (never 0 on the check-in grid). */
export function quadrantOf(energy: number, pleasantness: number): Quadrant {
  if (energy >= 0) return pleasantness >= 0 ? "yellow" : "red";
  return pleasantness >= 0 ? "green" : "blue";
}

export const QUADRANT_INFO: Record<Quadrant, { label: string; short: string; color: string }> = {
  red: { label: "High energy, unpleasant", short: "Red", color: "var(--mood-red)" },
  yellow: { label: "High energy, pleasant", short: "Yellow", color: "var(--mood-yellow)" },
  blue: { label: "Low energy, unpleasant", short: "Blue", color: "var(--mood-blue)" },
  green: { label: "Low energy, pleasant", short: "Green", color: "var(--mood-green)" },
};

/**
 * Emotion words with approximate intensity (|energy|, |pleasantness|, 1–5).
 * Naming a specific emotion ("affect labeling") dampens amygdala activity
 * (Lieberman et al., 2007) — that's why the check-in asks for a word, not a score.
 */
const WORDS: Record<Quadrant, Array<[string, number, number]>> = {
  red: [
    ["Enraged", 5, 5], ["Panicked", 5, 5], ["Furious", 5, 4], ["Terrified", 5, 4], ["Livid", 4, 5],
    ["Shocked", 5, 3], ["Stressed", 4, 3], ["Anxious", 4, 3], ["Overwhelmed", 4, 4], ["Frustrated", 3, 4],
    ["Angry", 4, 4], ["Scared", 4, 3], ["Jealous", 3, 3], ["Pressured", 3, 3], ["Nervous", 3, 2],
    ["Worried", 3, 3], ["Irritated", 3, 2], ["Tense", 3, 2], ["Embarrassed", 2, 3], ["Restless", 2, 2],
    ["Annoyed", 2, 2], ["Jittery", 3, 1], ["Uneasy", 2, 2], ["Concerned", 1, 2], ["Peeved", 1, 1],
  ],
  yellow: [
    ["Ecstatic", 5, 5], ["Thrilled", 5, 5], ["Elated", 4, 5], ["Exhilarated", 5, 4], ["Inspired", 4, 5],
    ["Excited", 5, 4], ["Energized", 5, 3], ["Motivated", 4, 3], ["Enthusiastic", 4, 4], ["Proud", 3, 5],
    ["Joyful", 3, 5], ["Eager", 4, 3], ["Focused", 3, 2], ["Confident", 3, 3], ["Optimistic", 3, 4],
    ["Happy", 2, 4], ["Cheerful", 2, 4], ["Playful", 3, 3], ["Curious", 2, 2], ["Hopeful", 2, 3],
    ["Amused", 2, 3], ["Surprised", 4, 1], ["Lively", 3, 2], ["Pleasant", 1, 2], ["Engaged", 2, 1],
  ],
  blue: [
    ["Despairing", 5, 5], ["Hopeless", 4, 5], ["Depressed", 5, 4], ["Miserable", 4, 5], ["Heartbroken", 3, 5],
    ["Exhausted", 5, 3], ["Lonely", 3, 4], ["Ashamed", 2, 5], ["Guilty", 2, 4], ["Sad", 3, 3],
    ["Disappointed", 2, 3], ["Discouraged", 3, 3], ["Drained", 4, 2], ["Down", 3, 2], ["Gloomy", 3, 3],
    ["Insecure", 2, 3], ["Disconnected", 3, 2], ["Numb", 4, 1], ["Tired", 4, 1], ["Apathetic", 3, 1],
    ["Bored", 2, 1], ["Lost", 2, 3], ["Glum", 2, 2], ["Fatigued", 4, 2], ["Meh", 1, 1],
  ],
  green: [
    ["Serene", 5, 5], ["Blissful", 4, 5], ["Grateful", 2, 5], ["Fulfilled", 3, 5], ["Peaceful", 4, 4],
    ["Tranquil", 5, 4], ["Content", 3, 4], ["Loved", 2, 5], ["Relieved", 2, 3], ["Calm", 4, 3],
    ["Relaxed", 4, 3], ["Satisfied", 2, 4], ["Balanced", 3, 3], ["Comfortable", 3, 3], ["Cozy", 4, 3],
    ["Secure", 2, 3], ["Thoughtful", 2, 2], ["Mellow", 4, 2], ["Rested", 3, 2], ["Carefree", 2, 3],
    ["At ease", 3, 2], ["Chill", 3, 2], ["Reflective", 2, 1], ["Sleepy", 5, 1], ["Easygoing", 1, 2],
  ],
};

export type EmotionWord = { word: string; energy: number; pleasantness: number };

export function emotionsFor(quadrant: Quadrant): EmotionWord[] {
  const eSign = quadrant === "red" || quadrant === "yellow" ? 1 : -1;
  const pSign = quadrant === "yellow" || quadrant === "green" ? 1 : -1;
  return WORDS[quadrant].map(([word, e, p]) => ({ word, energy: e * eSign, pleasantness: p * pSign }));
}

/** Emotion words of the point's quadrant, closest to the chosen point first. */
export function emotionsNear(energy: number, pleasantness: number): EmotionWord[] {
  return emotionsFor(quadrantOf(energy, pleasantness)).sort(
    (a, b) =>
      (a.energy - energy) ** 2 + (a.pleasantness - pleasantness) ** 2 -
      ((b.energy - energy) ** 2 + (b.pleasantness - pleasantness) ** 2),
  );
}

/** Evidence-informed regulation ideas per quadrant. */
export const STRATEGIES: Record<Quadrant, string[]> = {
  red: [
    "Physiological sigh: two inhales through the nose, one long exhale — repeat 3 times.",
    "Name it: write one sentence about what triggered this feeling.",
    "Move for 5 minutes — a brisk walk helps clear stress hormones.",
    "Shrink the problem: what's the next 10-minute step?",
  ],
  yellow: [
    "Ride it: start your most important task now.",
    "Savor it: write down or share what's going well.",
    "Protect it: silence notifications and start a focus block.",
  ],
  blue: [
    "Get daylight and move for 10 minutes.",
    "Reach out to one person — a short message counts.",
    "Self-compassion: what would you tell a friend feeling this?",
    "Do one tiny task to rebuild momentum.",
    "Rest on purpose: a 10–20 min nap or non-sleep deep rest.",
  ],
  green: [
    "Good state for reflection, planning or learning.",
    "Gratitude: note three good things from today.",
    "Keep it: skip the doom-scroll and protect the calm.",
  ],
};

export const CONTEXT_OPTIONS = {
  doing: ["Working", "Studying", "Exercising", "Resting", "Socializing", "Eating", "Commuting", "Chores", "Creating", "Screen time"],
  with: ["Alone", "Partner", "Family", "Friends", "Colleagues", "Strangers"],
  where: ["Home", "Work", "Outside", "Gym", "Transit", "Café"],
} as const;
