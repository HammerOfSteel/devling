import { describe, expect, it } from "vitest";
import {
  ANIM_IDS,
  EVENT_REACTIONS,
  FX_IDS,
  HUD_ACCENTS,
  LOCATION_TAGS,
  MOODS,
  PERFORMANCES,
  PROP_IDS,
  REACTION_MAX_MS,
} from "./mapping.js";
import { AgentStatus, EventType } from "./protocol.js";

describe("PERFORMANCES coverage (todo.md §5.4)", () => {
  it("has exactly one entry per AgentStatus, no strays", () => {
    expect(Object.keys(PERFORMANCES).sort()).toEqual([...AgentStatus.options].sort());
  });

  it("only `idle` releases to autonomy", () => {
    const releasing = AgentStatus.options.filter((s) => PERFORMANCES[s].releasesToAutonomy);
    expect(releasing).toEqual(["idle"]);
  });

  it("references only registered vocabulary ids", () => {
    for (const status of AgentStatus.options) {
      const p = PERFORMANCES[status];
      expect(p.where.length, `${status} needs ≥1 location`).toBeGreaterThan(0);
      for (const w of p.where) expect(LOCATION_TAGS).toContain(w);
      for (const prop of p.props) expect(PROP_IDS).toContain(prop);
      expect(ANIM_IDS).toContain(p.anim);
      if (p.animEscalated) expect(ANIM_IDS).toContain(p.animEscalated);
      expect(MOODS).toContain(p.mood);
      if (p.moodEscalated) expect(MOODS).toContain(p.moodEscalated);
      for (const fx of p.fx) expect(FX_IDS).toContain(fx);
      expect(HUD_ACCENTS).toContain(p.hud);
    }
  });

  it("keeps registries duplicate-free", () => {
    for (const reg of [LOCATION_TAGS, PROP_IDS, ANIM_IDS, MOODS, FX_IDS, HUD_ACCENTS]) {
      expect(new Set(reg).size).toBe(reg.length);
    }
  });

  it("encodes the signature §5.4 rows faithfully", () => {
    expect(PERFORMANCES.debugging.fx).toContain("monitor_red");
    expect(PERFORMANCES.debugging.anim).toBe("type_angry");
    expect(PERFORMANCES.debugging.props).toContain("mug");
    expect(PERFORMANCES.researching.where).toEqual(["living_couch", "office_bookshelf"]);
    expect(PERFORMANCES.success.fx).toContain("confetti_burst");
    expect(PERFORMANCES.celebrating.hud).toBe("rainbow");
  });
});

describe("EVENT_REACTIONS coverage", () => {
  it("covers every EventType, no strays", () => {
    expect(Object.keys(EVENT_REACTIONS).sort()).toEqual([...EventType.options].sort());
  });

  it("respects the ≤4s interrupt envelope unless escalating", () => {
    for (const type of EventType.options) {
      const r = EVENT_REACTIONS[type];
      expect(ANIM_IDS).toContain(r.anim);
      expect(r.maxMs).toBeLessThanOrEqual(REACTION_MAX_MS);
      if (r.escalateTo) {
        expect(AgentStatus.options).toContain(r.escalateTo);
        expect(r.escalateMs ?? 0).toBeGreaterThan(0);
      }
    }
  });

  it("pr_merged escalates to a 10s celebrating performance (§5.4)", () => {
    expect(EVENT_REACTIONS.pr_merged.escalateTo).toBe("celebrating");
    expect(EVENT_REACTIONS.pr_merged.escalateMs).toBe(10_000);
  });
});
