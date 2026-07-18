import GUI from "lil-gui";
import Stats from "stats-gl";
import type { WebGLRenderer } from "three";
import type { FixedLoop } from "./loop.js";

/** Debug rail gate (0.4.4): pure + tested. Rail itself is browser-only. */
export function isDebugEnabled(search: string): boolean {
  return new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).has("debug");
}

export interface DebugRail {
  stats: Stats;
  gui: GUI;
  /** Call once per rendered frame. */
  frame(): void;
}

export function initDebugRail(renderer: WebGLRenderer, loop: FixedLoop): DebugRail {
  const stats = new Stats({ trackGPU: false });
  void stats.init(renderer);
  document.body.appendChild(stats.dom);

  const gui = new GUI({ title: "devling debug" });
  const view = { tick: 0, seed: "none (procgen lands in Phase 1-2)" };
  const tickCtrl = gui.add(view, "tick").disable();
  gui.add(view, "seed").disable();

  return {
    stats,
    gui,
    frame(): void {
      view.tick = loop.stats.tick;
      tickCtrl.updateDisplay();
      stats.update();
    },
  };
}
