#!/usr/bin/env node
// prompt-submit.mjs — fast FTS context injection + @memory:key expansion (hot path, never blocks).
import { readStdin, kfetch, outputContext } from "./hn-hook-lib.mjs";
const input = await readStdin();
const prompt = String(input.prompt || "").slice(0, 2000);
if (!prompt) process.exit(0);
const keys = [...new Set([...prompt.matchAll(/@memory:([A-Za-z0-9_.-]+)/g)].map((m) => m[1]))].slice(0, 5);
let ctx = "";
if (keys.length) {
  for (const k of keys) {
    const r = await kfetch(`/api/memory/fts-search?q=${encodeURIComponent(k.slice(0, 40))}&limit=2`);
    if (r.ok && r.data) ctx += `@memory:${k} => ${JSON.stringify(r.data).slice(0, 450)}\n`;
  }
} else {
  const q = prompt.replace(/\s+/g, " ").replace(/[^A-Za-z0-9 _-]/g, " ").trim().slice(0, 80);
  if (q) {
    const r = await kfetch(`/api/memory/fts-search?q=${encodeURIComponent(q)}&limit=3`);
    if (r.ok && r.data) ctx = JSON.stringify(r.data).slice(0, 1200);
  }
}
if (!ctx || ctx === "null") process.exit(0);
outputContext("UserPromptSubmit", `HyperNexus recall (fast FTS): ${ctx}`);
