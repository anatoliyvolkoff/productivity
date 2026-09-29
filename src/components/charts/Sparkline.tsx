/** Tiny trend line: de-emphasized series with the latest point in the accent. */
export function Sparkline({ values, width = 120, height = 32 }: { values: Array<number | null>; width?: number; height?: number }) {
  const points = values.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v !== null);
  if (points.length < 2) return <svg width={width} height={height} aria-hidden />;
  const min = Math.min(...points.map((p) => p.v));
  const max = Math.max(...points.map((p) => p.v));
  const span = max - min || 1;
  const x = (i: number) => 3 + (i / Math.max(1, values.length - 1)) * (width - 6);
  const y = (v: number) => 4 + (1 - (v - min) / span) * (height - 8);
  const d = points.map((p, k) => `${k ? "L" : "M"}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
  const last = points[points.length - 1];
  return (
    <svg width={width} height={height} aria-hidden className="overflow-visible">
      <path d={d} fill="none" stroke="var(--fg-subtle)" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(last.i)} cy={y(last.v)} r={3.5} fill="var(--series-1)" stroke="var(--surface)" strokeWidth={2} />
    </svg>
  );
}
