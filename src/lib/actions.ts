/** Result shape for server actions — errors come back as messages (production hides thrown errors). */
export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

export async function attempt<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    console.error(error);
    return { ok: false, error: error instanceof Error ? error.message : "Something went wrong." };
  }
}
