// Task 0.2 smoke gate: import the BUILT package and round-trip every
// message type through makeMsg → serializeMsg → parseMsg (todo.md §6).
// Exits non-zero on any mismatch. Run via root `pnpm test:smoke`.
import assert from "node:assert/strict";
import { AgentMessage, makeMsg, parseMsg, serializeMsg } from "../dist/index.js";

const samples = {
  "agent.status": { status: "debugging", detail: "smoke", intensity: 0.9 },
  "agent.thought": { text: "smoke thought", kind: "observation" },
  "agent.task": { taskId: "0.2", title: "protocol package", status: "done", progress: 1 },
  "agent.todo": { markdown: "- [x] 0.2 shared protocol" },
  "agent.event": { type: "tests_passed", detail: "73/73" },
  "agent.session": { state: "start", agentName: "SmokeBot" },
  ping: undefined,
};

let count = 0;
for (const [type, payload] of Object.entries(samples)) {
  const msg = makeMsg(type, payload);
  assert.equal(AgentMessage.safeParse(msg).success, true, `${type}: envelope invalid`);
  const back = parseMsg(serializeMsg(msg));
  assert.equal(back.ok, true, `${type}: parse failed`);
  assert.deepEqual(back.msg, msg, `${type}: round-trip mismatch`);
  count += 1;
}

// negative path stays typed
const bad = parseMsg('{"v":1,"type":"agent.mood"}');
assert.equal(bad.ok, false);
assert.equal(bad.error.code, "invalid_envelope");

console.log(`shared smoke: ${count}/7 message types round-tripped through dist ✔`);
