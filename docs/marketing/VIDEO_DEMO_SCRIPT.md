# Script: One Memory to Rule All Your AI Coding Tools

**Duration:** ~90–120 seconds  
**Format:** Screen capture with terminal overlay, code highlights, and fast cuts

---

## [0:00 - 0:15] SECTION 1: The Hook — Token Bloat & Amnesia

**[Visual]**

Rapid cuts between terminal windows: opening `claude`, `codex`, `antigravity`, and `claude-desktop`. Red banner overlay:

```
Context Bloat: 48,000+ Tokens Loaded Per Tool
State: 0 Cross-Tool Context
```

**[Voiceover]**

> "If you use multiple AI coding agents—Claude Code, Codex CLI, Claude Desktop, or Google Antigravity—you hit two major roadblocks every day:
> **1.** Re-explaining decisions made 10 minutes ago in a different tool.
> **2.** Burning 50,000 tokens just loading duplicate MCP tool schemas into every session.
> Here is how to unify all your tools under one persistent control plane in under 60 seconds."

---

## [0:15 - 0:45] SECTION 2: Unified Setup (Cross-Tool Integration)

**[Visual]**

Open terminal, run the local daemon start command:

```bash
# Start the local Go control plane
tormentnexus daemon start
```

*Screen highlights:* `[✓] SQLite-vec memory vault loaded` | `[✓] Progressive MCP gateway: http://localhost:8080/mcp`

**[Voiceover]**

> "First, launch the native Go control plane. It runs locally, spins up your `sqlite-vec` memory vault, and exposes a unified, progressive MCP endpoint."

---

### Fast-Paced Installation Sequence (On-Screen Terminal Split)

#### 1. Claude Code (CLI)

```bash
claude mcp add hypernexus --transport http http://localhost:8080/mcp
```

*(Checkmark: Connected to Claude Code)*

#### 2. Claude Desktop App

*Open `Settings -> Developer -> Edit Config` (`claude_desktop_config.json`):*

```json
{
  "mcpServers": {
    "hypernexus": {
      "url": "http://localhost:8080/mcp"
    }
  }
}
```

*(Checkmark: Connected to Claude Desktop)*

#### 3. Codex CLI & Codex Desktop

```bash
codex mcp add hypernexus http://localhost:8080/mcp
```

*(Checkmark: Linked to Codex CLI & Desktop runtime)*

#### 4. Google Antigravity (IDE / Agent Manager)

*In Antigravity Agent Manager -> Settings -> MCP Servers:*

Add Server: `HyperNexus` → `http://localhost:8080/mcp`

*(Checkmark: Verified in Antigravity Agent Manager)*

**[Voiceover]**

> "One URL connects every tool. Point Claude Code, Claude Desktop, Codex, and Antigravity to your local gateway. Your entire AI workspace is now instantly synced."

---

## [0:45 - 1:20] SECTION 3: What It Actually Does

**[Visual]**

Open **Google Antigravity**, ask it to design a database migration.

**Antigravity Prompt:**

```text
"Architect a user session store using PostgreSQL with RLS policies and log the decision."
```

**[Fast Cut to Terminal: Claude Code]**

Open **Claude Code** in a fresh terminal window without giving any prior context.

**Claude Code Prompt:**

```bash
claude "What database decision did we just make in Antigravity, and write the Go struct for it."
```

**[Visual Focus: Telemetry & Result]**

* **Token Usage Telemetry:**
  * *Standard Setup:* `~52,000 tokens`
  * *HyperNexus Progressive Routing:* `~3,100 tokens` *(94% Reduction)*

* **Response:** Claude Code instantly outputs the PostgreSQL struct, referencing the exact decision made inside Antigravity moments prior.

**[Voiceover]**

> "Watch what happens. Antigravity logs the architectural decision into the local vector vault. When you switch over to Claude Code, it instantly pulls that context—no copy-pasting required."
> "Even better: instead of dumping 40+ tool schemas into Claude's context window, HyperNexus's **progressive routing** injects only the top 3 relevant schemas per prompt—cutting token usage by over 90%."

---

## [1:20 - 1:40] SECTION 4: Resilient LLM Cascade

**[Visual]**

Simulate an API rate limit (429) during automated context processing.

```text
[WARN] OpenAI API HTTP 429 Rate Limit
[FALLBACK] Internal Cascade -> Local Ollama (qwen2.5-coder)
[SUCCESS] Tool schema selection completed in 95ms
```

**[Voiceover]**

> "And if primary APIs rate-limit mid-task, HyperNexus's internal waterfall automatically cascades context processing to your local Ollama instance. Your tool routing and memory stay active without stalling your agent workflows."

---

## [1:40 - 2:00] SECTION 5: Call to Action

**[Visual]**

Comparison graphic on screen:

| Feature | Cursor / Copilot | TormentNexus / HyperNexus |
|---------|------------------|---------------------------|
| **Cross-Tool Memory** | ✗ Isolated | ✓ Shared L1–L3 Vector Storage |
| **Tool Context Waste** | 50k+ Tokens | Under 5k Tokens (90%+ Savings) |
| **Price** | $120–$240/yr | **Free OS / $50/yr Cloud Sync** |

Text on screen:

```
Open-Source Engine: tormentnexus.site
Pro / Cloud License: hypernexus.site
```

**[Voiceover]**

> "Stop re-explaining your code to five different tools and burning API tokens on schema bloat.
> Download the free open-source Go daemon at **TormentNexus.site**, or grab the Cloud Sync license at **HyperNexus.site**."

---

## Production Tips

* **Soundtrack:** Low-volume, driving 144 BPM psytrance bassline under the voiceover.
* **Formatting:** Make terminal text 20pt+ font size so commands are sharp on high-DPI phone screens (TikTok/Reels/Shorts).
* **Cuts:** Keep video cuts under 3 seconds per panel transition to hold developer attention.
