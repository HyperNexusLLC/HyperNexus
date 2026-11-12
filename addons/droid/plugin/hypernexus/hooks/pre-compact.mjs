#!/usr/bin/env node
// pre-compact.mjs — enrich compaction with related L2 context (bounded, never blocks).
import { readStdin, kfetch, outputContext } from "./hn-hook-lib.mjs";
const input = await readStdin();
const hint = String(input.custom_instructions || "recent hypernexus droid session").slice(0, 200);
const r = await kfetch(`/api/memory/fts-search?q=${encodeURIComponent(hint.slice(0, 60))}&limit=3`);
if (!r.ok || !r.data) process.exit(0);
outputContext("PreCompact", `HyperNexus compaction context: ${JSON.stringify(r.data).slice(0, 1000)}`);
