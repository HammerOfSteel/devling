import { describe, expect, it } from "vitest";
import { DirectionalLight, Mesh, PerspectiveCamera } from "three";
import { buildWalkingSkeleton, CUBE_RADS_PER_MS } from "./scene.js";

describe("walking-skeleton scene (0.4.3)", () => {
  it("contains the expected named nodes", () => {
    const ws = buildWalkingSkeleton();
    for (const name of ["ground", "hero-cube", "sun", "ambient"]) {
      expect(ws.scene.getObjectByName(name), name).toBeDefined();
    }
    expect(ws.camera).toBeInstanceOf(PerspectiveCamera);
    expect(ws.camera.fov).toBe(30);
  });

  it("casts and receives shadows where it matters", () => {
    const ws = buildWalkingSkeleton();
    expect((ws.scene.getObjectByName("hero-cube") as Mesh).castShadow).toBe(true);
    expect((ws.scene.getObjectByName("ground") as Mesh).receiveShadow).toBe(true);
    expect((ws.scene.getObjectByName("sun") as DirectionalLight).castShadow).toBe(true);
  });

  it("spins the cube deterministically from ticks", () => {
    const ws = buildWalkingSkeleton();
    const before = ws.cubeAngle();
    ws.update(50);
    ws.update(50);
    expect(ws.cubeAngle()).toBeCloseTo(before + 100 * CUBE_RADS_PER_MS, 10);
  });

  it("full turn every 4 seconds", () => {
    const ws = buildWalkingSkeleton();
    ws.update(4000);
    expect(ws.cubeAngle()).toBeCloseTo(Math.PI * 2, 10);
  });

  it("resize updates the projection", () => {
    const ws = buildWalkingSkeleton();
    ws.resize(2);
    expect(ws.camera.aspect).toBe(2);
  });
});
