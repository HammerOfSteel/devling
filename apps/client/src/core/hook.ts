/**
 * window.__devling — the test/observability hook (todo.md §4.3).
 * v0 surface (0.4.4): loop + walking-skeleton state. Grows with the sim;
 * Playwright asserts STATE through this, never by scraping pixels.
 */

export interface DevlingHookStateV0 {
  hookVersion: 0;
  mode: "autonomy";
  status: null;
  activity: string;
  tick: number;
  running: boolean;
  cubeAngle: number;
  seedHouse: string;
  dnaSeed: string;
}

export interface DevlingHookV0 {
  state(): DevlingHookStateV0;
  drainEvents(): string[];
}

export interface HookSources {
  loopStats: () => { tick: number; running: boolean };
  cubeAngle: () => number;
}

export interface HookHandle {
  hook: DevlingHookV0;
  /** Sim-side event feed (smoke asserts ordering; real events from Phase 4). */
  pushEvent(event: string): void;
}

export function createDevlingHook(sources: HookSources): HookHandle {
  let events: string[] = [];
  const hook: DevlingHookV0 = {
    state() {
      const { tick, running } = sources.loopStats();
      return {
        hookVersion: 0,
        mode: "autonomy",
        status: null,
        activity: "spin",
        tick,
        running,
        cubeAngle: sources.cubeAngle(),
        seedHouse: "none",
        dnaSeed: "none",
      };
    },
    drainEvents() {
      const out = events;
      events = [];
      return out;
    },
  };
  return {
    hook,
    pushEvent(event: string) {
      events.push(event);
    },
  };
}

export function installDevlingHook(target: object, hook: DevlingHookV0): void {
  (target as { __devling?: DevlingHookV0 }).__devling = hook;
}
