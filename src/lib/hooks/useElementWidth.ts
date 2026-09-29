"use client";

import { useEffect, useRef, useState } from "react";

/** Width of an element in CSS pixels, kept up to date with a ResizeObserver. */
export function useElementWidth<T extends HTMLElement>(initial = 600) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(200, Math.round(entry.contentRect.width))));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}
