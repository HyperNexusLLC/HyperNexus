#!/usr/bin/env node
/**
 * hn-pre-transform.mjs — HyperNexus pre_tool_transform hook for jcode.
 * =======================================================================
 * Wire in ~/.jcode/config.toml (paths printed by `node addons/jcode/install.mjs`):
 *
 *   [hooks]
 *   pre_tool_transform = ["<target>/hooks/hn-pre-transform.mjs"]
 *
 * Contract (per jcode docs/HOOKS.md): transformers receive the current tool
 * input JSON on stdin + JCODE_HOOK_TOOL_NAME in env, and may print a
 * REPLACEMENT JSON object to stdout. Empty stdout, invalid JSON, non-zero
 * exit, spawn error, or timeout leaves the input unchanged (fail-open).
 * Transformers compose in order and run BEFORE the pre_tool policy gate.
 *
 * This transformer is deliberately narrow (hot-path safe, tool-specific):
 *   1. search_memory hyphenated-token repair: a single hyphenated token query
 *      NEVER matches L2 keyword search (tokenization splits on whitespace, not
 *      hyphens). Rewrite `query: "foo-bar-baz"` → `query: "foo bar baz"` so
 *      the call succeeds instead of returning a confusing empty result. The
 *      rewrite is transparent (same intent, tokenizable form).
 *   2. Everything else: pass through byte-identical (print the input back).
 *
 * Never reads credentials, never throws, never does network I/O.
 */

import fs from "node:fs";

function readStdinBounded(maxBytes = 65536) {
  try {
    return (fs.readFileSync(0, "utf8") || "").slice(0, maxBytes);
  } catch {
    return "";
  }
}

function main() {
  const tool = process.env.JCODE_HOOK_TOOL_NAME || "";
  const raw = readStdinBounded();
  if (!raw.trim()) {
    process.exit(0); // empty: leave unchanged
  }
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0); // invalid JSON: leave unchanged
  }

  if ((tool === "search_memory" || tool === "mcp__hypernexus__search_memory") && input && typeof input === "object") {
    const q = input.query ?? input.arguments?.query;
    if (typeof q === "string" && /^[A-Za-z0-9]+(-[A-Za-z0-9]+)+$/.test(q.trim())) {
      const fixed = q.replace(/-/g, " ");
      if ("query" in input) input.query = fixed;
      else if (input.arguments && typeof input.arguments === "object") input.arguments.query = fixed;
      process.stdout.write(JSON.stringify(input));
      process.exit(0);
    }
  }

  // Pass-through: re-print unchanged input.
  process.stdout.write(JSON.stringify(input));
  process.exit(0);
}

try {
  main();
} catch {
  process.exit(0); // fail open
}
