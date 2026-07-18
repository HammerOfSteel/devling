# 🏠 DEVLING — `todo.md`

> **A Tamagotchi for your AI.** A low-poly, tilt-shift diorama of a two-story Developer's House, rendered in Three.js. Inside lives a little procedurally-generated developer who acts out — in real time — whatever your external AI agent (VS Code assistant, CLI agent, CI bot) is actually doing: thinking, coding, debugging, researching, celebrating, despairing.

| | |
|---|---|
| **Project** | `devling` (working title) |
| **Doc version** | 1.0.0 — initial master plan |
| **Doc status** | ✅ Approved — this file is the single source of truth |
| **Current state** | Phase 0 — Task 0.1 ✅ closed (gates green, mirrored) · **Next action → 0.2.1** |
| **Repo** | `devling/` monorepo (pnpm workspaces) · public mirror: [github.com/HammerOfSteel/devling](https://github.com/HammerOfSteel/devling) |
| **Doc owner** | The build agent. Updated after **every** subtask. No exceptions. |

---

## Table of Contents

1. [Project Overview & Glossary](#1-project-overview--glossary)
2. [The Workflow Contract (READ FIRST, EVERY SESSION)](#2-the-workflow-contract)
3. [Tech Stack](#3-tech-stack)
4. [Architecture](#4-architecture)
5. [Controller API v1 — Schema & Behavior Mapping](#5-controller-api-v1)
6. [Phases → Tasks → Subtasks (the build)](#6-phases--tasks--subtasks)
7. [Testing Strategy](#7-testing-strategy)
8. [Performance Budgets](#8-performance-budgets)
9. [Risks & Mitigations](#9-risks--mitigations)
10. [Decisions Considered & Rejected](#10-decisions-considered--rejected)
11. [Progress Log](#11-progress-log)

---

## 1. Project Overview & Glossary

### 1.1 What we are building

A browser app (desktop-first, second-monitor / side-panel friendly) showing a **top-down/isometric diorama** of a two-story house. The look targets *Link's Awakening (2019)*: toy-scale low-poly geometry, saturated-but-soft palettes, tilt-shift depth of field, soft shadows, gentle bloom.

The resident character is **modular** (Animal Crossing-style human: swappable head, upper body, arms, hands, lower body, legs, feet) and **procedurally assembled** from a seeded "DNA". The house itself — footprint, room layout, furniture placement, textures, palettes — is procedurally generated per seed, validated by constraint checks so it always *works* (every object reachable, every room connected).

The character has two lives:

1. **Autonomous life** (no external input): needs-driven routines — sleep at night, coffee in the morning, cook, eat, bathroom, read, watch TV, doomscroll. Day/night cycle synced to the viewer's real clock by default.
2. **Directed life** (Controller API): an external AI pushes its status/thoughts/tasks over REST/WebSocket, and the character *performs* them — `debugging` → hunched angry typing under a red monitor glow; `researching` → reading on the couch or scrolling the phone; `success` → confetti jump.

A diegetic HUD shows the agent's live "train of thought", current task, workflow phase, recent actions, and connection state — restyled by the day/night cycle.

### 1.2 Glossary (terms used throughout this file)

| Term | Meaning |
|---|---|
| **Bridge** | The Fastify server that receives external-AI calls and fans them out to browser viewers over WS. |
| **Director** | Root XState machine deciding who's in charge: `autonomy` / `directed` / `reacting`. |
| **Performance** | A scripted visual behavior bound to an API status (location + props + animation + mood + FX). |
| **SmartObject** | A furniture entity that advertises interaction slots ("sit here, facing X, play anim Y, gain need Z"). |
| **DNA** | Serializable seed + part choices + palette defining one character. |
| **Golden frame** | A pixel-compared screenshot at fixed seed/time/camera used for visual regression. |
| **Sim tick** | Fixed 20 Hz headless simulation step. Rendering interpolates between ticks at display rate. |
| **P.T.S** | Phase.Task.Subtask numbering, e.g. `2.4.1`. Used in commits and this file. |

---

## 2. The Workflow Contract

**This section is law.** Every working session starts by reading it. The build agent acts as PM + developer and moves strictly bottom-up: subtask → task → phase.

### 2.1 Hierarchy & gates

| Level | Unit of | Gate to close it | Git action on close |
|---|---|---|---|
| **Phase** | Major milestone | **ALL** tests green: `pnpm test:all` (lint + typecheck + unit + smoke + e2e + goldens) | `git checkout main && git merge --no-ff <branch> && git tag phase-<N> && git push origin main --tags` |
| **Task** | One feature | **Smoke tests** green: `pnpm test:smoke` (plus unit suite still green) | `git push -u origin <branch>` |
| **Subtask** | Smallest unit | **Unit tests** written *with* the code and green: `pnpm test:unit` | `git commit` (todo.md updated in the same commit) |

### 2.2 Ceremonies (exact commands)

```bash
# ── PHASE OPEN ─────────────────────────────────────────────
git checkout main && git pull
git checkout -b phase/<N>-<slug>          # e.g. phase/2-house

# ── SUBTASK CLOSE (repeat per subtask) ─────────────────────
pnpm test:unit                            # must be green
#  → edit todo.md: [ ]→[x] on the subtask, add Progress Log line
git add -A
git commit -m "<type>(<scope>): <summary> [P.T.S]"

# ── TASK CLOSE ─────────────────────────────────────────────
pnpm test:smoke                           # must be green
git push -u origin phase/<N>-<slug>

# ── PHASE CLOSE ────────────────────────────────────────────
pnpm test:all                             # must be green
git checkout main
git merge --no-ff phase/<N>-<slug>
git tag phase-<N>
git push origin main --tags
```

### 2.3 Commit convention

Conventional Commits with the subtask ID in square brackets:

```
feat(sim): grid A* with stair portal edges [4.3.2]
fix(render): tilt-shift focus band follows character [1.3.2]
chore(repo): pnpm workspace scaffold [0.1.1]
test(procgen): property tests for layout validators [2.1.3]
docs(api): regenerate JSON schemas [7.4.2]
```

Scopes: `repo` `shared` `sim` `procgen` `server` `client` `render` `house` `char` `bridge` `hud` `api` `e2e` `docs`.

### 2.4 todo.md update protocol (after EVERY subtask)

1. Flip the subtask checkbox `[ ]` → `[x]`.
2. If it finished a task/phase, flip those too.
3. Update the **Current state** line in the header table (next action pointer).
4. Append one line to the [Progress Log](#11-progress-log): date · P.T.S · commit subject · hash.
5. Commit todo.md **in the same commit** as the code (the tree and the plan may never diverge).

### 2.5 Status legend

- `[ ]` not started  ·  `[~]` in progress (**max ONE `[~]` in the whole file at any time**)  ·  `[x]` done  ·  `[!]` blocked (must carry a `> BLOCKED:` note explaining why + unblock condition)

### 2.6 Definition of Done

- **Subtask**: code + its unit tests in the same commit; suite green; todo.md updated; no `any` without a `// justified:` comment; no skipped tests.
- **Task**: all subtasks `[x]`; smoke script for the feature added/extended and green; pushed.
- **Phase**: all tasks `[x]`; `test:all` green including goldens; merged to `main` with tag; Progress Log phase summary written; performance budget (§8) not regressed.

### 2.7 Test-first bias

Sim, procgen, nav, protocol, and parser subtasks are written **test-first** (the test names below are the spec). Renderer subtasks (meshes, lights, post) are verified by golden frames + smoke hooks instead — unit-testing WebGL pixels directly is a fool's errand; asserting scene-graph structure + goldens is not.

---

## 3. Tech Stack

Verified current as of **2026-07** (three.js r185 is the July 2026 release; Node 24 is active LTS). Pin exact versions at `0.1.1` and record them here.

### 3.1 Core

| Concern | Choice | Repo / Package | Why |
|---|---|---|---|
| Language | **TypeScript** (strict, ESM everywhere) | `microsoft/TypeScript` | One typed contract from external AI → wire → sim → renderer. |
| Runtime | **Node 24 LTS** (server/tools), evergreen browsers (client) | `nodejs/node` | Active LTS through the build window. |
| Package mgr / monorepo | **pnpm workspaces** | `pnpm/pnpm` | Fast, strict, zero extra orchestration needed at this scale (no turbo/nx). |
| Build | **Vite** | `vitejs/vite` | Instant dev loop for the client; library mode for packages. |
| Rendering | **three.js r185+, WebGLRenderer** | `mrdoob/three.js` | The renderer. Stay on WebGL for reach; WebGPU/TSL is watched, not adopted (§10). |
| Post-processing | **postprocessing** | `pmndrs/postprocessing` | Ships `TiltShiftEffect`, DoF, SMAA, Bloom, Vignette, HueSaturation — the entire diorama grade in one battle-tested composer. |
| Camera | **camera-controls** | `yomotsu/camera-controls` | Constraint-friendly orbital rig with smooth `fitToBox` transitions for room focus. |
| 3D debug | **lil-gui**, **stats-gl** | `georgealways/lil-gui`, `RenaudRohlinger/stats-gl` | Dev-only tuning rail + GPU-aware perf readout. |

### 3.2 Simulation & state

| Concern | Choice | Repo / Package | Why |
|---|---|---|---|
| ECS | **miniplex** (v2) | `hmans/miniplex` | Ergonomic TS-first ECS; our scale (1 char, ~150 entities) values DX over raw SoA throughput. |
| Behavior | **XState v5** (5.32+) | `statelyai/xstate` | Actor-model statecharts: Director + one actor per activity; interruption semantics for free; fake-clock testable. |
| Utility AI | hand-rolled scorer (~150 LoC) in `packages/sim` | — | Need-based activity selection is a scoring table, not a framework problem. |
| UI state | **zustand** (vanilla stores) | `pmndrs/zustand` | HUD subscribes to sim/bridge stores without React; tiny, transient-update friendly. |
| Schemas | **zod v4** | `colinhacks/zod` | One schema → runtime validation (server & client) + inferred TS types + `z.toJSONSchema()` for published API docs. |

### 3.3 Procedural generation

| Concern | Choice | Repo / Package | Why |
|---|---|---|---|
| Seeded PRNG | **alea** | npm `alea` (as recommended by `jwagner/simplex-noise`) | Fast, seedable, forkable sub-streams (`rng.fork("furniture")`) — determinism is a hard requirement (§7). |
| Noise | **simplex-noise v4** | `jwagner/simplex-noise` | Wood grain, wallpaper wobble, rug patterns, palette jitter. |
| Blue-noise scatter | **poisson-disk-sampling** | `kchapelier/poisson-disk-sampling` | Decor/clutter scatter that never clumps. |
| Room layout | hand-rolled **constrained BSP** solver in `packages/procgen` | — | Fixed room program (5 rooms + stairwell) over a small grid: BSP + adjacency constraints is deterministic, fast, and property-testable. WFC rejected (§10). |
| Palettes | **chroma-js** | `gka/chroma.js` | Seeded harmonies + perceptual scales (OKLCH) → room/character palette roles with contrast validation. |
| Property testing | **fast-check** | `dubzzz/fast-check` | Layout/nav invariants ("every slot reachable for ANY seed") are property tests, not example tests. |

### 3.4 Server & protocol

| Concern | Choice | Repo / Package | Why |
|---|---|---|---|
| HTTP server | **Fastify v5** | `fastify/fastify` | Schema-first, fast, tiny. |
| WS | **@fastify/websocket** (ws) | `fastify/fastify-websocket` | Agent + viewer channels on the same port. |
| Zod ↔ Fastify | **fastify-type-provider-zod** | `turkerdev/fastify-type-provider-zod` | Route bodies validated by the *same* shared schemas the client uses. |
| Hardening | **@fastify/cors**, **@fastify/rate-limit**, bearer-token hook | `fastify/*` | Local-first but not naive. |
| Logging | **pino** (built into Fastify) | `pinojs/pino` | Structured logs; message audit trail in dev. |

### 3.5 Testing & quality

| Concern | Choice | Repo / Package | Why |
|---|---|---|---|
| Unit | **Vitest** + `@vitest/coverage-v8` | `vitest-dev/vitest` | Workspace-aware, fast, fake timers for clock/XState tests. |
| Smoke / e2e | **Playwright** (Chromium, fixed 1280×800 @ DPR 1) | `microsoft/playwright` | Boots real client+server; asserts via `window.__devling` hook. |
| Visual regression | **pixelmatch** + **pngjs** golden frames | `mapbox/pixelmatch` | Deterministic renders (fixed seed/clock/camera) diffed in CI. |
| Lint/format | **eslint** (flat) + **typescript-eslint** + **prettier**; **husky** + **lint-staged** | — | The workflow contract, mechanically enforced pre-commit. |
| CI | **GitHub Actions** | — | `lint → typecheck → unit → build → smoke → goldens` on every push; full matrix on phase branches. |

### 3.6 Misc

| Concern | Choice | Why |
|---|---|---|
| Audio | **howler.js** (`goldfire/howler.js`) | Phase 7 only. Gesture-unlock handled; day/night ambience + typing/footstep SFX. |
| HUD text/labels in 3D | **CSS2DRenderer** (three addon) | Speech/thought bubbles as DOM = free a11y, ellipsis, emoji. `troika-three-text` only if in-scene text ever needs to be true 3D (not planned). |
| Scenario files | **yaml** (`eemeli/yaml`) | Simulator CLI scripts fake AI sessions for demos/e2e. |
| IDs / time | **uuid**, injected `Clock` | `Date.now()` is banned inside `packages/sim` (§7.4). |

### 3.7 Pinned versions (recorded at 0.1.1 · npm registry snapshot 2026-07-18)

```
typescript@6.0.3 (see note) vite@8.1.5                  three@0.185.1
postprocessing@6.39.2       camera-controls@3.1.2       lil-gui@0.21.0
stats-gl@4.2.3              miniplex@2.0.0              xstate@5.32.5
zustand@5.0.14              zod@4.4.3                   alea@1.0.1
simplex-noise@4.0.3         poisson-disk-sampling@2.3.1 chroma-js@3.2.0
fast-check@4.9.0            fastify@5.10.0              @fastify/websocket@11.3.0
@fastify/cors@11.3.0        @fastify/rate-limit@11.1.0  fastify-type-provider-zod@7.0.0
pino@10.3.1                 vitest@4.1.10               @vitest/coverage-v8@4.1.10
@playwright/test@1.61.1     pixelmatch@7.2.0            pngjs@7.0.0
eslint@10.7.0               @eslint/js@10.0.1           typescript-eslint@8.64.0
eslint-config-prettier@10.1.8  prettier@3.9.5           husky@9.1.7
lint-staged@17.0.8          howler@2.2.4                yaml@2.9.0
uuid@14.0.1
```

> **Amended at 0.1.2:** TypeScript was first pinned at 7.0.2 (native-compiler line) and compiled the whole workspace — but `typescript-eslint@8.64.0` crashes against TS 7's API surface (`typescript-estree` TypeError at load) and declares peer support `>=4.8.4 <6.1.0`. Pin dropped to **6.0.3**, the newest mutually-supported release; workspace re-typechecked green. Revisit TS 7 when typescript-eslint ships native-compiler support.

---

## 4. Architecture

### 4.1 Monorepo layout

```
devling/
├─ apps/
│  ├─ client/                 # Three.js app (Vite)
│  │  └─ src/
│  │     ├─ core/             #   loop (fixed-step + rAF), input, debug rail, __devling hook
│  │     ├─ render/           #   scene, camera rig, lights, post pipeline, materials, palettes
│  │     ├─ meshes/           #   house kit, furniture factories, character factory, props
│  │     ├─ bridge/           #   WS client, intake, intent translator, thought/task stores
│  │     └─ hud/              #   DOM overlay: HUD, menus, bubbles, diegetic screens
│  └─ server/                 # Fastify Bridge: REST + WS hub + auth + rate limit
├─ packages/
│  ├─ shared/                 # zod protocol schemas, enums, envelope, mapping spec (DATA)
│  ├─ sim/                    # headless: ECS, clock, needs, nav, Director/activities  — NO three import
│  └─ procgen/                # headless: rng, noise wrappers, layout solver, palettes, DNA — NO three import
├─ tools/
│  └─ simulator/              # fake-AI CLI: plays YAML scenarios against the Bridge
├─ e2e/                       # Playwright suites + golden frames + scenario fixtures
└─ todo.md                    # THIS FILE — single source of truth
```

**Hard boundary, mechanically enforced:** `sim` and `procgen` have **zero** dependency on `three` (enforced via `depcheck` + eslint `no-restricted-imports` in CI). Everything that must be deterministic and unit-tested lives below the render line; `apps/client` is a *view* of the sim, never the owner of game state.

### 4.2 Data flow

```
External AI (IDE agent / CLI / CI hook)
   │   REST POST /api/v1/agent/*             WS ws://…/ws/v1/agent
   ▼
apps/server  — zod-validate → ack 202 / 400 ─ pino audit log
   │   WS fan-out (broadcast to all viewers)
   ▼
apps/client/bridge — parse envelope → dedupe/order/coalesce → IntentQueue
   ▼
Director (XState, in packages/sim) — priority: reacting > directed > autonomy
   ▼
ECS world @ 20 Hz fixed tick  (needs, nav, activities, reservations, clock)
   ▼ interpolated state (render alpha)
render/ (three r185 + postprocessing)        hud/ (DOM, zustand stores)
```

- **Sim is authoritative.** API messages become *intents*; the Director decides; activities drive ECS components; the renderer mirrors.
- **Fixed timestep** 20 Hz with accumulator; render interpolates. Sim is replayable: same seed + same message log ⇒ same state hash (this powers e2e assertions and bug repro).
- **Idle fallback:** no agent traffic for `idleTimeoutMs` (default 180 000) ⇒ Director returns to `autonomy`. A `session.end` does the same immediately (with a lights-off goodbye Performance).

### 4.3 The `window.__devling` test hook (client, dev/test builds only)

```ts
interface DevlingHook {
  state(): { mode: "autonomy"|"directed"|"reacting"; status: AgentStatus|null;
             activity: string; floor: 0|1; room: string; pos: [number,number];
             clock: { day: number; hh: number; mm: number; daypart: Daypart };
             needs: Record<Need, number>; tick: number; seedHouse: string; dnaSeed: string; }
  goldenPose(view: string): Promise<void>;   // freeze clock+camera to a named golden setup
  drainEvents(): SimEvent[];                 // events since last call (for smoke asserts)
}
```

Playwright never screen-scrapes pixels for logic asserts — it calls the hook. Pixels are only compared in golden-frame tests.

---

## 5. Controller API v1

Everything the external AI can say to the house. Transport-agnostic payloads: **REST** for dead-simple integration (curl from anything), **WebSocket** for streams (thoughts) and lowest latency. Both carry the same zod-validated envelopes; the Bridge normalizes REST bodies into envelopes.

### 5.1 Transports & auth

| | |
|---|---|
| Base URL | `http://<host>:7777` (default port `7777`) |
| Agent WS | `ws://<host>:7777/ws/v1/agent?token=…` (or `Authorization: Bearer`) |
| Viewer WS | `ws://<host>:7777/ws/v1/viewer` (browser clients; read-only broadcast + hello snapshot) |
| Auth | `Authorization: Bearer $DEVLING_TOKEN` on every agent REST call / WS connect. 401 otherwise. Viewer channel is token-free on localhost, token-gated when `DEVLING_PUBLIC=1`. |
| Rate limits | 20 req/s per agent connection (REST), thought messages coalesced client-side beyond 2/s (§5.6). 429 with `retryAfterMs`. |
| Versioning | `v1` in path; envelope carries `v: 1`. Unknown fields ignored (forward-compatible); unknown `type` → 400. |

### 5.2 REST endpoints

| Method | Path | Body schema | Purpose |
|---|---|---|---|
| GET | `/api/v1/health` | — | Liveness + version. |
| GET | `/api/v1/state` | — | Current sim snapshot (mode, status, activity, room, clock, needs) — lets the AI *read* its pet. |
| POST | `/api/v1/agent/session` | `SessionMsg` | Start/end a work session (wave hello / lights-off goodbye). |
| POST | `/api/v1/agent/status` | `StatusMsg` | **The main lever.** Sets what the character is performing. |
| POST | `/api/v1/agent/thought` | `ThoughtMsg` | Push one reasoning fragment → HUD ticker + occasional speech bubble. |
| POST | `/api/v1/agent/task` | `TaskMsg` | Current task headline + progress (HUD task card). |
| POST | `/api/v1/agent/todo` | `TodoSyncMsg` | Full `todo.md` markdown sync → parsed into phase/task progress (HUD stepper). |
| POST | `/api/v1/agent/event` | `EventMsg` | One-shot occurrences (tests passed, build failed, PR merged…) → reactions. |

Responses: `202 {accepted:true, id}` · `400 {error, issues[]}` (zod details) · `401` · `429`.

### 5.3 Wire schemas (zod v4 — lives in `packages/shared/src/protocol.ts`)

```ts
export const AgentStatus = z.enum([
  "idle","thinking","planning","researching","reading_docs",
  "coding","refactoring","debugging","testing","waiting",
  "reviewing","committing","blocked","error","success","celebrating",
]);

export const StatusMsg = z.object({
  status: AgentStatus,
  detail: z.string().max(200).optional(),        // "implementing auth middleware"
  intensity: z.number().min(0).max(1).default(0.5), // modulates anim speed, mood, FX strength
  file: z.string().max(160).optional(),          // shown on the diegetic monitor
});

export const ThoughtMsg = z.object({
  text: z.string().min(1).max(500),
  kind: z.enum(["reasoning","observation","decision","question"]).default("reasoning"),
  ttlMs: z.number().int().min(1_000).max(120_000).default(20_000),
});

export const TaskMsg = z.object({
  taskId: z.string().max(64),
  title: z.string().max(120),
  phase: z.string().max(80).optional(),          // e.g. "Phase 2 — Procedural House"
  status: z.enum(["started","progress","done","failed"]),
  progress: z.number().min(0).max(1).optional(),
});

export const TodoSyncMsg = z.object({ markdown: z.string().max(200_000) });

export const EventMsg = z.object({
  type: z.enum([
    "tests_passed","tests_failed","build_failed","lint_failed",
    "commit","push","pr_opened","pr_merged","deploy","milestone","user_message",
  ]),
  detail: z.string().max(200).optional(),
});

export const SessionMsg = z.object({
  state: z.enum(["start","end"]),
  agentName: z.string().max(40).default("Agent"),
  project: z.string().max(80).optional(),
});

// WS envelope — discriminated union, one schema for both directions of validation
export const AgentMessage = z.discriminatedUnion("type", [
  z.object({ type: z.literal("agent.status"),  v: z.literal(1), id: z.uuid(), ts: z.iso.datetime(), payload: StatusMsg }),
  z.object({ type: z.literal("agent.thought"), v: z.literal(1), id: z.uuid(), ts: z.iso.datetime(), payload: ThoughtMsg }),
  z.object({ type: z.literal("agent.task"),    v: z.literal(1), id: z.uuid(), ts: z.iso.datetime(), payload: TaskMsg }),
  z.object({ type: z.literal("agent.todo"),    v: z.literal(1), id: z.uuid(), ts: z.iso.datetime(), payload: TodoSyncMsg }),
  z.object({ type: z.literal("agent.event"),   v: z.literal(1), id: z.uuid(), ts: z.iso.datetime(), payload: EventMsg }),
  z.object({ type: z.literal("agent.session"), v: z.literal(1), id: z.uuid(), ts: z.iso.datetime(), payload: SessionMsg }),
  z.object({ type: z.literal("ping"),          v: z.literal(1), id: z.uuid(), ts: z.iso.datetime() }),
]);

// Server → agent:   {type:"ack", id}  |  {type:"error", id, issues}  |  {type:"pong", id}
// Server → viewer:  {type:"viewer.hello", snapshot}  |  re-broadcast of every accepted AgentMessage
```

`z.toJSONSchema()` exports these to `packages/shared/schema/*.json` at build time — that folder **is** the published API reference for non-TS integrators.

### 5.4 Status → Performance mapping (THE table)

Data-driven: this table lives as typed data in `packages/shared/src/mapping.ts`; sim + renderer both consume it. `intensity` scales animation playback rate (±30 %), mood layer strength, and FX opacity.

| `status` | Where | Props | Performance (animation) | Mood/face | Scene FX | HUD accent |
|---|---|---|---|---|---|---|
| `idle` | — | — | Hands Director back to **autonomy** routines | neutral | — | grey |
| `thinking` | Office (pacing lane) | — | Slow pace, hand-on-chin, occasional stop-and-stare | focused | "…" thought bubble, dimmed monitor | violet |
| `planning` | Office whiteboard | marker | Whiteboard scribble bursts, step-back-and-look | focused | Sticky notes pop onto board | blue |
| `researching` | Living-room couch **or** office bookshelf (50/50 per entry, seeded) | book / phone | Read with page flips, or phone-scroll with thumb | curious | Floating "?" motes | teal |
| `reading_docs` | Office desk | — | Leans in, slow scroll posture, chin rest | focused | Monitor shows doc page (diegetic screen) | teal |
| `coding` | Office desk | — | Typing loop (speed ∝ intensity), micro pauses | focused | Monitor code scroll + soft key clacks; window glow at night | green |
| `refactoring` | Office desk | — | Calm typing, periodic stretch; tidies desk items between bursts | content | Monitor shows diff-ish blocks | green |
| `debugging` | Office desk | mug (refills ↑ with intensity) | Hunched fast bursts, head-scratch, lean-back sigh cycle | annoyed → angry (∝ intensity) | **Red-tinted monitor glow**, desk-lamp flicker at high intensity | red |
| `testing` | Office desk | — | Leans back, arms crossed, fingers crossed at high intensity | tense | Monitor progress bar creeps | amber |
| `waiting` | Kitchen | mug | Brew coffee, sip, glance at phone | relaxed | Kettle steam puffs | amber |
| `reviewing` | Couch (tablet) or desk | tablet | Slow nod / head-shake alternation, chin stroke | judging | Margin "✓/✗" motes | blue |
| `committing` | Office desk | — | One decisive keystroke, satisfied nod | proud | Tiny "shipped" chime + monitor flash | green |
| `blocked` | Stairs (sits) or window | — | Sit, elbows-on-knees, look around slowly | glum | Big "?" bubble; clouds dim the sun slightly | grey |
| `error` | Office desk | — | Facepalm → head-on-desk, slow recovery | distraught | Brief red vignette pulse, lamp flicker | red |
| `success` | Office desk → free space | — | Jump-celebrate ×N (∝ intensity), fist pump | happy | **Confetti burst** (instanced), warm light bump | green |
| `celebrating` | Living room | — | Dance loop (2 variants), invites camera with a wave | ecstatic | Disco-ish light sweep, TV shows fireworks | rainbow |

**One-shot `event` reactions** (interrupt current Performance ≤ 4 s, then return): `tests_passed` mini fist-pump · `tests_failed` slump + sigh · `build_failed` stumble + papers fly · `lint_failed` eye-roll · `commit`/`push` nod / two-finger salute · `pr_opened` hopeful lean · `pr_merged` full `celebrating` for 10 s · `deploy` salute to a rocket sticker on the wall · `milestone` `success` performance · `user_message` looks toward camera, waves.

### 5.5 Priority & interruption rules

1. `reacting` (event one-shots) > `directed` (status) > `autonomy` (needs).
2. New `status` message replaces the current Performance with a ≤ 1 s cross-transition (walk cancellation allowed mid-path).
3. Equal consecutive `status` values only re-trigger if `detail` changed (else ignored — keeps the character calm under chatty agents).
4. Critical needs interject even in `directed` mode: energy < 10 % → micro-nap-at-desk beat (10 s, HUD shows "*running on fumes*"), then Performance resumes. The pet stays alive; the show stays honest.
5. `session.end` or `idleTimeoutMs` (180 s default) with no traffic → graceful return to `autonomy` (stretch, then routine).

### 5.6 Delivery semantics

- Ordering by `ts` with 2 s reorder buffer; duplicates dropped by `id` (LRU 512).
- Thoughts: max 2/s surfaced; bursts coalesce to the most recent 5 in the ticker queue (all retained in HUD history drawer, cap 50).
- WS reconnect: exponential backoff 0.5→8 s + jitter; Bridge keeps a 60-message replay ring per viewer so a blipped browser doesn't miss the show.
- REST and WS may be mixed freely by the agent (same envelopes server-side).

### 5.7 Integration examples

```bash
# hello
curl -s -X POST http://localhost:7777/api/v1/agent/session \
  -H "Authorization: Bearer $DEVLING_TOKEN" -H "content-type: application/json" \
  -d '{"state":"start","agentName":"Claude","project":"devling"}'

# the show: debugging, angrily
curl -s -X POST http://localhost:7777/api/v1/agent/status \
  -H "Authorization: Bearer $DEVLING_TOKEN" -H "content-type: application/json" \
  -d '{"status":"debugging","detail":"null ref in LayoutSolver","intensity":0.85,"file":"packages/procgen/src/layout.ts"}'

# a thought for the ticker
curl -s -X POST http://localhost:7777/api/v1/agent/thought \
  -H "Authorization: Bearer $DEVLING_TOKEN" -H "content-type: application/json" \
  -d '{"text":"The stair cells are being claimed by two rooms — the BSP split must exclude the stair footprint first.","kind":"reasoning"}'

# outcome
curl -s -X POST http://localhost:7777/api/v1/agent/event \
  -H "Authorization: Bearer $DEVLING_TOKEN" -H "content-type: application/json" \
  -d '{"type":"tests_passed","detail":"procgen 214/214"}'
```

```ts
// 10-line TS client (what the VS Code hook uses)
const ws = new WebSocket(`ws://localhost:7777/ws/v1/agent?token=${TOKEN}`);
const send = (type: string, payload: unknown) =>
  ws.send(JSON.stringify({ v: 1, id: crypto.randomUUID(), ts: new Date().toISOString(), type, payload }));
send("agent.status", { status: "coding", detail: "wiring WS reconnect", intensity: 0.6 });
send("agent.thought", { text: "Backoff needs jitter or every viewer reconnects in sync." });
```
---

## 6. Phases → Tasks → Subtasks

> Numbering is `P.T.S`. Every subtask line carries its **test** (the gate) and **commit** message. Task smoke gates and phase exits are stated explicitly. One `[~]` in the whole file, ever.

---

### 🏗️ PHASE 0 — Foundation & Walking Skeleton
> **Branch:** `phase/0-foundation` · **Goal:** monorepo + quality gates + shared protocol + a booting client/server pair (spinning placeholder diorama, echoing Bridge). · **Exit:** `test:all` green in CI on a fresh clone; tag `phase-0`.

#### Task 0.1 — Monorepo & toolchain
*Smoke gate: fresh `pnpm i && pnpm -r build && pnpm test:unit` green on CI runner.*

- [x] **0.1.1** Scaffold pnpm workspace (`apps/*`, `packages/*`, `tools/*`, `e2e/`), root `tsconfig.base.json` (strict, ESM, NodeNext), stub packages that compile. Pin all §3 versions and record them in §3. · *test:* `pnpm -r typecheck` green on stubs · *commit:* `chore(repo): pnpm workspace scaffold [0.1.1]`
- [x] **0.1.2** ESLint flat config + typescript-eslint + prettier + `no-restricted-imports` guard (`three` banned in `sim`/`procgen`); husky + lint-staged pre-commit (lint+typecheck on staged). · *test:* seeded violation fixture fails lint; clean tree passes · *commit:* `chore(repo): lint, format, boundary guards [0.1.2]`
- [x] **0.1.3** Vitest workspace config + coverage-v8 with thresholds (80 % lines on `shared`/`sim`/`procgen`), `test:unit` root script. · *test:* sample specs in each package run; coverage report emitted · *commit:* `chore(repo): vitest workspace + coverage gates [0.1.3]`
- [x] **0.1.4** Playwright setup: Chromium project, fixed viewport 1280×800 @ DPR 1, `test:smoke` + `test:e2e` scripts, webServer config for client+server. · *test:* trivial spec loads a blank page in CI · *commit:* `chore(repo): playwright harness [0.1.4]`
- [x] **0.1.5** GitHub Actions: `ci.yml` (install→lint→typecheck→unit→build→smoke) on push; `phase.yml` adds e2e+goldens on `phase/**`; artifact upload for golden diffs. · *test:* first push runs green end-to-end · *commit:* `ci(repo): pipelines for push and phase branches [0.1.5]`

#### Task 0.2 — `packages/shared`: protocol package
*Smoke gate: a Node script imports built package, round-trips every message type.*

- [ ] **0.2.1** Implement all §5.3 zod schemas + inferred types + `AgentStatus`/`EventType` enums. · *test:* valid/invalid fixtures per schema (boundary lengths, bad enums) · *commit:* `feat(shared): protocol schemas v1 [0.2.1]`
- [ ] **0.2.2** Envelope helpers: `makeMsg(type, payload)` (uuid, ts), `parseMsg(raw)` (safe, discriminated), serialize round-trip. · *test:* round-trip equality; malformed JSON → typed error · *commit:* `feat(shared): envelope + parse helpers [0.2.2]`
- [ ] **0.2.3** `mapping.ts`: typed Status→Performance spec table (§5.4) as data (location tags, prop ids, anim ids, mood, fx ids, hud accent). · *test:* every `AgentStatus` has exactly one entry; referenced ids are unique/known · *commit:* `feat(shared): status performance mapping spec [0.2.3]`
- [ ] **0.2.4** JSON Schema export script (`z.toJSONSchema` → `schema/*.json`) wired into build. · *test:* emitted files valid JSON Schema; snapshot test · *commit:* `feat(shared): JSON schema export [0.2.4]`

#### Task 0.3 — `apps/server`: Bridge skeleton
*Smoke gate: boot server → curl status → 202; viewer WS receives the broadcast within 100 ms.*

- [ ] **0.3.1** Fastify v5 boot, env config (`DEVLING_TOKEN`, `DEVLING_PORT=7777`, `DEVLING_PUBLIC`), `/api/v1/health`, pino logging. · *test:* inject() health 200 with version · *commit:* `feat(server): fastify boot + health [0.3.1]`
- [ ] **0.3.2** zod type-provider wiring; all §5.2 POST routes validating via shared schemas → 202/400(issues). · *test:* per-route valid→202, invalid→400 with zod issues · *commit:* `feat(server): agent REST routes [0.3.2]`
- [ ] **0.3.3** WS hub: `/ws/v1/agent` + `/ws/v1/viewer`, envelope validation, fan-out to viewers, heartbeat ping/pong, 60-msg replay ring per viewer. · *test:* fake sockets — agent msg reaches 2 viewers; late viewer gets ring replay · *commit:* `feat(server): ws hub + replay ring [0.3.3]`
- [ ] **0.3.4** Bearer-auth hook (REST + WS query token), @fastify/rate-limit (20 r/s, 429+retryAfterMs), @fastify/cors. · *test:* 401 w/o token; 429 after burst; CORS preflight ok · *commit:* `feat(server): auth, rate limit, cors [0.3.4]`
- [ ] **0.3.5** `GET /api/v1/state` skeleton (serves last-known snapshot pushed by primary viewer over WS `viewer.state` uplink). · *test:* snapshot set→get round-trip · *commit:* `feat(server): state snapshot endpoint [0.3.5]`

#### Task 0.4 — `apps/client`: shell & loop
*Smoke gate: page boots with zero console errors; hook reports ticking sim; cube visibly rotates in golden frame.*

- [ ] **0.4.1** Vite app: canvas mount, `WebGLRenderer` (ACESFilmic, outputColorSpace srgb), resize handling, DPR clamp (≤2). · *test:* renderer constructed in jsdom-guarded factory; params asserted · *commit:* `feat(client): renderer shell [0.4.1]`
- [ ] **0.4.2** `core/loop.ts`: 20 Hz fixed-step accumulator + rAF render with interpolation alpha; pause on `visibilitychange`. · *test:* fake timers — 1 s wall ⇒ 20 ticks; alpha ∈ [0,1); hidden tab ⇒ throttled · *commit:* `feat(client): fixed-timestep loop [0.4.2]`
- [ ] **0.4.3** Walking-skeleton scene: ground plane, spinning placeholder cube, directional+ambient light — proves the whole pipe. · *test:* scene graph contains expected nodes (unit); golden frame #0 · *commit:* `feat(client): walking skeleton scene [0.4.3]`
- [ ] **0.4.4** Debug rail: stats-gl, lil-gui (hidden behind `?debug`), seed readout, `window.__devling` hook v0 (`state()`, `drainEvents()`). · *test:* hook returns tick>0 after 500 ms (vitest browser-ish via happy-dom where possible) · *commit:* `feat(client): debug rail + test hook [0.4.4]`

**Phase 0 exit ritual:** `pnpm test:all` → merge → `git tag phase-0` → update §11.

---

### 🎥 PHASE 1 — Rendering Core: The Diorama Look
> **Branch:** `phase/1-render-core` · **Goal:** the *Link's Awakening* camera+light+post stack, palette/material system, golden-frame harness. After this phase anything placed in the world automatically looks like a toy. · **Exit:** goldens for 4 dayparts × 2 camera presets locked; tag `phase-1`.

#### Task 1.1 — Camera rig
*Smoke gate: hook-driven camera preset switch lands within easing tolerance; no gimbal weirdness at constraints.*

- [ ] **1.1.1** PerspectiveCamera (fov 30°) + camera-controls; constraints: polar 35–65°, distance clamp, pan bounds to house AABB; presets `overview`, `floor0`, `floor1`. · *test:* constraint math (pure fns) + preset transforms · *commit:* `feat(render): constrained camera rig [1.1.1]`
- [ ] **1.1.2** Room-focus transitions: `focusRoom(roomId)` via `fitToBox` easing; `focusCharacter()` follow mode with soft leash. · *test:* target/box math unit-tested; smoke uses hook to assert arrival · *commit:* `feat(render): room + character focus [1.1.2]`
- [ ] **1.1.3** Input map: drag-orbit, wheel-zoom, double-click room focus, `1/2` floor keys, `f` follow toggle. · *test:* input→command dispatch table unit test · *commit:* `feat(render): input map [1.1.3]`

#### Task 1.2 — Lighting system
*Smoke gate: time-of-day scrub (hook) shifts sun/shadow/exposure smoothly with no shadow acne at goldens.*

- [ ] **1.2.1** Sun/moon directional rig: position/color/intensity from `timeOfDay` param (curve tables, not ifs); hemisphere ambient base. · *test:* curve sampling at dawn/noon/dusk/night snapshot values · *commit:* `feat(render): sun-moon rig [1.2.1]`
- [ ] **1.2.2** Shadows: single 2048 PCFSoft map, frustum fitted to house AABB, bias tuned; shadow toggle per quality tier. · *test:* frustum-fit math unit test · *commit:* `feat(render): fitted soft shadows [1.2.2]`
- [ ] **1.2.3** Interior practicals: pooled PointLights (≤8 active), window emissive planes at night, per-room on/off API (sim will drive later). · *test:* pool eviction logic; light budget assert · *commit:* `feat(render): practical light pool [1.2.3]`
- [ ] **1.2.4** Exposure & grade schedule by daypart (ACES exposure ramp, subtle blue night shift). · *test:* schedule curve snapshots · *commit:* `feat(render): daypart exposure schedule [1.2.4]`

#### Task 1.3 — Post pipeline (the tilt-shift soul)
*Smoke gate: post on/off toggle golden pair; FPS ≥ 55 on reference profile with post on.*

- [ ] **1.3.1** postprocessing `EffectComposer` scaffold: RenderPass + ordered EffectPasses, resolution scale hook, quality tiers (off/low/high). · *test:* pass ordering + tier switch unit test · *commit:* `feat(render): composer scaffold [1.3.1]`
- [ ] **1.3.2** `TiltShiftEffect` tuned (band width/feather/rotation); focus band tracks character screen-Y with smoothing. · *test:* screen-Y projection math; golden #tilt · *commit:* `feat(render): tilt-shift focus band [1.3.2]`
- [ ] **1.3.3** SMAA + Vignette(0.25) + Bloom (luminance-thresholded, subtle) + HueSaturation/BrightnessContrast grade preset. · *test:* golden frames per effect-combo at fixed seed · *commit:* `feat(render): diorama grade stack [1.3.3]`
- [ ] **1.3.4** Golden-frame harness v1: `pnpm golden [--update]` renders named views (frozen clock/seed/camera) → pixelmatch (τ=0.1, ≤0.5 % diff) in CI. · *test:* harness detects an injected 1-pixel-shift fixture · *commit:* `test(render): golden frame harness [1.3.4]`

#### Task 1.4 — Materials & palette system
*Smoke gate: `?seed=` reroll produces distinct-but-tasteful palettes across 10 seeds (manual review + contrast validator green).*

- [ ] **1.4.1** Palette generator: seeded chroma-js OKLCH harmonies → role tokens (wallDark/wallLight, floorWood, accentA/B, textileA/B, skin×6, hair×8); WCAG-ish ΔL validators between roles. · *test:* 100-seed property test — all validators pass · *commit:* `feat(procgen): seeded palette roles [1.4.1]`
- [ ] **1.4.2** Toy material factory: flat-shaded `MeshStandardMaterial` presets (matte/satin/plastic), vertex-color pipeline, shared env intensity; material cache by key. · *test:* cache hit/miss; preset params snapshot · *commit:* `feat(render): toy material factory [1.4.2]`
- [ ] **1.4.3** CanvasTexture generators: wood grain (simplex octaves), wallpaper (stripe/dot/plain + jitter), rug motifs; atlas + LRU cache; all seeded via forked rng. · *test:* determinism — same seed ⇒ identical pixel hash · *commit:* `feat(render): procedural texture kit [1.4.3]`

#### Task 1.5 — Dev ergonomics
*Smoke gate: seed URL round-trip reproduces identical golden.*

- [ ] **1.5.1** Seed console: `?seed=` param, regenerate button (lil-gui), copy-share-URL; seed displayed in debug rail. · *test:* seed parse/format round-trip · *commit:* `feat(client): seed console [1.5.1]`

**Phase 1 exit ritual:** `pnpm test:all` (goldens locked) → merge → tag `phase-1`.

---

### 🏘️ PHASE 2 — Procedural House
> **Branch:** `phase/2-house` · **Goal:** seed → valid two-story house (Kitchen, Living downstairs; Bedroom, Bathroom, Dev Office upstairs + stairwell), furnished with SmartObjects, meshed, instanced, nav-ready. · **Exit:** 50-seed sweep builds with zero validator errors; goldens for 3 curated seeds; tag `phase-2`.

#### Task 2.1 — Grid & house model (headless)
*Smoke gate: model (de)serializes and revalidates across 1000 random seeds in <5 s.*

- [ ] **2.1.1** Grid math in `procgen`: cell coords, floor index, rect ops, neighbor/AABB helpers. · *test:* exhaustive small-grid cases · *commit:* `feat(procgen): grid math [2.1.1]`
- [ ] **2.1.2** House data model: `House{floors[2]: Floor{rooms[], walls[], openings[], stair}}` — pure serializable data; room types enum incl. `hall`. · *test:* construct/serialize/parse round-trip · *commit:* `feat(procgen): house model [2.1.2]`
- [ ] **2.1.3** Validators (fast-check properties): full floor coverage, no overlap, door graph connects all rooms to stair/hall, stair footprint identical on both floors, bathroom not open to kitchen. · *test:* properties over generated houses + hand-made evil fixtures · *commit:* `test(procgen): house invariants [2.1.3]`

#### Task 2.2 — Layout solver
*Smoke gate: `layout(seed)` for 500 seeds → all validators green; median <10 ms.*

- [ ] **2.2.1** Footprint gen: seeded 14×10 base rect with optional L-notch; exterior wall ring. · *test:* area bounds, notch legality per seed class · *commit:* `feat(procgen): footprint generator [2.2.1]`
- [ ] **2.2.2** Stair placement first (stacked both floors, landing clearance), then constrained BSP partition with per-room area quotas (floor 0: living≥24, kitchen≥15, hall; floor 1: bedroom≥18, office≥15, bath≥8). · *test:* quota satisfaction property; stair exclusion honored · *commit:* `feat(procgen): bsp room partition [2.2.2]`
- [ ] **2.2.3** Adjacency + door solver: hall-centric connectivity, privacy rules (bath door not facing kitchen), door placement on shared wall midpoints ±jitter. · *test:* connectivity property; privacy rule cases · *commit:* `feat(procgen): adjacency + doors [2.2.3]`
- [ ] **2.2.4** Window rhythm on exterior walls (spacing rule, none in stair core, bath gets small-high variant). · *test:* spacing/exclusion properties · *commit:* `feat(procgen): window placement [2.2.4]`
- [ ] **2.2.5** Golden seeds: curate 5 seeds (JSON snapshot of full layout) as regression anchors. · *test:* snapshot match · *commit:* `test(procgen): golden layout seeds [2.2.5]`

#### Task 2.3 — Architectural mesh kit (client)
*Smoke gate: curated seed renders both floors; cutaway behaves on orbit; golden #house-shell.*

- [ ] **2.3.1** Wall builder: merged BufferGeometry from wall runs with door/window openings via segment splitting (no CSG); skirting + top trim; per-room inner face material regions. · *test:* geometry counts per fixture layout; opening placement math · *commit:* `feat(house): wall mesh builder [2.3.1]`
- [ ] **2.3.2** Floor/ceiling slabs with per-room texture regions (wood/tile/rug-ready); stair mesh with railing. · *test:* UV region mapping unit test · *commit:* `feat(house): slabs + stairs [2.3.2]`
- [ ] **2.3.3** Cutaway system: camera-azimuth-facing exterior walls drop to sill height (animated), floor-1 roof/ceiling hidden when viewing floor 0 focus; hysteresis to avoid flicker. · *test:* azimuth→wall-set selection table; smoke orbit assert via hook · *commit:* `feat(house): wall cutaway [2.3.3]`
- [ ] **2.3.4** Doors/windows meshes with frames; door open/close animation hooks (sim will trigger). · *test:* pivot placement math · *commit:* `feat(house): doors + windows [2.3.4]`

#### Task 2.4 — Furniture kit & SmartObjects
*Smoke gate: dev page `/dev/furniture` shows every family across 6 seeds, all within budget.*

- [ ] **2.4.1** SmartObject schema in `sim`: footprint cells, use-slots (kind: sit/lie/use/appliance, cell, facing, animId, needEffects/rate, duration dist), tags, reservation API. Registry + zod. · *test:* schema fixtures; reservation acquire/release/steal-guard · *commit:* `feat(sim): smart object model [2.4.1]`
- [ ] **2.4.2** Mesh factories A — office+bedroom: desk (L/straight), office chair, dual monitors, bookshelf, whiteboard; bed (single/double), nightstand, dresser, lamp. Parametric (seeded proportions/leg styles) + palette roles. · *test:* factory determinism (same seed ⇒ same vertex hash); tri budget per item · *commit:* `feat(house): furniture kit A [2.4.2]`
- [ ] **2.4.3** Mesh factories B — kitchen+living+bath: counter run w/ sink, stove, fridge, small table+chairs; couch, coffee table, TV+stand, plant, floor lamp; toilet, bath sink, tub, mirror. · *test:* same as A · *commit:* `feat(house): furniture kit B [2.4.3]`
- [ ] **2.4.4** SmartObject bindings for every furniture family (slots, anims, need effects — e.g. bed: lie, energy +rate; couch: sit, fun+; desk: use, focus context). · *test:* every family has ≥1 slot; slot cells inside footprint · *commit:* `feat(sim): furniture smart bindings [2.4.4]`

#### Task 2.5 — Placement solver
*Smoke gate: 50-seed sweep — zero validator errors, all use-slots reachable.*

- [ ] **2.5.1** Rule engine: anchor types (wall-back, corner, center, face-window, beside-X), clearance constraints vs future nav grid, orientation rules. · *test:* rule predicates on fixture rooms · *commit:* `feat(procgen): placement rule engine [2.5.1]`
- [ ] **2.5.2** Room recipes: required sets (office: desk+chair+monitors+shelf+whiteboard; bedroom: bed+nightstand; kitchen: counter+stove+fridge+table; living: couch+table+TV; bath: toilet+sink+tub) + optional pools; scored placement w/ retry via forked sub-seed; deterministic. · *test:* recipes satisfied across 200 seeds (property) · *commit:* `feat(procgen): room recipes [2.5.2]`
- [ ] **2.5.3** Decor scatter: poisson-disk plants/rugs/clutter, density per room type, keep-out zones (doors, slots, walk lanes). · *test:* min-distance property; keep-out respected · *commit:* `feat(procgen): decor scatter [2.5.3]`
- [ ] **2.5.4** Reachability validator: A*-check every use-slot from stair landing on its floor (uses nav bake from 4.3.1 — implement the bake's read-only precursor here as `walkabilityGrid(house, placements)`). · *test:* property over 200 seeds; evil fixtures (blocked door) fail loudly · *commit:* `test(procgen): reachability validation [2.5.4]`

#### Task 2.6 — Assembly, instancing, budget
*Smoke gate: `?seed=` reroll rebuilds house <150 ms p95 (dev machine); draw calls within §8.*

- [ ] **2.6.1** `HouseBuilder` orchestrator: seed → layout → placements → meshes → scene graph; disposes/rebuilds cleanly on reroll. · *test:* dispose leak check (renderer.info counts stable across 10 rebuilds) · *commit:* `feat(house): builder orchestration [2.6.1]`
- [ ] **2.6.2** Instancing pass: InstancedMesh for repeated decor (plants, books, chairs), static merge for per-room shells; draw-call budget assert in debug rail. · *test:* instance counts per fixture; budget assert triggers on seeded violation · *commit:* `feat(house): instancing + merge pass [2.6.2]`
- [ ] **2.6.3** 50-seed CI sweep script (headless layout+placement validators) + 3 curated-house goldens. · *test:* the sweep itself · *commit:* `test(house): seed sweep + goldens [2.6.3]`

**Phase 2 exit ritual:** `pnpm test:all` → merge → tag `phase-2`.

---

### 🧍 PHASE 3 — Modular Character System
> **Branch:** `phase/3-character` · **Goal:** shared-skeleton chibi with the exact part slots from the brief (head, upper body, arms, hands, lower body, legs, feet — plus hair & face layer), seeded DNA generator, full procedural animation library, controller. · **Exit:** `/dev/character` gallery — 20 random DNAs × all clips play cleanly; goldens; tag `phase-3`.

#### Task 3.1 — Skeleton & sockets
*Smoke gate: skeleton helper view shows sane bind pose across proportion extremes.*

- [ ] **3.1.1** Bone tree builder (17 bones: root/hips/spine/chest/neck/head, L/R shoulder-upperArm-forearm-hand, L/R upperLeg-shin-foot) with chibi proportion params (headScale 1.6–2.0, height 0.9–1.1). · *test:* hierarchy + rest transforms; proportions clamp · *commit:* `feat(char): skeleton builder [3.1.1]`
- [ ] **3.1.2** Socket system: handL/handR (props), headTop (hair/hats), facePlane (expression decal), seatAnchor (hips). Transforms follow bones. · *test:* socket world transforms track bone poses · *commit:* `feat(char): sockets [3.1.2]`

#### Task 3.2 — Part meshes (procedural, rigid-skinned)
*Smoke gate: every part variant swaps live on the dev page without seams/detachment.*

- [ ] **3.2.1** `PartSlot` spec exactly per brief: `head, upperBody, arms, hands, lowerBody, legs, feet` (+ `hair`, `faceDecal` layers); part registry interface (geometry builder + bone binding + palette roles). · *test:* registry completeness — every slot ≥1 part · *commit:* `feat(char): part slot registry [3.2.1]`
- [ ] **3.2.2** Geometry set A: heads ×3 (round/oval/bean, lathe-based), hair ×4 (cap/side-part/bun/spiky, extrude+lathe). · *test:* vertex-hash determinism; tri budgets · *commit:* `feat(char): heads + hair [3.2.2]`
- [ ] **3.2.3** Geometry set B: upperBody ×3 (tee/hoodie/shirt), arms ×2 (slim/puffy sleeve), hands ×1 (mitten). · *test:* same gates · *commit:* `feat(char): torsos + arms + hands [3.2.3]`
- [ ] **3.2.4** Geometry set C: lowerBody ×3 (pants/shorts/skirt), legs ×2, feet ×3 (sneaker/boot/sock). · *test:* same gates · *commit:* `feat(char): lower parts [3.2.4]`
- [ ] **3.2.5** Rigid skin binding: per-part weight assignment to designated bones, seam ring alignment contract (shared ring vertex positions at neck/shoulder/wrist/hip/ankle within ε). · *test:* seam ε assertions across all part combos (property over combos) · *commit:* `feat(char): skinning + seam contract [3.2.5]`

#### Task 3.3 — DNA & generator
*Smoke gate: randomize button generates 20 distinct, palette-coherent characters.*

- [ ] **3.3.1** `CharacterDNA` zod schema (seed, slot picks, palette role assignment, proportions) + (de)serialize + URL-safe encode. · *test:* round-trip; invalid DNA rejected · *commit:* `feat(char): DNA schema [3.3.1]`
- [ ] **3.3.2** Seeded generator + mutations (`randomizeSlot`, `shufflePalette`, `newFromSeed`); skin/hair palette sets from 1.4.1 roles. · *test:* determinism; mutation changes exactly the targeted gene · *commit:* `feat(char): DNA generator [3.3.2]`

#### Task 3.4 — Animation library (procedural clips)
*Smoke gate: dev page dropdown plays every clip; no foot-slide at walk on flat path (visual + velocity/phase unit check).*

- [ ] **3.4.1** Clip DSL: keyed poses → quaternion `KeyframeTrack`s with easing tags, loop modes, event markers (footstep L/R, key-tap). · *test:* track targets resolve to real bones; marker times within clip · *commit:* `feat(char): clip authoring DSL [3.4.1]`
- [ ] **3.4.2** Locomotion set: idle-breathe (+weight shift), walk (arm/leg counter-phase, cadence param), turn-in-place L/R. · *test:* phase symmetry; cadence↔duration math · *commit:* `feat(char): locomotion clips [3.4.2]`
- [ ] **3.4.3** Activity set A (desk life): sit-down/sit-idle/stand-up, type loop + `type_angry` variant, read (page-flip marker), phone-scroll (thumb), whiteboard-draw. · *test:* clip inventory vs mapping spec ids (0.2.3) — no dangling anim ids · *commit:* `feat(char): activity clips A [3.4.3]`
- [ ] **3.4.4** Activity set B (life life): sleep (breathing), eat, drink-coffee, wave, celebrate-jump, facepalm, head-on-desk, pace, dance ×2, stretch. · *test:* inventory check; durations sane (property: 0.5 s–8 s) · *commit:* `feat(char): activity clips B [3.4.4]`
- [ ] **3.4.5** Face/mood layer: eye decal states (open/blink/happy/angry/sleepy/×_×), brow tilt; blink scheduler (Poisson 2–6 s); mood sets from mapping spec. · *test:* scheduler distribution bounds; mood→decal table total · *commit:* `feat(char): face mood layer [3.4.5]`

#### Task 3.5 — Animation controller
*Smoke gate: scripted sequence walk→sit→type→celebrate crossfades without pops (visual) and emits expected markers (hook).*

- [ ] **3.5.1** Mixer wrapper: `play(clip, {fade, rate, loop})`, layered mood channel, event marker dispatch (footsteps → later SFX). · *test:* fade bookkeeping; marker dispatch order under rate scaling · *commit:* `feat(char): anim controller [3.5.1]`
- [ ] **3.5.2** Locomotion↔activity blending rules + seat/slot alignment snap (slot transform lerp on enter/exit). · *test:* snap math; blend-rule state table · *commit:* `feat(char): blend + slot alignment [3.5.2]`

#### Task 3.6 — Props
*Smoke gate: each prop attaches/detaches per-clip on the dev page.*

- [ ] **3.6.1** Prop kit: laptop, book, phone, mug, marker, tablet — socket attach, per-clip visibility table (from mapping spec). · *test:* visibility table covers all performance anim ids · *commit:* `feat(char): prop kit [3.6.1]`

**Phase 3 exit ritual:** `pnpm test:all` → merge → tag `phase-3`.
---

### 🧠 PHASE 4 — Simulation & Autonomy
> **Branch:** `phase/4-sim` · **Goal:** the character *lives*: fixed-tick ECS, real-clock day/night, multi-floor pathfinding, needs + utility AI, XState Director & activities, smart-object interactions. All headless-testable. · **Exit:** scripted 24 h scaled day passes the autonomy acceptance suite; tag `phase-4`.

#### Task 4.1 — ECS world & determinism
*Smoke gate: browser runs sim 60 s with stable tick cadence and zero GC-driven hitches >30 ms.*

- [ ] **4.1.1** miniplex world + components (`Transform`, `AgentBody`, `NeedSet`, `CurrentActivity`, `Reservation`, `PropCarry`, `SmartObjectRef`) + entity factories. · *test:* archetype queries return expected sets · *commit:* `feat(sim): ecs world + components [4.1.1]`
- [ ] **4.1.2** System scheduler: fixed order (intents → director → activities → nav → locomotion → needs → clock → events-out), tick context `{dt, clock, rng, log}`; **determinism hash** (FNV over serialized world) test across 10 000 ticks. · *test:* same seed+script ⇒ identical hash; reordered systems ⇒ test fails · *commit:* `feat(sim): scheduler + determinism hash [4.1.2]`

#### Task 4.2 — Clock & day/night
*Smoke gate: scrubbing time via hook drives sun, practicals, exposure, and HUD theme tokens coherently.*

- [ ] **4.2.1** `GameClock`: `real` mode (synced to viewer local time), `scaled` (e.g. 24 min = 24 h), `frozen` (tests/goldens); daypart segmentation (dawn 05–08, day 08–17, dusk 17–21, night 21–05). · *test:* mode math incl. DST-safe real sync; segmentation boundaries · *commit:* `feat(sim): game clock [4.2.1]`
- [ ] **4.2.2** Environment orchestrator (client binding): clock → sun rig (1.2.1), practical lights per room schedule, window emissives, exposure ramp. · *test:* orchestration table snapshots at boundary times · *commit:* `feat(render): daynight orchestration [4.2.2]`
- [ ] **4.2.3** Theme token emitter: daypart → CSS custom-property token set (HUD consumes in Phase 6). · *test:* token set per daypart snapshot · *commit:* `feat(sim): daypart theme tokens [4.2.3]`

#### Task 4.3 — Navigation (multi-floor)
*Smoke gate: click-to-walk debug mode reaches any clicked reachable cell on either floor.*

- [ ] **4.3.1** NavGrid bake: walkable cells from house model + placements (blockers, door cells, stair portal cells), per-cell cost (rug=1, tight lane=2). · *test:* bake fixtures — counts, blockers, portals · *commit:* `feat(sim): nav grid bake [4.3.1]`
- [ ] **4.3.2** A* with binary heap + stair portal edges (floor-to-floor), octile heuristic, corner-cut prohibition; exhaustive tests incl. no-path result. · *test:* path optimality on fixtures; portal traversal; no-path is explicit value · *commit:* `feat(sim): a-star multi-floor [4.3.2]`
- [ ] **4.3.3** Path post-processing: string-pull inside room rects + Catmull-Rom smoothing + arrival curve. · *test:* smoothed path stays on walkable cells (property) · *commit:* `feat(sim): path smoothing [4.3.3]`
- [ ] **4.3.4** Locomotion system: follow path at speed profile (stroll/walk/hurry), facing interpolation, stair Z-lerp, arrival events; render interpolation contract. · *test:* arrival within ε; event emitted once; interpolation continuity · *commit:* `feat(sim): locomotion [4.3.4]`

#### Task 4.4 — Needs & utility AI
*Smoke gate: 3 scaled days headless — needs stay in [0,1], no starvation/insomnia spirals (acceptance thresholds).*

- [ ] **4.4.1** `NeedSet` (energy, hunger, hygiene, fun, social) decay curves with daypart modifiers (energy decays faster at night if awake). · *test:* curve integration vs closed-form; clamping · *commit:* `feat(sim): needs [4.4.1]`
- [ ] **4.4.2** Utility scorer: candidates from available SmartObject slots → `score = needGain × distanceFalloff × daypartWeight × noveltyBonus`; softmax selection via forked rng; hysteresis to prevent ping-ponging. · *test:* table-driven scoring cases; hysteresis property (no A→B→A within 60 ticks) · *commit:* `feat(sim): utility scorer [4.4.2]`

#### Task 4.5 — Behavior: Director & activities (XState v5)
*Smoke gate: hook-driven mode transitions (autonomy→directed→reacting→autonomy) land in correct states with correct cleanup (no orphaned reservations).*

- [ ] **4.5.1** Director machine: `autonomy | directed(status) | reacting(event)` with priority preemption (§5.5), idle-timeout return, session lifecycle; fake-timer tests. · *test:* full transition matrix incl. timeout + preemption ordering · *commit:* `feat(sim): director machine [4.5.1]`
- [ ] **4.5.2** Activity actor protocol: `goto → reserve → align → perform(anim, effects) → release → exit`, cancellation at every stage (walk-cancel, reservation rollback). · *test:* cancellation at each stage leaves world invariant-clean (property) · *commit:* `feat(sim): activity actor protocol [4.5.2]`
- [ ] **4.5.3** Autonomy activity actors: Sleep, Eat (fridge→counter→table chain), DrinkCoffee, Bathroom, Shower, Read, WatchTV, PhoneScroll, PhoneCall (chatter bubbles), TidyDesk, WindowGaze. · *test:* each actor's happy-path + cancel-path against fixture house · *commit:* `feat(sim): autonomy activities [4.5.3]`
- [ ] **4.5.4** Reservation system hardening: slot claims with TTL, contention rules (single character now, but API-driven interjections compete), leak detector in debug. · *test:* claim/expire/rollback matrix · *commit:* `feat(sim): reservations [4.5.4]`
- [ ] **4.5.5** Daily routine generator: seeded schedule template (wake ~07:00 ± 30 min, meals, work block placeholder, wind-down, sleep ~23:00) feeding utility weights by hour. · *test:* generated schedules respect constraints across 100 seeds · *commit:* `feat(sim): daily routine [4.5.5]`

#### Task 4.6 — Sim↔render binding & acceptance
*Smoke gate: browser autonomy demo — character visibly executes ≥5 distinct activities over a scaled hour without hook errors.*

- [ ] **4.6.1** Binding layer: ECS → Object3D transform sync (interpolated), activity state → anim controller calls, door open/close triggers, practical-light triggers from room occupancy. · *test:* binding table completeness (every activity → anim id exists) · *commit:* `feat(client): sim-render binding [4.6.1]`
- [ ] **4.6.2** Headless scenario runner: script `{at: "22:30", expect: {activity:"Sleep", within:"20m"}}` assertions over scaled days — **the autonomy acceptance suite** (sleep at night, ≥2 meals, hygiene visits, no stuck states >5 min). · *test:* the suite itself across 5 seeds · *commit:* `test(sim): autonomy acceptance suite [4.6.2]`

**Phase 4 exit ritual:** `pnpm test:all` → merge → tag `phase-4`.

---

### 🔌 PHASE 5 — Controller Integration (the whole point)
> **Branch:** `phase/5-bridge` · **Goal:** external AI messages become live Performances end-to-end: WS client, intent translation, all 16 status shows, thought/task streams, todo.md parsing, simulator CLI + integration proof. · **Exit:** `full-dev-day.yaml` scenario drives the diorama through every status with hook-verified transitions; tag `phase-5`.

#### Task 5.1 — Client WS bridge
*Smoke gate: kill/restart server mid-session — client reconnects, replay ring re-syncs, no duplicate performances.*

- [ ] **5.1.1** WS client: connect/auth, `viewer.hello` snapshot intake, heartbeat, exponential backoff + jitter reconnect. · *test:* fake-timer reconnect schedule; hello handling · *commit:* `feat(bridge): ws client [5.1.1]`
- [ ] **5.1.2** Intake pipeline: envelope parse (shared zod), `ts` ordering with 2 s reorder buffer, `id` dedupe (LRU 512), per-type coalescing (thought bursts → latest 5; status dedupe per §5.5.3). · *test:* out-of-order/duplicate/burst fixture streams ⇒ normalized intent list · *commit:* `feat(bridge): intake normalization [5.1.2]`
- [ ] **5.1.3** `viewer.state` uplink: primary viewer pushes periodic sim snapshot to Bridge (feeds `GET /api/v1/state`). · *test:* snapshot schema round-trip · *commit:* `feat(bridge): state uplink [5.1.3]`

#### Task 5.2 — Intent translation
*Smoke gate: POST each of the 16 statuses → hook shows Director `directed` with correct performance id within 2 s each.*

- [ ] **5.2.1** Status→Intent translator driven by mapping spec (0.2.3); unknown status → `thinking` fallback + console warn (forward-compat). · *test:* all statuses + unknown case · *commit:* `feat(bridge): status intents [5.2.1]`
- [ ] **5.2.2** Director `directed` integration: enter/replace/stick semantics, `idle` releases to autonomy, critical-need interjection beat (§5.5.4). · *test:* XState fake-timer matrix incl. interjection resume · *commit:* `feat(sim): directed mode wiring [5.2.2]`
- [ ] **5.2.3** Intensity modulation: anim rate (±30 %), mood layer strength, FX opacity, coffee-refill frequency (debugging). · *test:* modulation math table · *commit:* `feat(sim): intensity modulation [5.2.3]`

#### Task 5.3 — Status Performances (all 16, per §5.4)
*Smoke gate: scripted status walk-through renders all performances; goldens for coding/debugging/success; no orphaned props or reservations after rapid status flipping (fuzz).*

- [ ] **5.3.1** Desk performances: `coding`, `debugging` (red glow + angry type + coffee), `reading_docs`, `reviewing`, `committing` beat, `testing` (lean-back + progress bar). · *test:* per-performance actor tests (anim ids, prop table, fx triggers) · *commit:* `feat(sim): desk performances [5.3.1]`
- [ ] **5.3.2** Away performances: `thinking` (pace lane), `planning` (whiteboard + stickies), `researching` (couch book / phone, seeded 50/50), `waiting` (kitchen coffee), `blocked` (stairs sit + "?"), `idle` release. · *test:* location resolution against fixture house; 50/50 seeding determinism · *commit:* `feat(sim): away performances [5.3.2]`
- [ ] **5.3.3** Terminal performances + FX: `success` (confetti instanced burst + jump), `error` (facepalm + red vignette pulse + lamp flicker), `celebrating` (living-room dance + light sweep + TV fireworks). · *test:* FX lifecycle (spawn/expire); performance exit returns cleanly · *commit:* `feat(sim): terminal performances [5.3.3]`
- [ ] **5.3.4** Session performances: `start` (wave at camera, stretch, walk to desk), `end` (save-pose, stretch, lights-off walk to couch/bed by daypart). · *test:* daypart-dependent end target table · *commit:* `feat(sim): session performances [5.3.4]`
- [ ] **5.3.5** Event one-shot reactions (all 11 from §5.4) with ≤4 s envelope + return-to-previous. · *test:* interrupt/return semantics under nested events (queue, no overlap) · *commit:* `feat(sim): event reactions [5.3.5]`

#### Task 5.4 — Thought & task streams
*Smoke gate: simulator burst of 20 thoughts → ticker shows sane sequence, bubble appears ≤1/8 s, history drawer holds 50.*

- [ ] **5.4.1** ThoughtStore: queue with TTL expiry, kind icons, bubble-worthiness heuristic (decisions & questions bubble; reasoning tickers), first-clause condenser for bubbles (≤80 chars). · *test:* TTL, heuristic table, condenser cases (unicode/emoji safe) · *commit:* `feat(bridge): thought store [5.4.1]`
- [ ] **5.4.2** TaskModel + **todo.md parser**: markdown → phases/tasks/checkbox counts → progress fractions; tolerant of arbitrary user formats (headings + `- [ ]` lists); fixture corpus includes THIS file. · *test:* fixture corpus incl. malformed files (graceful partial parse) · *commit:* `feat(bridge): todo.md parser [5.4.2]`
- [ ] **5.4.3** Recent-actions feed derivation (status transitions + events → humanized lines with relative time). · *test:* derivation snapshots · *commit:* `feat(bridge): actions feed [5.4.3]`

#### Task 5.5 — Simulator CLI & integration proof
*Smoke gate: `pnpm sim --scenario ship-it.yaml --speed 4` visibly drives a connected browser.*

- [ ] **5.5.1** `tools/simulator`: YAML scenario (timeline of typed messages + waits) → REST/WS playback with speed factor + loop mode. · *test:* scenario parse + scheduling math · *commit:* `feat(tools): simulator cli [5.5.1]`
- [ ] **5.5.2** Scenario library: `full-dev-day.yaml` (session→plan→code→debug→test→fail→fix→pass→commit→celebrate→end), `debug-spiral.yaml`, `ship-it.yaml`, `chatty-agent.yaml` (rate-limit torture). · *test:* schema-valid scenarios; coverage: all 16 statuses + 11 events appear across library · *commit:* `feat(tools): scenario library [5.5.2]`
- [ ] **5.5.3** **Playwright integration proof**: boot server+client+simulator; assert via hook each scripted status lands within 2 s, final state clean; runs in CI headless. · *test:* the proof itself (this is the product's heartbeat test) · *commit:* `test(e2e): full pipeline proof [5.5.3]`

**Phase 5 exit ritual:** `pnpm test:all` → merge → tag `phase-5`.

---

### 🖥️ PHASE 6 — HUD, Menus & Diegetics
> **Branch:** `phase/6-hud` · **Goal:** the polished face: HUD (status, thought ticker, task card, actions feed, clock), speech bubbles, main menu & settings, onboarding, diegetic screens — all theme-shifted by day/night. · **Exit:** UX pass on all HUD states incl. disconnected/empty; goldens day vs night HUD; tag `phase-6`.

#### Task 6.1 — HUD shell & theming
*Smoke gate: dawn/dusk crossfade animates CSS tokens without layout shift (CLS≈0).*

- [ ] **6.1.1** zustand stores (`connection`, `agentMeta`, `status`, `thoughts`, `task`, `simClock`) fed by bridge/sim; DOM overlay root with corner regions + safe-areas; reduced-motion respect. · *test:* store update propagation (vanilla subscribe) · *commit:* `feat(hud): shell + stores [6.1.1]`
- [ ] **6.1.2** Day/night theming: daypart tokens (4.2.3) → CSS custom props, 2 s crossfade; toy-plastic label aesthetic (rounded chips, soft shadows, slight sticker skew). · *test:* token→CSS var mapping; snapshot both themes · *commit:* `feat(hud): daypart themes [6.1.2]`

#### Task 6.2 — Status & thought surfaces
*Smoke gate: simulator run shows chip/ticker/bubbles behaving per spec at 1× and 4× speed.*

- [ ] **6.2.1** Status chip (icon + label + intensity pulse) + connection LED (`live / reconnecting / offline→autonomy` with tooltip). · *test:* state→render table · *commit:* `feat(hud): status chip + led [6.2.1]`
- [ ] **6.2.2** Thought ticker: typewriter queue (kind icons, 2/s max), hover pause, history drawer (50, virtualized). · *test:* queue discipline under burst fixtures · *commit:* `feat(hud): thought ticker [6.2.2]`
- [ ] **6.2.3** 3D-anchored bubbles via CSS2DRenderer: comic tail, auto-condensed text (5.4.1), collision-avoid screen edges, ≤1 bubble + 1 reaction emote at once. · *test:* anchor projection math; concurrency rule · *commit:* `feat(hud): speech bubbles [6.2.3]`

#### Task 6.3 — Workflow panel
*Smoke gate: pushing THIS todo.md through the API renders a correct phase stepper.*

- [ ] **6.3.1** Task card: title, phase label, progress bar, elapsed; failed-state styling. · *test:* render states table · *commit:* `feat(hud): task card [6.3.1]`
- [ ] **6.3.2** Phase stepper from todo-sync (5.4.2): phases with fraction-complete, current highlighted; collapses gracefully when no todo synced. · *test:* parser→stepper mapping fixtures · *commit:* `feat(hud): phase stepper [6.3.2]`
- [ ] **6.3.3** Recent-actions feed (icons, relative time, fade-out at 5, drawer for 50). · *test:* feed discipline · *commit:* `feat(hud): actions feed [6.3.3]`

#### Task 6.4 — Menu, settings, onboarding
*Smoke gate: cold start with no server reachable lands in a friendly autonomous-mode with visible quickstart.*

- [ ] **6.4.1** Main menu: pause/observe, new character (DNA reroll/mutations UI), new house (seed), copy share URL (seed+dna encoded). · *test:* URL encode/decode round-trip · *commit:* `feat(hud): main menu [6.4.1]`
- [ ] **6.4.2** Settings: quality tier, audio (Phase 7-ready toggle), time mode (real/scaled), API panel (endpoint URLs, token hint, connection test button hitting `/health`). · *test:* settings persistence (localStorage) round-trip · *commit:* `feat(hud): settings [6.4.2]`
- [ ] **6.4.3** Onboarding empty state: "Your agent hasn't said anything yet" + copy-paste curl quickstart (from §5.7) + link to schema docs. · *test:* clipboard copy correctness · *commit:* `feat(hud): onboarding [6.4.3]`

#### Task 6.5 — Diegetic screens
*Smoke gate: goldens — monitor content day/night; wall clock matches sim clock at frozen times.*

- [ ] **6.5.1** Monitor CanvasTexture: pseudo-code scroll derived from live thought/task text (tokenized, syntax-ish colors), status-tinted glow (red debugging / green success), doc-page mode for `reading_docs`. · *test:* tokenizer determinism; mode table per status · *commit:* `feat(client): diegetic monitor [6.5.1]`
- [ ] **6.5.2** Phone + TV + wall clock: phone chat mock (thought snippets), TV daypart programming (fireworks on `celebrating`), analog wall clock driven by GameClock. · *test:* clock-hand math; TV program table · *commit:* `feat(client): phone tv clock [6.5.2]`

**Phase 6 exit ritual:** `pnpm test:all` → merge → tag `phase-6`.

---

### 🚀 PHASE 7 — Polish, Performance & Release
> **Branch:** `phase/7-release` · **Goal:** hit budgets everywhere, add audio, harden the suites, write docs, ship v1.0.0 with a zero-backend demo mode. · **Exit:** all budgets green, docs complete, `v1.0.0` tagged on `main`.

#### Task 7.1 — Performance
*Smoke gate: reference profile (mid-tier laptop, integrated GPU) holds 60 fps overview / 55 fps room-focus with post on.*

- [ ] **7.1.1** Budget audit script: draw calls, tris, textures, programs dumped per curated seed; CI asserts §8 budgets; fix offenders (merge/instance/atlas). · *test:* the audit gate itself · *commit:* `perf(client): budget audit + fixes [7.1.1]`
- [ ] **7.1.2** Adaptive quality: rolling-FPS governor steps post tier / DPR scale / shadow size; hysteresis; user override honored. · *test:* governor state machine (fake FPS feeds) · *commit:* `perf(client): adaptive quality [7.1.2]`
- [ ] **7.1.3** Idle efficiency: hidden tab → 1 Hz sim + no render; visible-idle (no input 60 s) → 30 fps cap; instant wake. · *test:* visibility/idle state transitions · *commit:* `perf(client): idle throttling [7.1.3]`

#### Task 7.2 — Audio
*Smoke gate: mute by default until gesture; day/night ambience crossfades; typing SFX syncs to key-tap markers.*

- [ ] **7.2.1** howler wrapper: buses (ambience/sfx/ui), gesture unlock, settings binding, master mute default ON. · *test:* bus routing + unlock gating logic · *commit:* `feat(audio): engine + buses [7.2.1]`
- [ ] **7.2.2** SFX + ambience set (generated/CC0): typing clacks (velocity from anim markers), footsteps by floor material, coffee, confetti pop, chime; birds (day) / crickets (night) loops. · *test:* marker→SFX dispatch table · *commit:* `feat(audio): sfx + ambience [7.2.2]`

#### Task 7.3 — Test hardening
*Smoke gate: 3 consecutive full CI runs green with zero flaky retries.*

- [ ] **7.3.1** Golden matrix: 3 curated seeds × 4 dayparts × 2 floors + 3 performance goldens; diff artifacts uploaded on fail. · *test:* the matrix · *commit:* `test(e2e): golden matrix [7.3.1]`
- [ ] **7.3.2** Full e2e narrative: boot → autonomy 2 scaled hours → `full-dev-day.yaml` → session end → autonomy; hook assertions throughout; flake policy (1 retry max, tracked). · *test:* the narrative suite · *commit:* `test(e2e): narrative suite [7.3.2]`
- [ ] **7.3.3** Coverage raise: `sim`/`procgen`/`shared` to 85 % lines + branch floor 75 %; kill dead code found. · *test:* thresholds enforce in CI · *commit:* `test(repo): coverage raise [7.3.3]`

#### Task 7.4 — Docs & DX
*Smoke gate: a stranger follows README quickstart to a living diorama + first curl in <10 min (timed dry run).*

- [ ] **7.4.1** README: hero GIFs (autonomy + debugging performance), quickstart (pnpm i / dev / simulator), architecture sketch, seed & DNA sharing. · *test:* markdown lint; link check · *commit:* `docs(repo): readme [7.4.1]`
- [ ] **7.4.2** API reference: generated from JSON schemas (0.2.4) + §5 tables → `docs/api.md`; integration snippets (curl, TS 10-liner, VS Code tasks hook, git post-commit hook example). · *test:* docgen snapshot; snippets lint · *commit:* `docs(api): reference + recipes [7.4.2]`
- [ ] **7.4.3** CONTRIBUTING.md: the Workflow Contract (§2) verbatim + PR checklist; `.env.example`; troubleshooting (ports, tokens, WebGL fallback msg). · *test:* env example parses; doc lint · *commit:* `docs(repo): contributing + env [7.4.3]`

#### Task 7.5 — Ship
*Smoke gate: `docker compose up` from clean checkout serves client+server; `?demo=1` runs with no backend at all.*

- [ ] **7.5.1** Dockerfiles (server: node24-slim multi-stage; client: static via nginx) + compose with healthchecks + token env wiring. · *test:* compose config validate; container health in CI · *commit:* `chore(release): docker [7.5.1]`
- [ ] **7.5.2** Demo mode: `?demo=1` loads an in-browser scenario player (no server) looping `full-dev-day` — the shareable public link. · *test:* demo boot path unit + smoke · *commit:* `feat(client): demo mode [7.5.2]`
- [ ] **7.5.3** v1.0.0: version bumps, CHANGELOG from Progress Log, final `test:all`, merge, `git tag v1.0.0`, release notes. · *test:* the final gate · *commit:* `chore(release): v1.0.0 [7.5.3]`

**Phase 7 exit ritual:** `pnpm test:all` → merge → tag `phase-7` + `v1.0.0`. 🎉

---

## 7. Testing Strategy

### 7.1 Pyramid & gates

| Layer | Tool | Runs at | Scope |
|---|---|---|---|
| Unit (bulk) | Vitest | **every subtask commit** | sim, procgen, shared, parsers, math, stores — headless, deterministic |
| Property | fast-check in Vitest | subtask commits (procgen/nav/reservations) | invariants across seed space |
| Smoke | Playwright + `__devling` hook | **every task push** | boots real app; asserts states, not pixels |
| Golden frames | pixelmatch | **phase gates** (+ render-touching tasks) | the look itself, frozen seed/clock/camera |
| Integration/e2e | Playwright + simulator CLI | **phase gates** | server+client+fake-AI full pipeline |

### 7.2 Determinism rules (enable everything above)

1. All randomness flows from **one** seed through forked `alea` streams (`rng.fork("layout")`, `rng.fork("dna")`…). `Math.random` is lint-banned in `sim`/`procgen`/`client/src` (allowed only in dev tooling).
2. `Date.now()`/`new Date()` banned in `sim` — the injected `GameClock` is the only time source. Real-sync happens at the boundary.
3. Sim advances only via fixed ticks; message intake is applied at tick boundaries (replayable logs).
4. Goldens run `frozen` clock + fixed camera presets + `scaled` deterministic world.

### 7.3 What we deliberately do NOT unit test

Shader output, GPU driver behavior, exact pixel values outside goldens, three.js internals. The line: **logic below the render boundary is unit-tested; the render boundary is golden-tested; the pipe is e2e-tested.**

---

## 8. Performance Budgets (enforced by 7.1.1, watched from Phase 2)

| Metric | Budget |
|---|---|
| Draw calls (overview, both floors visible) | ≤ 300 |
| Triangles total | ≤ 150 k |
| Texture memory | ≤ 64 MB |
| ShaderPrograms | ≤ 40 |
| Frame rate (reference: mid-tier laptop, iGPU, 1080p) | 60 fps overview / 55 fps focus, post ON |
| House rebuild on reroll | ≤ 150 ms p95 |
| Sim tick | ≤ 2 ms p95 |
| Initial load (gzipped JS, no CDN cache) | ≤ 900 kB |

---

## 9. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Procedural character parts look janky at seams | Art quality | Seam ring contract (3.2.5) tested for every combo; chibi proportions hide joints; rigid weighting on purpose |
| Chatty agents flood the show (status spam) | Twitchy, unreadable pet | Dedupe/coalesce rules (§5.5–5.6) + rate limit + hysteresis in Director |
| Procgen produces valid-but-ugly houses | Art quality | Golden seeds curation + recipe scoring + palette validators; ugliness is reviewed at phase gates, rules updated |
| Golden-frame flakiness across CI GPUs | CI trust | Software renderer (SwiftShader) pinned in CI, DPR 1, frozen clock, τ tolerance; goldens regenerated only via explicit `--update` |
| XState complexity creep | Velocity | Director stays small; activities are one shallow actor each; no nested statecharts beyond 2 levels (review rule) |
| Real-clock sync vs testability | Flaky tests | Three clock modes from day one (4.2.1); tests never use `real` |
| WebGL context loss (laptops sleeping) | Broken long-running pet | `webglcontextlost/restored` handlers + full scene rebuild path (2.6.1 dispose discipline makes this cheap) |
| Scope creep (it's adorable, everyone wants features) | Ship risk | This file is law; new ideas go to a `## Icebox` appendix, not into phases |

---

## 10. Decisions Considered & Rejected (so we don't re-litigate)

| Considered | Rejected because | Revisit when |
|---|---|---|
| **React Three Fiber + drei** | HUD is deliberately DOM-only; sim owns state (not React); explicit render loop + fewer layers for a long-running toy. R3F remains a fine alternative universe. | If HUD grows app-like complexity |
| **WebGPU / TSL (three r185 has it)** | Reach & stability on random office laptops beats shader elegance for v1. | v2, behind a flag |
| **Navmesh (three-pathfinding)** | House is grid-shaped; grid A* is 200 testable lines with exact determinism. | Never, probably |
| **Wave Function Collapse for layout** | Overkill for a 5-room fixed program; constrained BSP is provable with fast-check. | Bigger buildings/procedural offices |
| **GLB assets from a DCC (Blender)** | Zero-asset-pipeline keeps the repo pure code, diffable, and CI-friendly; procedural parts are the product's charm. | If art ceiling demands it (keep loader seam in 3.2.1) |
| **socket.io** | Native `ws` via @fastify/websocket suffices; fewer layers, standard protocol. | Cross-network rooms/presence features |
| **ecsy / bitecs** | ecsy unmaintained; bitecs SoA ergonomics unneeded at 150 entities — miniplex DX wins. | Entity count ×100 |
| **Redux/RTK for HUD** | zustand vanilla stores are 1/10th the ceremony at this scale. | Never at this scale |

---

## 11. Progress Log

> One line per subtask, newest on top: `YYYY-MM-DD · P.T.S · commit subject · <short-hash>`
> `(this commit)` = the line ships inside the very commit it describes — the hash is that commit's, by definition.
> Phase summaries in bold on phase close.

```
2026-07-18 · 0.1 · TASK CLOSE — fresh-install smoke gate green (install → build → 18 unit → 1 smoke); tree mirrored to github.com/HammerOfSteel/devling @ phase/0-foundation · (this commit)
2026-07-18 · 0.1 · mirror remote provisioned: public repo HammerOfSteel/devling (integration cannot create repos — user created it; API-commit mirror, local repo remains the granular history of record)
2026-07-18 · 0.1.5 · fix(e2e): explicit node types (TS6 dropped @types auto-include) · (this commit) — caught by the task 0.1 fresh-install gate, not by incremental runs; future packages using process/fs must set types:["node"]
2026-07-18 · 0.1.5 · ci(repo): pipelines for push and phase branches · (this commit) — YAML structure-validated locally; live green-run proof completes at first push (no remote yet)
2026-07-18 · 0.1.4 · chore(repo): playwright harness · (this commit) — @devling/e2e pkg, chromium headless shell 149, @smoke tag green at 1280×800@1
2026-07-18 · 0.1.3 · chore(repo): vitest + coverage gates · (this commit) — 18 tests green, 100% coverage on lib packages, lint-boundary regression guard added
2026-07-18 · 0.1.2 · chore(repo): lint, format, boundary guards · (this commit) — TS re-pinned 7.0.2→6.0.3 (typescript-eslint compat)
2026-07-18 · 0.1.1 · chore(repo): pnpm workspace scaffold · (this commit)
2026-07-18 · phase-0 · OPEN — branch phase/0-foundation cut from main (genesis 5810ba2)
```

## Icebox (ideas that knocked; not in v1)

- Multi-agent households (one character per connected agent, shared house)
- Weather system + seasonal exterior
- Pet-for-the-pet (a cat that sits on the warm monitor)
- Mobile/portrait companion layout
- OBS overlay mode (transparent background) for streaming your agent
