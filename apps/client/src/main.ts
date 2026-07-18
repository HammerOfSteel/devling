import { isDebugEnabled, initDebugRail } from "./core/debug.js";
import { createDevlingHook, installDevlingHook } from "./core/hook.js";
import { bindVisibility, driveWithRaf, FixedLoop } from "./core/loop.js";
import { createRenderer, resizeRenderer } from "./render/renderer.js";
import { buildWalkingSkeleton } from "./render/scene.js";

/** Client entry (Phase 0 final form: renderer + loop + scene + hook + rail). */
const canvas = document.querySelector<HTMLCanvasElement>("#app");
if (!canvas) throw new Error("canvas #app missing");

const renderer = createRenderer(canvas);
const world = buildWalkingSkeleton();
world.resize(window.innerWidth / window.innerHeight);

const loop = new FixedLoop({
  onTick: (dtMs) => {
    world.update(dtMs);
  },
  onRender: () => {
    renderer.render(world.scene, world.camera);
    rail?.frame();
  },
});

const { hook, pushEvent } = createDevlingHook({
  loopStats: () => ({ tick: loop.stats.tick, running: loop.stats.running }),
  cubeAngle: () => world.cubeAngle(),
});
installDevlingHook(window, hook);
pushEvent("boot");

const rail = isDebugEnabled(window.location.search) ? initDebugRail(renderer, loop) : null;

bindVisibility(loop, document);
driveWithRaf(loop);
pushEvent("loop-started");

window.addEventListener("resize", () => {
  resizeRenderer(renderer, window.innerWidth, window.innerHeight, window.devicePixelRatio);
  world.resize(window.innerWidth / window.innerHeight);
});
