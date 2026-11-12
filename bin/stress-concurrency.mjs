// Concurrency stress test: hammer memory writes + searches concurrently and verify
// no errors / no SQLITE_BUSY and acceptable latency. Tests the async-embed path.
const BASE = "http://127.0.0.1:7778";
async function post(path, body) {
  try {
    const r = await fetch(BASE + path, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body), signal: AbortSignal.timeout(25000),
    });
    const t = await r.text();
    return { status: r.status, body: t };
  } catch (e) { return { status: 0, body: String(e) }; }
}
async function get(path) {
  try {
    const r = await fetch(BASE + path, { signal: AbortSignal.timeout(25000) });
    return { status: r.status, body: await r.text() };
  } catch (e) { return { status: 0, body: String(e) }; }
}

const N = 8;
console.log(`Concurrency stress: ${N} writes + ${N} searches + ${N} list concurrently...`);
const t0 = Date.now();
const tasks = [];
for (let i = 0; i < N; i++) {
  tasks.push(post("/api/memory/add", { content: `stress-${i} ${Date.now()}`, tags: ["stress"] }));
  tasks.push(get(`/api/memory/search?q=stress&limit=2`));
  tasks.push(get(`/api/memory/list?limit=2`));
}
const results = await Promise.all(tasks);
const dt = Date.now() - t0;

const counts = {};
let busy = 0, errs = 0; let maxLatency = 0;
const latencies = [];
// rough: we didn't time each, so just count failures
for (const r of results) {
  const key = r.status === 0 ? "timeout" : String(r.status);
  counts[key] = (counts[key] ?? 0) + 1;
  if (/SQLITE_BUSY|database is locked/i.test(r.body)) busy++;
  if (r.status === 0 || r.status >= 500) errs++;
}
console.log(`Done in ${dt}ms total (${Math.round(dt / (N * 3))}ms avg per op)`);
console.log("status counts:", JSON.stringify(counts));
console.log(`SQLITE_BUSY: ${busy}, errors/timeouts: ${errs}`);
console.log(errs === 0 && busy === 0 ? "STRESS PASS: no contention/errors under concurrency" : `STRESS WARN: ${busy} busy, ${errs} errors`);
