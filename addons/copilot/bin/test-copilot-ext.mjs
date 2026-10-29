#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");
const PLUGIN = path.join(ROOT, "addons", "copilot", "plugin", "hypernexus");
const HOOK = path.join(ROOT, "addons", "copilot", "hooks", "hypernexus-hook.mjs");
let passed = 0;

function check(name, run) {
  run();
  passed += 1;
  process.stdout.write(`PASS ${name}\n`);
}

function json(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function runHook(event, input, env = {}) {
  return spawnSync(process.execPath, [HOOK, event], {
    input: JSON.stringify(input),
    encoding: "utf8",
    env: { ...process.env, ...env },
    timeout: 10000,
  });
}

const manifest = json(path.join(PLUGIN, "plugin.json"));
const mcp = json(path.join(PLUGIN, "mcp.json"));
const hookConfig = json(path.join(ROOT, ".github", "hooks", "hypernexus.json"));

check("Agent Plugins v1 manifest", () => {
  assert.equal(manifest.$schema, "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json");
  assert.equal(manifest.name, "hypernexus");
  assert.equal(manifest.version, fs.readFileSync(path.join(ROOT, "VERSION"), "utf8").trim());
});
check("stdio MCP exposes all tools", () => {
  const server = mcp.mcpServers.hypernexus;
  assert.equal(server.type, "stdio");
  assert.equal(server.command, "node");
  assert.deepEqual(server.tools, ["*"]);
  assert.ok(server.args[0].includes("${PLUGIN_ROOT}"));
});
check("workspace MCP config is registered", () => {
  const workspace = json(path.join(ROOT, ".mcp.json"));
  assert.ok(workspace.mcpServers?.hypernexus);
});
check("all three skills have required metadata", () => {
  for (const name of ["hypernexus", "hypernexus-ops", "hypernexus-workflows"]) {
    const skill = fs.readFileSync(path.join(PLUGIN, "skills", name, "SKILL.md"), "utf8");
    assert.match(skill, new RegExp(`name:\\s*${name}`));
    assert.match(skill, /description:\s*.+/);
  }
});
check("eleven Copilot commands are packaged", () => {
  const files = fs.readdirSync(path.join(PLUGIN, "com.github.copilot", "commands"));
  assert.equal(files.filter((file) => file.endsWith(".md")).length, 11);
});
check("two custom agents are packaged", () => {
  const files = fs.readdirSync(path.join(PLUGIN, "com.github.copilot", "agents"));
  assert.deepEqual(files.filter((file) => file.endsWith(".agent.md")).sort(), [
    "hypernexus-orchestrator.agent.md",
    "hypernexus-researcher.agent.md",
  ]);
});
check("Copilot-specific operating rule is packaged", () => {
  assert.ok(fs.existsSync(path.join(PLUGIN, "com.github.copilot", "rules", "hypernexus.md")));
});
check("Meta launcher uses the live Pi OAuth kernel proxy and Responses API", () => {
  const launcher = fs.readFileSync(path.join(ROOT, "addons", "copilot", "use-meta-model.ps1"), "utf8");
  assert.match(launcher, /\$KernelUrl = 'http:\/\/127\.0\.0\.1:7778'/);
  assert.match(launcher, /\$env:COPILOT_PROVIDER_BASE_URL = "\$KernelUrl\/v1"/);
  assert.match(launcher, /COPILOT_PROVIDER_API_KEY = 'hypernexus-local'/);
  assert.match(launcher, /COPILOT_PROVIDER_WIRE_API = 'responses'/);
  const docs = fs.readFileSync(path.join(ROOT, "addons", "copilot", "README.md"), "utf8");
  assert.match(docs, /Pi's `auth\.json`/);
  assert.match(docs, /pi\/1\.4\.0/);
  assert.doesNotMatch(launcher, /meta-muse-key\.mjs/);
  assert.doesNotMatch(launcher, /api\.meta\.ai/);
  assert.match(launcher, /meta\/muse-spark-1\.3-contributor/);
  assert.match(launcher, /--plugin-dir/);
  assert.match(launcher, /\[Environment\]::SetEnvironmentVariable/);
});
check("native hooks cover memory, RBAC, failures, and subagents", () => {
  for (const name of ["sessionStart", "userPromptTransformed", "preToolUse", "permissionRequest", "postToolUseFailure", "subagentStart"]) {
    assert.ok(Array.isArray(hookConfig.hooks[name]), `missing ${name}`);
    assert.equal(hookConfig.hooks[name][0].exec, "node");
  }
});
check("hook and MCP launcher syntax", () => {
  for (const file of [HOOK, path.join(PLUGIN, "mcp-launcher.mjs")]) {
    const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
  }
});
check("RBAC deny blocks destructive PowerShell", () => {
  const result = runHook("preToolUse", {
    toolName: "powershell",
    toolArgs: { command: "Remove-Item -Recurse -Force C:\\temp\\example" },
  }, { HYPERNEXUS_RBAC: "deny" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).permissionDecision, "deny");
});
check("RBAC ask requests confirmation", () => {
  const result = runHook("preToolUse", {
    toolName: "bash",
    toolArgs: { command: "rm -rf ./generated" },
  }, { HYPERNEXUS_RBAC: "ask" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).permissionDecision, "ask");
});
check("ordinary shell commands are not intercepted", () => {
  const result = runHook("preToolUse", {
    toolName: "powershell",
    toolArgs: { command: "Get-ChildItem" },
  }, { HYPERNEXUS_RBAC: "deny" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "");
});
check("permission hook deny is valid Copilot output", () => {
  const result = runHook("permissionRequest", {
    toolName: "bash",
    toolInput: { command: "rm -rf ./generated" },
  }, { HYPERNEXUS_RBAC: "deny" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).behavior, "deny");
});
check("non-marker prompts are left untouched", () => {
  const result = runHook("userPromptTransformed", { transformedPrompt: "Keep this prompt unchanged." });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "");
});

const health = await fetch("http://127.0.0.1:7778/health", { signal: AbortSignal.timeout(8000) });
assert.equal(health.ok, true, "HyperNexus kernel health endpoint is unavailable");
const status = await health.json();
assert.equal(typeof status.version, "string");
passed += 1;
process.stdout.write(`PASS live kernel health (${status.version})\n`);

process.stdout.write(`\n${passed}/${passed} checks passed\n`);
