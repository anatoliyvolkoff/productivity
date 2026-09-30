/**
 * Task steps form a small tree: "break it down" adds top-level steps, and
 * "I'm stuck" splits a step into smaller children. You always work on the
 * current step — the first unfinished leaf, in order.
 */
export type StepLike = { id: string; parentStepId: string | null; title: string; sortOrder: number; doneAt: Date | string | null };
export type StepNode<T extends StepLike = StepLike> = T & { children: StepNode<T>[]; depth: number };

export function buildStepTree<T extends StepLike>(steps: T[]): StepNode<T>[] {
  const byParent = new Map<string | null, T[]>();
  for (const s of steps) byParent.set(s.parentStepId, [...(byParent.get(s.parentStepId) ?? []), s]);
  const build = (parent: string | null, depth: number): StepNode<T>[] =>
    (byParent.get(parent) ?? [])
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((s) => ({ ...s, depth, children: build(s.id, depth + 1) }));
  return build(null, 0);
}

/** Depth-first, in order. */
export function flattenSteps<T extends StepLike>(tree: StepNode<T>[]): StepNode<T>[] {
  return tree.flatMap((n) => [n, ...flattenSteps(n.children)]);
}

/** The step to do now: the first unfinished step with no unfinished children. */
export function currentStep<T extends StepLike>(tree: StepNode<T>[]): StepNode<T> | null {
  for (const n of tree) {
    if (n.doneAt) continue;
    const inner = currentStep(n.children);
    if (inner) return inner;
    return n;
  }
  return null;
}

/** Progress over leaves (the steps you actually do). */
export function stepProgress(tree: StepNode[]): { done: number; total: number } {
  const leaves = flattenSteps(tree).filter((n) => n.children.length === 0);
  return { done: leaves.filter((n) => n.doneAt).length, total: leaves.length };
}

/** Ancestors whose children are now all done (so they complete too), nearest first. */
export function parentsToComplete(steps: StepLike[], doneId: string): string[] {
  const byId = new Map(steps.map((s) => [s.id, s]));
  const isDone = (id: string) => id === doneId || Boolean(byId.get(id)?.doneAt);
  const out: string[] = [];
  let parent = byId.get(doneId)?.parentStepId ?? null;
  while (parent) {
    const siblings = steps.filter((s) => s.parentStepId === parent);
    if (!siblings.every((s) => isDone(s.id) || out.includes(s.id))) break;
    out.push(parent);
    const p = byId.get(parent);
    if (!p) break;
    parent = p.parentStepId;
  }
  return out;
}

/** Offline fallback when there's no AI: tiny, generic, still concrete first steps. */
export function fallbackBreakdown(title: string): string[] {
  return [
    "Get what you need in front of you (open it, find it, clear a spot)",
    `Spend just 2 minutes on “${title}” — messy is fine`,
    "Write down the very next thing you'd do",
    "Do that next thing",
  ];
}

export function fallbackUnstick(stepTitle: string): string[] {
  return [
    `Look at “${stepTitle}” for 30 seconds without doing anything`,
    "Write one sentence about what feels hard or unclear",
    "Do the smallest piece you can see — even one line or one click",
  ];
}
