import { WebGLRenderer } from "three";
import { applyRendererDefaults, computeSizing } from "./rendererConfig.js";

/** Thin shell over WebGLRenderer — all decisions live in rendererConfig. */
export function createRenderer(canvas: HTMLCanvasElement): WebGLRenderer {
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  applyRendererDefaults(renderer);
  resizeRenderer(renderer, window.innerWidth, window.innerHeight, window.devicePixelRatio);
  return renderer;
}

export function resizeRenderer(
  renderer: WebGLRenderer,
  viewportWidth: number,
  viewportHeight: number,
  devicePixelRatio: number,
): void {
  const s = computeSizing(viewportWidth, viewportHeight, devicePixelRatio);
  renderer.setPixelRatio(s.pixelRatio);
  renderer.setSize(s.width, s.height, false);
}
