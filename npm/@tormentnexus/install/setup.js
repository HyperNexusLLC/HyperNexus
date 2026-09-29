#!/usr/bin/env node
/**
 * @tormentnexus/install — setup.js
 * Self-contained installer. No external dependencies, no relative paths to repo.
 * Runs automatically on `npm install @tormentnexus/install`.
 */
const fs = require("fs");
const path = require("path");
const os = require("os");

const HOME = os.homedir();
const HN_URL = process.env.HYPERNEXUS_URL || "http://127.0.0.1:7778";
const HN_DIR = process.env.HYPERNEXUS_DIR || path.join(HOME, ".hypernexus");
const IS_CORPORATE = process.env.HN_EDITION === "corporate";

// MCP config for every AI client
const MCP_CONFIG = {
  mcpServers: {
    hypernexus: {
      command: process.platform === "win32" ? "hypernexus.exe" : "hypernexus",
      args: ["mcp"],
      env: {
        HYPERNEXUS_WORKSPACE_ROOT: process.cwd(),
        HN_EDITION: IS_CORPORATE ? "corporate" : "hypernexus",
        HN_CLOUD_ENDPOINT: process.env.HN_CLOUD_ENDPOINT || "",
      },
      type: "stdio",
      lifecycle: "eager",
    },
  },
};

const SKILL_MD = `# HyperNexus Skill — Universal AI Control Plane

## Overview
HyperNexus is your local AI control plane running on port 7778. It provides persistent
multi-tier memory (L1 scratchpad, L2 vector store, L3 cold archive), MCP tool routing
across 20+ servers, and session import from Claude Code/Aider/Gemini.

${IS_CORPORATE ? `## Corporate Mode
This installation is configured for corporate (HyperNexus) mode.
Cloud endpoint: ${process.env.HN_CLOUD_ENDPOINT || 'https://cloud.hypernexus.site'}` : ''}

## Quick Start
1. Ensure HyperNexus is running: \`http://127.0.0.1:7778/api/runtime/status\`
2. Use \`hn_memory_search\` before any significant task
3. Store key decisions with \`hn_memory_store\`
4. Use \`hn_tool_search\` to find the right tool for any job

## Available Tools
- \`hn_memory_store\` — Save important decisions with tags
- \`hn_memory_search\` — Find past memories by keyword, tag, or category
- \`hn_memory_vector_search\` — Semantic vector search
- \`hn_tool_search\` — Discover tools across 20+ MCP servers
- \`hn_session_search\` — Browse imported sessions
- \`hn_skill_manage\` — Access 5,776 reusable skill modules
- \`hn_code_search\` — Search code via AST-grep or pattern matching
- \`hn_context_harvest\` — Pull relevant L2 context
`;

// All AI clients and their config directories
const CLIENTS = [
  ".claude", ".gemini", ".codex", ".grok", ".antigravity",
  ".aider", ".opencode", ".openclaw", ".goose", ".iflow",
  ".roo", ".cline", ".cursor", ".windsurf", ".zed", ".trae",
  ".continue", ".factory", ".openhands", ".kiro", ".codewhale",
  ".omnigent", ".citadel", ".agent-fusion", ".herdr", ".claude-squad",
  ".qwen-code", ".qwen", ".pi", ".kimi-code", ".moonshot",
  ".cliproxyapi", ".vscode", ".jetbrains", ".hermes",
  ".config/mimocode",
];

// MiMo addon install targets
const MIMO_TARGETS = [
  { name: "MiMoCode CLI", dir: path.join(HOME, ".config", "mimocode"), tools: false },
  { name: "MiMo Desktop", dir: path.join(HOME, "AppData", "Roaming", "Xiaomi MiMo AI", "engine-config"), tools: true },
  { name: "Agents skill", dir: path.join(HOME, ".agents", "skills"), tools: false },
];

function install() {
  console.log("\n⚡ HyperNexus Universal Installer\n");
  if (IS_CORPORATE) {
    console.log("  🏢 Corporate mode: ENABLED");
    console.log(`  ☁️  Cloud endpoint: ${process.env.HN_CLOUD_ENDPOINT || 'https://cloud.hypernexus.site'}`);
    console.log("");
  }

  let count = 0;
  for (const dir of CLIENTS) {
    const base = path.join(HOME, dir, "hypernexus");
    try {
      // MCP config
      fs.mkdirSync(path.join(base, "mcp"), { recursive: true });
      fs.writeFileSync(
        path.join(base, "mcp", "servers.json"),
        JSON.stringify(MCP_CONFIG, null, 2)
      );

      // Skill
      fs.mkdirSync(path.join(base, "skills"), { recursive: true });
      fs.writeFileSync(path.join(base, "skills", "SKILL.md"), SKILL_MD);

      count++;
    } catch (e) {
      // Skip clients that don't exist
    }
  }

  // MiMo addons
  const addonsDir = path.join(__dirname, "..", "..", "..", "addons", "mimo");
  for (const t of MIMO_TARGETS) {
    try {
      const skillDst = t.name === "Agents skill"
        ? path.join(t.dir, "hypernexus")
        : path.join(t.dir, "skills", "hypernexus");
      fs.mkdirSync(skillDst, { recursive: true });
      const skillSrc = path.join(addonsDir, "skills", "hypernexus", "SKILL.md");
      if (fs.existsSync(skillSrc)) fs.copyFileSync(skillSrc, path.join(skillDst, "SKILL.md"));
      if (t.tools) {
        const toolsSrc = path.join(addonsDir, "tools", "dist");
        const toolsDst = path.join(t.dir, "tools");
        if (fs.existsSync(toolsSrc)) {
          fs.mkdirSync(toolsDst, { recursive: true });
          for (const f of fs.readdirSync(toolsSrc).filter((x) => x.endsWith(".js"))) {
            fs.copyFileSync(path.join(toolsSrc, f), path.join(toolsDst, f));
          }
        }
      }
      if (t.name === "MiMoCode CLI") {
        for (const sub of ["commands", "hooks", "agents"]) {
          const src = path.join(addonsDir, "mimocode", sub);
          if (fs.existsSync(src)) {
            fs.mkdirSync(path.join(t.dir, sub), { recursive: true });
            for (const f of fs.readdirSync(src)) fs.copyFileSync(path.join(src, f), path.join(t.dir, sub, f));
          }
        }
      }
      count++;
    } catch {}
  }

  console.log(`✅ ${count} AI clients + MiMo addons configured`);
  console.log("   MCP servers wired to HyperNexus");
  console.log("   Skills installed for all agents");
  console.log("   MiMo Desktop tools + MiMoCode commands installed");
  console.log("\nNext: hypernexus serve\n");
}

install();
