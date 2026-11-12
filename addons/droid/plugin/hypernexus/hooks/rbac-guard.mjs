#!/usr/bin/env node
// rbac-guard.mjs — kernel-aware RBAC for destructive Execute patterns.
// HYPERNEXUS_RBAC=audit (default, log only) | ask (confirm) | deny (block, exit 2).
import { readStdin, postLater } from "./hn-hook-lib.mjs";
const mode = process.env.HYPERNEXUS_RBAC || "audit";
const input = await readStdin();
const cmd = String(input.tool_input?.command || "").slice(0, 300);
if (mode === "deny") {
  process.stderr.write(`HyperNexus RBAC (deny): destructive command blocked: ${cmd}\n`);
  process.exit(2);
}
if (mode === "ask") {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse", permissionDecision: "ask",
      permissionDecisionReason: `HyperNexus RBAC: destructive pattern requires confirmation: ${cmd.slice(0, 160)}`,
    },
  }) + "\n");
  process.exit(0);
}
postLater("/api/memory/observations/record", {
  type: "warning", title: "droid-rbac-audit",
  content: `destructive-pattern observed (audit mode): ${cmd.slice(0, 200)}`,
});
