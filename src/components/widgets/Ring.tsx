type RingProps = {
  /** 0–1 */
  value: number;
  size: number;
  stroke: number;
  color: string;
};

/** Apple-Fitness-style progress ring. */
export function Ring({ value, size, stroke, color }: RingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.min(1, Math.max(0, value));

  return (
    <svg width={size} height={size} className="absolute inset-0 m-auto -rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeOpacity={0.16} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - v)}
        className="transition-[stroke-dashoffset] duration-700"
      />
    </svg>
  );
}
