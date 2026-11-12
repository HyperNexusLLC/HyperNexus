#!/usr/bin/env node
// session-end.mjs — write handoff artifact on session end (fire-and-forget).
import { postLater } from "./hn-hook-lib.mjs";
postLater("/api/agent-memory/handoff", {
  summary: "Droid session ended (auto-handoff).", tags: ["session", "handoff", "droid"],
});
