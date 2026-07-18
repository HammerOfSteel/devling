// Task 0.3 smoke gate (todo.md §6): boot the BUILT server, POST a status
// via REST, and require a live viewer WS to receive the broadcast within
// 100 ms of the POST. Uses Node's global fetch + WebSocket — no deps.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const PORT = 7799;
const BASE = `http://127.0.0.1:${PORT}`;
const TOKEN = "devling-dev-token";
const serverEntry = fileURLToPath(new URL("../dist/server.js", import.meta.url));

const child = spawn(process.execPath, [serverEntry], {
  env: { ...process.env, DEVLING_PORT: String(PORT) },
  stdio: "ignore",
});
const stop = () => {
  if (!child.killed) child.kill("SIGTERM");
};
process.on("exit", stop);

try {
  // wait for boot
  let healthy = false;
  for (let i = 0; i < 50 && !healthy; i += 1) {
    try {
      const res = await fetch(`${BASE}/api/v1/health`);
      healthy = res.ok;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  assert.ok(healthy, "server never became healthy");

  // viewer connects, consumes hello
  const ws = new WebSocket(`ws://127.0.0.1:${PORT}/ws/v1/viewer`);
  const frames = [];
  const waiters = [];
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(String(ev.data));
    const w = waiters.shift();
    if (w) w(msg);
    else frames.push(msg);
  });
  const next = (ms = 2000) =>
    frames.shift() ??
    new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("ws timeout")), ms);
      waiters.push((m) => {
        clearTimeout(t);
        resolve(m);
      });
    });
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  const hello = await next();
  assert.equal(hello.type, "viewer.hello", "expected viewer.hello first");

  // the gate: POST → 202 → broadcast within 100 ms
  const t0 = performance.now();
  const res = await fetch(`${BASE}/api/v1/agent/status`, {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ status: "success", detail: "task 0.3 smoke" }),
  });
  assert.equal(res.status, 202, `expected 202, got ${res.status}`);
  const ack = await res.json();

  const seen = await next(1000);
  const dt = performance.now() - t0;
  assert.equal(seen.type, "agent.status", "viewer must see the status envelope");
  assert.equal(seen.id, ack.id, "broadcast id must match REST ack id");
  assert.ok(dt < 100, `broadcast took ${dt.toFixed(1)}ms (gate: <100ms)`);

  ws.close();
  console.log(`server smoke: boot → 202 → viewer broadcast in ${dt.toFixed(1)}ms ✔`);
} finally {
  stop();
}
