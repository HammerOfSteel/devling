import { ACESFilmicToneMapping, PCFSoftShadowMap, SRGBColorSpace } from "three";

/**
 * Renderer parameters as pure data + pure functions (todo.md 0.4.1).
 * The WebGLRenderer itself can't exist headless, so everything testable
 * lives here and `createRenderer` stays a thin shell.
 */

/** DPR clamp (§8 perf budget): retina is fine, 3x+ mobile is wasted watts. */
export const MAX_PIXEL_RATIO = 2;
export const MIN_PIXEL_RATIO = 1;

export interface RendererSizing {
  width: number;
  height: number;
  pixelRatio: number;
}

export function computeSizing(
  viewportWidth: number,
  viewportHeight: number,
  devicePixelRatio: number,
): RendererSizing {
  return {
    width: Math.max(1, Math.floor(viewportWidth)),
    height: Math.max(1, Math.floor(viewportHeight)),
    pixelRatio: Math.min(MAX_PIXEL_RATIO, Math.max(MIN_PIXEL_RATIO, devicePixelRatio)),
  };
}

/** The diorama look baseline (todo.md §3.1): ACES + sRGB + soft shadows. */
export interface RendererLike {
  toneMapping: number;
  toneMappingExposure: number;
  outputColorSpace: string;
  shadowMap: { enabled: boolean; type: number };
}

export function applyRendererDefaults(renderer: RendererLike): void {
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
}
