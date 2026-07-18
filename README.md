# 🏠 devling

> **A Tamagotchi for your AI.** A low-poly, tilt-shift Three.js diorama of a two-story developer's house, where a tiny procedurally-generated developer acts out — live — whatever your coding agent is doing: thinking, coding, debugging, despairing, celebrating.

**Status:** 🚧 Phase 0 — Foundation & Walking Skeleton. Built by an AI agent under a strict test-gated workflow.

- 📋 **[`todo.md`](./todo.md) is the single source of truth** — the full plan, architecture, Controller API spec, and the subtask-by-subtask Progress Log (§11).
- 🔁 This repo is a **content mirror**, synced by the build agent at task and phase closes (API commits). The granular per-subtask commit history lives in the agent's working repo; todo.md §11 is the authoritative changelog.
- 🧪 CI: `ci.yml` runs lint → typecheck → unit (+ coverage gates) → build → Playwright smoke on every push. `phase.yml` runs the full phase gate (adds e2e, later golden frames) on `phase/**` and `main`.
- 📖 The real README (quickstart, GIFs, API recipes) lands at task 7.4.1.

**Stack:** three.js r185 · TypeScript · pnpm workspaces · zod v4 · Fastify v5 Bridge (REST + WS) · XState v5 · miniplex ECS · alea/simplex/poisson procgen · Vitest · Playwright · fast-check.

**License:** TBD (Phase 7).
