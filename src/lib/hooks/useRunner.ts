"use client";

import { useCallback, useTransition } from "react";
import { toast } from "@/components/ui/toast";
import type { ActionResult } from "@/lib/actions";
import { trackWrite } from "@/lib/pendingWrites";

/** Run a server action in a transition; show errors (and optional success) as toasts. */
export function useRunner() {
  const [pending, startTransition] = useTransition();

  const run = useCallback(
    <T,>(fn: () => Promise<ActionResult<T>>, options: { success?: string; onSuccess?: (data: T) => void } = {}) => {
      startTransition(async () => {
        const result = await trackWrite(fn());
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        if (options.success) toast(options.success);
        options.onSuccess?.(result.data);
      });
    },
    [],
  );

  return { pending, run };
}
