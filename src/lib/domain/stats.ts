export const mean = (xs: number[]): number | null => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

export const sum = (xs: number[]): number => xs.reduce((s, x) => s + x, 0);

/** Average ranks (ties share the mean rank), 1-based. */
function ranks(xs: number[]): number[] {
  const order = xs.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const out = new Array<number>(xs.length);
  let i = 0;
  while (i < order.length) {
    let j = i;
    while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j++;
    const rank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) out[order[k][1]] = rank;
    i = j + 1;
  }
  return out;
}

export function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 3 || ys.length !== n) return null;
  const mx = mean(xs)!;
  const my = mean(ys)!;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  if (dx === 0 || dy === 0) return null;
  return num / Math.sqrt(dx * dy);
}

/** Spearman rank correlation — robust to outliers and non-linear monotonic relations. */
export function spearman(xs: number[], ys: number[]): number | null {
  if (xs.length !== ys.length || xs.length < 3) return null;
  return pearson(ranks(xs), ranks(ys));
}

export type CorrelationStrength = "none" | "weak" | "moderate" | "strong";

export function correlationStrength(rho: number): CorrelationStrength {
  const a = Math.abs(rho);
  if (a < 0.1) return "none";
  if (a < 0.3) return "weak";
  if (a < 0.5) return "moderate";
  return "strong";
}

/** Minimum paired days before a correlation is shown at all. */
export const MIN_CORRELATION_SAMPLES = 10;
