import { SIM_TICK_MS } from "@devling/sim";

/**
 * Fixed-timestep loop (todo.md §4.2, 0.4.2): sim ticks at exactly
 * SIM_TICK_MS; rendering interpolates with alpha = acc/tickMs ∈ [0,1).
 * `step(nowMs)` is the single advance point — rAF drives it in the
 * browser, tests drive it by hand. Determinism depends on this seam.
 */

export interface FixedLoopOpts {
  onTick: (dtMs: number, tick: number) => void;
  onRender?: (alpha: number) => void;
  /** Defaults to the sim contract tick (50 ms). */
  tickMs?: number;
  /** Frame clamp against the spiral of death (default 250 ms). */
  maxFrameMs?: number;
}

export class FixedLoop {
  readonly tickMs: number;
  readonly maxFrameMs: number;
  private readonly onTick: FixedLoopOpts["onTick"];
  private readonly onRender: FixedLoopOpts["onRender"];
  private accMs = 0;
  private lastNow: number | undefined;
  private tickCount = 0;
  private running = false;

  constructor(opts: FixedLoopOpts) {
    this.onTick = opts.onTick;
    this.onRender = opts.onRender;
    this.tickMs = opts.tickMs ?? SIM_TICK_MS;
    this.maxFrameMs = opts.maxFrameMs ?? 250;
    if (this.tickMs <= 0) throw new RangeError("tickMs must be positive");
    if (this.maxFrameMs < this.tickMs) throw new RangeError("maxFrameMs must be ≥ tickMs");
  }

  start(): void {
    this.running = true;
  }

  /** Pause drops the accumulator and rebases time — resume can't burst. */
  pause(): void {
    this.running = false;
    this.lastNow = undefined;
    this.accMs = 0;
  }

  step(nowMs: number): void {
    if (!this.running) return;
    if (this.lastNow === undefined) {
      this.lastNow = nowMs;
      return;
    }
    let frame = nowMs - this.lastNow;
    this.lastNow = nowMs;
    if (frame < 0) frame = 0;
    if (frame > this.maxFrameMs) frame = this.maxFrameMs;
    this.accMs += frame;
    while (this.accMs >= this.tickMs) {
      this.accMs -= this.tickMs;
      this.tickCount += 1;
      this.onTick(this.tickMs, this.tickCount);
    }
    this.onRender?.(this.accMs / this.tickMs);
  }

  get stats(): { tick: number; running: boolean; alpha: number } {
    return { tick: this.tickCount, running: this.running, alpha: this.accMs / this.tickMs };
  }
}

/** Minimal document surface so tests can fake visibility. */
export interface VisibilityDoc {
  hidden: boolean;
  addEventListener(type: "visibilitychange", cb: () => void): void;
}

/** Hidden tab ⇒ pause (battery + §7.1.3); visible ⇒ run. Applies initial state. */
export function bindVisibility(loop: FixedLoop, doc: VisibilityDoc): void {
  const apply = (): void => {
    if (doc.hidden) loop.pause();
    else loop.start();
  };
  doc.addEventListener("visibilitychange", apply);
  apply();
}

/** Browser driver. Returns a cancel function. */
export function driveWithRaf(
  loop: FixedLoop,
  raf: (cb: (t: number) => void) => number = (cb) => requestAnimationFrame(cb),
  cancel: (id: number) => void = (id) => cancelAnimationFrame(id),
): () => void {
  let id = 0;
  let stopped = false;
  const frame = (t: number): void => {
    if (stopped) return;
    loop.step(t);
    id = raf(frame);
  };
  id = raf(frame);
  return () => {
    stopped = true;
    cancel(id);
  };
}
