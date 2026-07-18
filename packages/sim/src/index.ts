export const PACKAGE_NAME = "@devling/sim";

/** Fixed simulation tick rate in Hz (todo.md §4.2 — render interpolates between ticks). */
export const SIM_TICK_HZ = 20;
export const SIM_TICK_MS = 1000 / SIM_TICK_HZ;

/** Whole simulation ticks fully elapsed after `ms` milliseconds. */
export function ticksElapsed(ms: number): number {
  if (!Number.isFinite(ms) || ms < 0) {
    throw new RangeError(`ms must be a non-negative finite number, got ${ms}`);
  }
  return Math.floor(ms / SIM_TICK_MS);
}
