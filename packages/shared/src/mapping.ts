import type { AgentStatus, EventType } from "./protocol.js";

/**
 * Status → Performance mapping spec (todo.md §5.4) as DATA.
 * packages/sim turns these into Director intents; the client renders the
 * props/FX/HUD sides. Ids here are the canonical vocabulary — animation
 * clips (3.4.x), props (3.6.1) and FX implementations must cover them,
 * and tests in each of those subtasks assert against these registries.
 */

export const LOCATION_TAGS = [
  "office_desk",
  "office_pace_lane",
  "office_whiteboard",
  "office_bookshelf",
  "living_couch",
  "living_floor",
  "kitchen",
  "stairs",
  "window",
  "none",
] as const;
export type LocationTag = (typeof LOCATION_TAGS)[number];

export const PROP_IDS = ["book", "phone", "mug", "marker", "tablet", "laptop"] as const;
export type PropId = (typeof PROP_IDS)[number];

export const ANIM_IDS = [
  "idle_breathe",
  "walk",
  "sit_idle",
  "type_loop",
  "type_angry",
  "read",
  "phone_scroll",
  "pace_think",
  "whiteboard_draw",
  "lean_back_watch",
  "brew_and_sip",
  "review_nod_shake",
  "decisive_key",
  "sit_slump",
  "facepalm_desk",
  "celebrate_jump",
  "dance_a",
  "dance_b",
  "wave",
  "stretch",
  "fist_pump",
  "slump_sigh",
  "stumble_papers",
  "eye_roll",
  "salute",
  "hopeful_lean",
  "look_wave_camera",
] as const;
export type AnimId = (typeof ANIM_IDS)[number];

export const MOODS = [
  "neutral",
  "focused",
  "curious",
  "content",
  "annoyed",
  "tense",
  "relaxed",
  "judging",
  "proud",
  "glum",
  "distraught",
  "happy",
  "ecstatic",
] as const;
export type Mood = (typeof MOODS)[number];

export const FX_IDS = [
  "thought_dots",
  "sticky_notes",
  "question_motes",
  "question_bubble",
  "monitor_code",
  "monitor_doc",
  "monitor_diff",
  "monitor_red",
  "monitor_progress",
  "monitor_flash",
  "kettle_steam",
  "review_motes",
  "red_vignette_pulse",
  "lamp_flicker",
  "confetti_burst",
  "disco_sweep",
  "tv_fireworks",
  "warm_light_bump",
] as const;
export type FxId = (typeof FX_IDS)[number];

export const HUD_ACCENTS = [
  "grey",
  "violet",
  "blue",
  "teal",
  "green",
  "red",
  "amber",
  "rainbow",
] as const;
export type HudAccent = (typeof HUD_ACCENTS)[number];

export interface PerformanceSpec {
  /** Candidate locations; >1 = seeded pick per entry (e.g. researching couch/shelf 50/50). */
  where: readonly LocationTag[];
  /** Props attached for the duration (hand sockets, 3.6.1). */
  props: readonly PropId[];
  /** Primary loop + optional intensity-escalation variant. */
  anim: AnimId;
  animEscalated?: AnimId;
  mood: Mood;
  /** Escalation mood as intensity → 1 (e.g. debugging annoyed → distraught-adjacent). */
  moodEscalated?: Mood;
  fx: readonly FxId[];
  hud: HudAccent;
  /** true = this status hands control back to autonomy (only `idle`). */
  releasesToAutonomy?: boolean;
}

export const PERFORMANCES: Record<AgentStatus, PerformanceSpec> = {
  idle: {
    where: ["none"],
    props: [],
    anim: "idle_breathe",
    mood: "neutral",
    fx: [],
    hud: "grey",
    releasesToAutonomy: true,
  },
  thinking: {
    where: ["office_pace_lane"],
    props: [],
    anim: "pace_think",
    mood: "focused",
    fx: ["thought_dots"],
    hud: "violet",
  },
  planning: {
    where: ["office_whiteboard"],
    props: ["marker"],
    anim: "whiteboard_draw",
    mood: "focused",
    fx: ["sticky_notes"],
    hud: "blue",
  },
  researching: {
    where: ["living_couch", "office_bookshelf"],
    props: ["book", "phone"],
    anim: "read",
    animEscalated: "phone_scroll",
    mood: "curious",
    fx: ["question_motes"],
    hud: "teal",
  },
  reading_docs: {
    where: ["office_desk"],
    props: [],
    anim: "sit_idle",
    mood: "focused",
    fx: ["monitor_doc"],
    hud: "teal",
  },
  coding: {
    where: ["office_desk"],
    props: [],
    anim: "type_loop",
    mood: "focused",
    fx: ["monitor_code"],
    hud: "green",
  },
  refactoring: {
    where: ["office_desk"],
    props: [],
    anim: "type_loop",
    mood: "content",
    fx: ["monitor_diff"],
    hud: "green",
  },
  debugging: {
    where: ["office_desk"],
    props: ["mug"],
    anim: "type_angry",
    mood: "annoyed",
    moodEscalated: "distraught",
    fx: ["monitor_red", "lamp_flicker"],
    hud: "red",
  },
  testing: {
    where: ["office_desk"],
    props: [],
    anim: "lean_back_watch",
    mood: "tense",
    fx: ["monitor_progress"],
    hud: "amber",
  },
  waiting: {
    where: ["kitchen"],
    props: ["mug"],
    anim: "brew_and_sip",
    mood: "relaxed",
    fx: ["kettle_steam"],
    hud: "amber",
  },
  reviewing: {
    where: ["living_couch", "office_desk"],
    props: ["tablet"],
    anim: "review_nod_shake",
    mood: "judging",
    fx: ["review_motes"],
    hud: "blue",
  },
  committing: {
    where: ["office_desk"],
    props: [],
    anim: "decisive_key",
    mood: "proud",
    fx: ["monitor_flash"],
    hud: "green",
  },
  blocked: {
    where: ["stairs", "window"],
    props: [],
    anim: "sit_slump",
    mood: "glum",
    fx: ["question_bubble"],
    hud: "grey",
  },
  error: {
    where: ["office_desk"],
    props: [],
    anim: "facepalm_desk",
    mood: "distraught",
    fx: ["red_vignette_pulse", "lamp_flicker"],
    hud: "red",
  },
  success: {
    where: ["office_desk", "living_floor"],
    props: [],
    anim: "celebrate_jump",
    mood: "happy",
    fx: ["confetti_burst", "warm_light_bump"],
    hud: "green",
  },
  celebrating: {
    where: ["living_floor"],
    props: [],
    anim: "dance_a",
    animEscalated: "dance_b",
    mood: "ecstatic",
    fx: ["disco_sweep", "tv_fireworks"],
    hud: "rainbow",
  },
};

export interface EventReaction {
  anim: AnimId;
  /** Reaction envelope; must be ≤ 4000 unless it escalates to a full status Performance. */
  maxMs: number;
  /** Optional escalation: after the beat, run this status's Performance for escalateMs. */
  escalateTo?: AgentStatus;
  escalateMs?: number;
}

export const EVENT_REACTIONS: Record<EventType, EventReaction> = {
  tests_passed: { anim: "fist_pump", maxMs: 2500 },
  tests_failed: { anim: "slump_sigh", maxMs: 3000 },
  build_failed: { anim: "stumble_papers", maxMs: 3500 },
  lint_failed: { anim: "eye_roll", maxMs: 2000 },
  commit: { anim: "decisive_key", maxMs: 2000 },
  push: { anim: "salute", maxMs: 2000 },
  pr_opened: { anim: "hopeful_lean", maxMs: 3000 },
  pr_merged: { anim: "celebrate_jump", maxMs: 4000, escalateTo: "celebrating", escalateMs: 10_000 },
  deploy: { anim: "salute", maxMs: 3000 },
  milestone: { anim: "celebrate_jump", maxMs: 4000, escalateTo: "success", escalateMs: 6_000 },
  user_message: { anim: "look_wave_camera", maxMs: 3000 },
};

/** Reaction interrupt envelope cap (todo.md §5.4). */
export const REACTION_MAX_MS = 4000;
