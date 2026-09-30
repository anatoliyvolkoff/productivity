"use client";

import { useSearchParams } from "next/navigation";
import { cloneElement, isValidElement, useEffect, useState, type ReactNode } from "react";
import { REFRESH_EVENT } from "./refresh";

type PageFn = (props: { searchParams: Promise<Record<string, string>>; params: Promise<Record<string, string>> }) => ReactNode | Promise<ReactNode>;

const isAsync = (fn: unknown) => typeof fn === "function" && Object.prototype.toString.call(fn) === "[object AsyncFunction]";

/** Await async (server-style) components in a tree so React can render the result on the client. */
async function resolve(node: ReactNode): Promise<ReactNode> {
  if (Array.isArray(node)) return Promise.all(node.map(resolve));
  if (!isValidElement(node)) return node;
  const { type, props } = node as { type: unknown; props: { children?: ReactNode } };
  if (isAsync(type)) return resolve(await (type as (p: unknown) => Promise<ReactNode>)(props));
  if (props && props.children !== undefined) return cloneElement(node, undefined, await resolve(props.children));
  return node;
}

/**
 * Browser build: runs a page's data loading in the browser (against the
 * in-browser database) and renders what it returns. Re-runs when the URL's
 * query changes or after any change (like `refresh()` on the server).
 */
export function ServerPage({ page }: { page: PageFn }) {
  const params = useSearchParams();
  const query = params.toString();
  const [tree, setTree] = useState<ReactNode>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onRefresh = () => setTick((t) => t + 1);
    window.addEventListener(REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(REFRESH_EVENT, onRefresh);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const searchParams = Object.fromEntries(new URLSearchParams(query));
        const out = await resolve(await page({ searchParams: Promise.resolve(searchParams), params: Promise.resolve({}) }));
        if (!cancelled) {
          setTree(out);
          setError(null);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, query, tick]);

  if (error) return <p className="rounded-md bg-danger/10 p-4 text-[14px] text-danger">Something went wrong: {error}</p>;
  if (tree === null) return <div className="h-40 animate-pulse rounded-xl bg-surface/60" aria-label="Loading" />;
  return <>{tree}</>;
}
