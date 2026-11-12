#!/usr/bin/env node
// probe-mcp-names.mjs — list MCP tool names containing bash/read/memory.
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXE = path.join(ROOT, "bin", process.platform === "win32" ? "hypernexus.exe" : "hypernexus");
const child = spawn(EXE, ["mcp"], { stdio: ["pipe", "pipe", "ignore"] });
let buf = "", id = 0;
const pending = new Map();
child.stdout.on("data", (d) => {
  buf += d.toString();
  let idx;
  while ((idx = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.id !== undefined && pending.has(msg.id)) pending.get(msg.id)(msg);
    } catch { /* noise */ }
  }
});
const req = (method, params = {}) => new Promise((resolve) => {
  const myId = ++id;
  pending.set(myId, resolve);
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: myId, method, params }) + "\n");
  setTimeout(() => { if (pending.has(myId)) { pending.delete(myId); resolve({ timeout: true }); } }, 60000);
});
await req("initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "p", version: "0" } });
child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
const list = await req("tools/list", {});
const names = (list.result?.tools ?? []).map((t) => t.name);
console.log("total:", names.length);
console.log("shell-ish:", names.filter((n) => /bash|shell|powershell|exec|terminal|cmd/i.test(n)).join(", "));
console.log("memory-ish:", names.filter((n) => /memory/i.test(n)).join(", "));
child.kill();
