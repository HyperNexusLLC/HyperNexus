#!/usr/bin/env node
// post-edit.mjs — record file-change observation (fire-and-forget).
import { readStdin, postLater } from "./hn-hook-lib.mjs";
const input = await readStdin();
const file = String(input.tool_input?.file_path || input.tool_input?.path || "").slice(0, 300);
postLater("/api/memory/observations/record", {
  type: "progress", title: "droid-edit", content: "file edited via droid",
  filesModified: file ? [file] : [], metadata: { source: "droid-plugin" },
});
