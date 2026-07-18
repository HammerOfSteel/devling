import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
} from "three";

/**
 * Walking-skeleton scene (0.4.3): proves renderer + loop + lights +
 * shadows end-to-end before any real content. Replaced by the house
 * in Phase 2 — but node names asserted here stay the debugging
 * vocabulary (scene.getObjectByName).
 */

export interface WalkingSkeleton {
  scene: Scene;
  camera: PerspectiveCamera;
  /** Advance animation state by dtMs (called from the fixed tick). */
  update(dtMs: number): void;
  /** Current cube rotation (radians) — exposed for the __devling hook. */
  readonly cubeAngle: () => number;
  resize(aspect: number): void;
}

/** Cube spin rate: one full turn every 4 s — visibly alive, not frantic. */
export const CUBE_RADS_PER_MS = (Math.PI * 2) / 4000;

export function buildWalkingSkeleton(): WalkingSkeleton {
  const scene = new Scene();
  scene.background = new Color("#87b5d6"); // placeholder sky

  const ground = new Mesh(
    new PlaneGeometry(20, 20),
    new MeshStandardMaterial({ color: "#79b463", roughness: 0.95 }),
  );
  ground.name = "ground";
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const cube = new Mesh(
    new BoxGeometry(1, 1, 1),
    new MeshStandardMaterial({ color: "#e2725b", roughness: 0.6 }),
  );
  cube.name = "hero-cube";
  cube.position.y = 0.5;
  cube.castShadow = true;
  scene.add(cube);

  const sun = new DirectionalLight("#fff6e6", 2.2);
  sun.name = "sun";
  sun.position.set(6, 10, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  const ambient = new AmbientLight("#b8cfe6", 0.55);
  ambient.name = "ambient";
  scene.add(ambient);

  // Diorama-ish placeholder framing (real rig lands at 1.1.1).
  const camera = new PerspectiveCamera(30, 16 / 10, 0.1, 100);
  camera.name = "camera";
  camera.position.set(6, 7, 6);
  camera.lookAt(0, 0.5, 0);

  return {
    scene,
    camera,
    update(dtMs: number): void {
      cube.rotation.y += dtMs * CUBE_RADS_PER_MS;
    },
    cubeAngle: () => cube.rotation.y,
    resize(aspect: number): void {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    },
  };
}
