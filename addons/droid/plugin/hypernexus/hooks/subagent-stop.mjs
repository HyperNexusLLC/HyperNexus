#!/usr/bin/env node
// subagent-stop.mjs — persist subagent outcome to L2 (fire-and-forget).
import { readStdin, postLater } from "./hn-hook-lib.mjs";
const input = await readStdin();
const result = String(input.task_result || "").slice(0, 500);
if (!result) process.exit(0);
postLater("/api/memory/facts/add", {
  title: "droid-subagent-result", content: result,
  tags: ["subagent", "droid"], namespace: "project",
});
