export const ANSWER_LIMIT_MS = 60_000;
export const DELIVERY_RESERVE_MS = 3_000;
export const REVIEW_RESERVE_MS = 9_000;
export const REVIEW_LIMIT_MS = 24_000;

export class TurnTimeout extends Error {
  constructor(readonly stage: "authorization" | "prefetch" | "draft" | "review" | "delivery") {
    super(`Support turn exceeded its ${stage} budget`);
    this.name = "TimeoutError";
  }
}

/** Abort cooperative work and bound the wait even if a dependency ignores cancellation. */
export async function runUntil<T>(
  cutoff: number, stage: TurnTimeout["stage"], parent: AbortSignal, work: (signal: AbortSignal) => Promise<T>
): Promise<T> {
  parent.throwIfAborted();
  const remaining = cutoff - Date.now();
  const timeout = new TurnTimeout(stage);
  if (remaining <= 0) throw timeout;
  const controller = new AbortController();
  const signal = AbortSignal.any([parent, controller.signal]);
  const timer = setTimeout(() => controller.abort(timeout), remaining);
  let onAbort: (() => void) | undefined;
  try {
    const aborted = new Promise<never>((_resolve, reject) => {
      onAbort = () => {
        const reason: unknown = signal.reason;
        reject(reason instanceof Error ? reason : new Error("Support turn canceled"));
      };
      signal.addEventListener("abort", onAbort, { once: true });
    });
    const value = await Promise.race([aborted, Promise.resolve().then(() => {
      signal.throwIfAborted();
      return work(signal);
    })]);
    signal.throwIfAborted();
    if (Date.now() >= cutoff) throw timeout;
    return value;
  } finally {
    clearTimeout(timer);
    if (onAbort) signal.removeEventListener("abort", onAbort);
  }
}
