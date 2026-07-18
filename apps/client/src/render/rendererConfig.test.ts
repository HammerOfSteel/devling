import { describe, expect, it } from "vitest";
import { ACESFilmicToneMapping, PCFSoftShadowMap, SRGBColorSpace } from "three";
import {
  applyRendererDefaults,
  computeSizing,
  MAX_PIXEL_RATIO,
  type RendererLike,
} from "./rendererConfig.js";

describe("computeSizing (0.4.1)", () => {
  it.each([
    [3, 2, "3x retina clamps to 2"],
    [2, 2, "2x passes"],
    [1.5, 1.5, "fractional passes"],
    [1, 1, "1x passes"],
    [0.5, 1, "sub-1 clamps up"],
  ])("dpr %f → %f (%s)", (dpr, expected) => {
    expect(computeSizing(1280, 800, dpr).pixelRatio).toBe(expected);
  });

  it("floors dimensions and never goes below 1px", () => {
    expect(computeSizing(1280.7, 799.2, 1)).toMatchObject({ width: 1280, height: 799 });
    expect(computeSizing(0, -5, 1)).toMatchObject({ width: 1, height: 1 });
  });

  it("keeps the clamp constant honest", () => {
    expect(MAX_PIXEL_RATIO).toBe(2);
  });
});

describe("applyRendererDefaults", () => {
  it("sets the diorama baseline: ACES, sRGB, soft shadows", () => {
    const fake: RendererLike = {
      toneMapping: 0,
      toneMappingExposure: 0,
      outputColorSpace: "",
      shadowMap: { enabled: false, type: 0 },
    };
    applyRendererDefaults(fake);
    expect(fake.toneMapping).toBe(ACESFilmicToneMapping);
    expect(fake.toneMappingExposure).toBe(1.0);
    expect(fake.outputColorSpace).toBe(SRGBColorSpace);
    expect(fake.shadowMap).toEqual({ enabled: true, type: PCFSoftShadowMap });
  });
});
