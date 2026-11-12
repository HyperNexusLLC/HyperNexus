#!/usr/bin/env node
// session-stop.mjs — persist a turn checkpoint to L2 (fire-and-forget).
import { postLater } from "./hn-hook-lib.mjs";
postLater("/api/memory/facts/add", {
  title: "droid-turn-summary", content: "Droid turn completed (auto-checkpoint).",
  tags: ["session", "droid"], namespace: "project",
});
