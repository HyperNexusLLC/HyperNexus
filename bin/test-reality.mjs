#!/usr/bin/env node
// test-reality.mjs -- LIVE execution reality check (no mock harness).
//
// The plugin battery (test-opencode-ext.mjs) validates tool SHAPES in a mock
// ctx; it never executes run() against the live kernel. This battery closes
// that honesty gap for the tools this extension adds:
//
//   1. Each tool's run() executes against the LIVE kernel with valid input,
//      and real side effects are verified (orchestrate's PERSIST must be
//      findable in memory afterwards -- with async-propagation polling).
//   2. Edge cases: empty/missing args, bad ids, unicode, oversized input,
//      quote/injection strings -- every one must return gracefully (no throw).
//   3. Registry reality audit: kernel tools that return SIMULATED data must be
//      honestly labeled in their output so no model can mistake fake results
//      for real ones.
//
// Usage: node bin/test-reality.mjs   (kernel must be running)

const KERNEL = process.env.HYPERNEXUS_URL || "http://127.0.0.1:7778";

let passed = 0;
let failed = 0;
function check(name, ok, detail = "") {
  if (ok) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}${detail ? ` — ${String(detail).slice(0, 140)}` : ""}`);
  }
}

// Fresh module import (cache-busted) so edits are picked up immediately.
const mod = await import(`file:///${(process.cwd() + "/addons/opencode/plugin/hypernexus/index.js").replace(/\\/g, "/")}?t=${Date.now()}`);
const tool = (name) => mod.TOOLS.find((t) => t.name === name);
const runSafe = async (name, args) => {
  try {
    const res = await tool(name).run(args ?? {});
    return { ok: true, res };
  } catch (err) {
    return { ok: false, err };
  }
};

console.log("== REALITY-1. workflow (live kernel)");
{
  const t = tool("workflow");
  check("workflow tool exists", !!t);
  const r = await runSafe("workflow", { action: "list" });
  check("workflow list executes without throwing", r.ok, r.err);
  check("workflow list returns workflow names", /Workflows:/.test(r.res?.content ?? "") && /\S/.test(r.res?.content ?? ""), r.res?.content);
  const bad = await runSafe("workflow", { action: "run", id: "__no_such_workflow__" });
  check("workflow run with bad id degrades gracefully", bad.ok && typeof bad.res?.content === "string" && bad.res.content.length > 0, bad.err || bad.res?.content);
  const missing = await runSafe("workflow", { action: "run" });
  check("workflow run without id returns usage", bad.ok && /required/i.test(missing.res?.content ?? ""), missing.res?.content);
}

console.log("\n== REALITY-2. orchestrate (live kernel + verified side effect)");
{
  const token = `reality-probe-${Date.now()}`;
  const r = await runSafe("orchestrate", { task: `${token} verify live orchestration` });
  check("orchestrate executes without throwing", r.ok, r.err);
  const c = r.res?.content ?? "";
  check("orchestrate reports RECALL step", /RECALL:/.test(c), c.slice(0, 120));
  check("orchestrate reports DISCOVER step", /DISCOVER:/.test(c), c.slice(0, 120));
  check("orchestrate reports PERSIST step", /PERSIST:/.test(c), c.slice(0, 120));
  check("orchestrate persisted the task", /task recorded in L2/.test(c), c.slice(0, 160));

  // Async propagation: the fact must actually be findable afterwards.
  let found = false;
  for (let i = 0; i < 20 && !found; i++) {
    await new Promise((r2) => setTimeout(r2, 500));
    const res = await fetch(`${KERNEL}/api/memory/search?query=${encodeURIComponent(token)}&limit=5`, { signal: AbortSignal.timeout(15000) }).catch(() => null);
    const body = res ? await res.json().catch(() => null) : null;
    found = JSON.stringify(body).includes(token);
  }
  check("orchestrate fact is searchable in the kernel afterwards", found);
}

console.log("\n== REALITY-3. browser (graceful while service is down)");
{
  const status = await runSafe("browser", { action: "status" });
  check("browser status executes without throwing", status.ok, status.err);
  check("browser status degrades gracefully (service is down)", typeof status.res?.content === "string" && status.res.content.length > 0, status.res?.content);
  const scrape = await runSafe("browser", { action: "scrape", url: "https://example.invalid" });
  check("browser scrape degrades gracefully", scrape.ok && typeof scrape.res?.content === "string", scrape.err || scrape.res?.content);
  const noUrl = await runSafe("browser", { action: "scrape" });
  check("browser scrape without url returns usage", noUrl.ok && /required/i.test(noUrl.res?.content ?? ""), noUrl.res?.content);
}

console.log("\n== REALITY-4. edge cases (none may throw, all must answer)");
const edgeCases = [
  ["orchestrate", {}, "empty args"],
  ["orchestrate", { task: "" }, "empty task"],
  ["orchestrate", { task: "  " }, "whitespace task"],
  ["orchestrate", { task: "emoji ✅ CJK 中文 task ünïcödé" }, "unicode task"],
  ["orchestrate", { task: 'quotes "double" \'single` ${jinja} {{tpl}} <tag> &amp; | ; rm -rf /' }, "injection-shaped task"],
  ["orchestrate", { task: "x".repeat(5000) }, "oversized task"],
  ["workflow", {}, "workflow no args"],
  ["workflow", { action: "__bogus__" }, "workflow bogus action"],
  ["workflow", { action: "run", id: "../../etc/passwd" }, "workflow path-traversal id"],
  ["workflow", { id: 12345 }, "workflow non-string id"],
  ["browser", {}, "browser no args"],
  ["browser", { action: "scrape", url: "not a url" }, "browser malformed url"],
  ["browser", { action: "scrape", url: "file:///c:/windows/win.ini" }, "browser scheme-smuggling url"],
  ["browser", { action: 42 }, "browser non-string action"],
];
for (const [name, args, label] of edgeCases) {
  const r = await runSafe(name, args);
  const hasAnswer = typeof r.res?.content === "string" && r.res.content.length > 0;
  check(`edge: ${name} ${label}`, r.ok && hasAnswer, r.err || r.res?.content);
}

console.log("\n== REALITY-5. registry stub honesty (simulated data must be labeled)");
// Kernel tools that return SIMULATED data (from go/internal/tools/* stubs) must
// lead with an honest marker so no model mistakes fake results for real ones.
// generate_devops_pipeline is NOT a stub -- it really generates YAML templates
// -- so it gets a positive content assertion instead.
const stubProbes = [
  ["confluence_search", { query: "probe" }],
  ["jira_create_issue", { summary: "probe" }],
  ["cloud_troubleshoot", { service: "probe" }],
];
for (const [name, args] of stubProbes) {
  const res = await fetch(`${KERNEL}/api/agent/tool`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, args }),
    signal: AbortSignal.timeout(20000),
  }).catch(() => null);
  const text = res ? await res.text().catch(() => "") : "";
  const simulated = /simulated|demo output|not created|not configured/i.test(text.slice(0, 200));
  check(`stub output honestly labeled: ${name}`, simulated, text.slice(0, 120));
}
{
  const res = await fetch(`${KERNEL}/api/agent/tool`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "generate_devops_pipeline", args: { platform: "github_actions", project_type: "go" } }),
    signal: AbortSignal.timeout(20000),
  }).catch(() => null);
  const text = res ? await res.text().catch(() => "") : "";
  check("generator produces real YAML (not a stub)", /runs-on: ubuntu-latest/.test(text), text.slice(0, 120));
}

console.log(`\n== T10-REALITY SUMMARY: ${passed} pass, ${failed} fail`);
process.exit(failed === 0 ? 0 : 1);
