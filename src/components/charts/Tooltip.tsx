"use client";

/** Chart tooltip: values lead, labels follow; series keyed with a short line. */
export type TooltipRow = { value: string; label?: string; color?: string };

export function ChartTooltip({
  x,
  y,
  title,
  rows,
  containerWidth,
}: {
  x: number;
  y: number;
  title?: string;
  rows: TooltipRow[];
  containerWidth: number;
}) {
  const flip = x > containerWidth - 180;
  return (
    <div
      className="pointer-events-none absolute z-10 min-w-32 rounded-md border border-outline bg-surface px-3 py-2 shadow-lg"
      style={{ left: flip ? undefined : x + 12, right: flip ? containerWidth - x + 12 : undefined, top: Math.max(0, y - 12) }}
      role="status"
    >
      {title && <div className="mb-1 text-[11.5px] text-fg-muted">{title}</div>}
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2 text-[13px]">
          {r.color && <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: r.color }} />}
          <span className="font-semibold text-fg">{r.value}</span>
          {r.label && <span className="text-fg-muted">{r.label}</span>}
        </div>
      ))}
    </div>
  );
}

/** Pointer position mapped into an SVG's viewBox coordinates. */
export function svgPoint(e: React.PointerEvent<SVGElement>, width: number, height: number) {
  const svg = (e.currentTarget.ownerSVGElement ?? e.currentTarget) as SVGSVGElement;
  const rect = svg.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * width,
    y: ((e.clientY - rect.top) / rect.height) * height,
    px: e.clientX - rect.left,
    py: e.clientY - rect.top,
    rectWidth: rect.width,
  };
}
