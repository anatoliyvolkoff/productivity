"use client";

import { MotionConfig } from "framer-motion";

/** framer-motion follows the OS "reduce motion" setting everywhere. */
export function MotionRoot({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
