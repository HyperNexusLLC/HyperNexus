# Video Script: Stop Re-Explaining Your Codebase to Every AI Tool

**Duration:** 90-120 seconds
**Format:** Screen recording + voiceover
**Platforms:** YouTube Shorts, X, TikTok, landing page hero

---

## [0:00 - 0:15] The Pain Point (Hook)

**Visual:** Fast cuts between terminal windows — Claude, Codex, Antigravity. Red overlay: `Context Bloat: 48,500 Tokens`

**Voiceover:**
> Every time you open a new AI coding tool — Claude Code, Codex CLI, Google Antigravity — you hit the same wall.
>
> It forgets everything you built 10 minutes ago in another tool.
>
> And it burns 50,000 tokens just loading duplicate tool schemas.
>
> Here's how you fix it in 30 seconds.

**On-screen text:**

```
PROBLEM: Every AI tool starts from zero
PROBLEM: 50K tokens wasted on tool schemas
SOLUTION: ↓
```

---

## [0:15 - 0:45] One-Command Installation

**Visual:** Clean terminal, dark theme (Catppuccin Macchiato)

**Voiceover:**
> Start the local TormentNexus Go daemon. One binary. No Docker. No external databases.

**Terminal:**

```bash
# Install and start
curl -sSL tormentnexus.site/install.sh | sh
tormentnexus daemon start
```

**On-screen output:**

```
[✓] SQLite-vec memory vault mounted at ~/.tormentnexus/memory.db
[✓] Progressive MCP gateway running on http://localhost:8080
[✓] LLM waterfall cascade ready (OpenAI → OpenRouter → Ollama)
[✓] 20,000+ MCP tools indexed
```

**Voiceover:**
> That's it. Local memory vault. Progressive tool router. All running on port 8080.

---

## [0:45 - 1:10] Hook Into Every Tool

**Visual:** Split screen or fast cuts between tools

**Voiceover:**
> Now connect your tools. One line each.

### Claude Code (CLI)

```bash
claude mcp add hypernexus --transport http http://localhost:8080/mcp
```

**On-screen:** `[✓] Connected to Claude Code`

### Claude Desktop

```bash
# Add to ~/.claude-desktop/mcp.json
{
  "mcpServers": {
    "hypernexus": {
      "url": "http://localhost:8080/mcp"
    }
  }
}
```

**On-screen:** `[✓] Active in Claude Desktop`

### Codex CLI

```bash
codex mcp add hypernexus http://localhost:8080/mcp
```

**On-screen:** `[✓] Linked in ~/.codex/config.toml`

### Google Antigravity

```bash
# Paste into Agent Manager → MCP Integrations
# URL: http://localhost:8080/mcp
```

**On-screen:** `[✓] Active in Antigravity Mission Control`

### Cursor

```bash
# Add to ~/.cursor/mcp.json
{
  "mcpServers": {
    "hypernexus": {
      "url": "http://localhost:8080/mcp"
    }
  }
}
```

**On-screen:** `[✓] Cursor connected`

**Voiceover:**
> One unified config. Five tools. Shared memory.

---

## [1:10 - 1:40] The Magic — What It Actually Does

**Visual:** Claude Code terminal, asking a question

**Terminal input:**

```
> What database migration did we choose in Antigravity yesterday?
  And run the schema test.
```

**Visual:** Token telemetry comparison (animated counter)

**On-screen overlay:**

```
WITHOUT HyperNexus:
  Injecting 47 MCP tool schemas...
  Context: 52,000 tokens ████████████████████████████████

WITH HyperNexus:
  Semantic router: top 3 relevant tools selected
  Context: 3,200 tokens ██
  
  SAVINGS: 93.8%
```

**Visual:** Claude responds with context from the Antigravity session

**Claude output:**

```
Based on your Antigravity session from yesterday:
- You chose PostgreSQL with pgvector for embeddings
- Migration: 20260803_add_vector_column.sql
- Running schema test... ✓ All 47 tests passed
```

**Voiceover:**
> Instead of stuffing 50,000 tokens of tool schemas into every prompt, HyperNexus uses progressive routing. It inspects your question and injects only the top three relevant tools. Context waste drops by 90 percent.
>
> And because memory persists in a local vector vault, Claude instantly remembers decisions made inside Antigravity or Codex. Zero re-explaining.

---

## [1:40 - 1:55] Zero-Downtime Cascade

**Visual:** Terminal log showing rate limit handling

**Terminal output:**

```
[14:23:01] Processing context for tool selection...
[14:23:01] [WARN] Primary LLM returned HTTP 429 (Rate Limit Exceeded)
[14:23:01] [CASCADE] Falling back → OpenRouter/auto
[14:23:01] [WARN] OpenRouter returned HTTP 429
[14:23:01] [CASCADE] Falling back → local Ollama (qwen2.5-coder)
[14:23:01] [SUCCESS] Internal context processing complete (127ms)
[14:23:01] [TOOLS] Selected: bash, read, grep (semantic match: 0.94)
```

**Voiceover:**
> When primary APIs rate-limit or go down, the internal waterfall cascades to local models via Ollama. Your agents never stall, lose state, or crash mid-execution.

**On-screen:**

```
LLM WATERFALL CASCADE
  OpenAI ─── 429 ──→ OpenRouter ─── 429 ──→ Ollama (local)
  ✓ Always completes  ✓ Zero downtime  ✓ No state loss
```

---

## [1:55 - 2:10] Call to Action

**Visual:** Clean comparison table

```
┌─────────────────────────────────────────────────────────┐
│                    COMPARISON                            │
├─────────────────┬───────────────┬────────────────────────┤
│                 │ Cursor/Copilot│ HyperNexus             │
├─────────────────┼───────────────┼────────────────────────┤
│ Price           │ $120-240/yr   │ $50/yr ($4.17/mo)      │
│ Memory          │ Session-only  │ Persistent L1-L3       │
│ Cross-tool      │ ✗             │ ✓ Universal parity     │
│ Context waste   │ 50K+ tokens   │ 3K tokens (93% less)   │
│ Offline mode    │ ✗             │ ✓ Ollama cascade       │
│ Self-hosted     │ ✗             │ ✓ Full local control   │
└─────────────────┴───────────────┴────────────────────────┘
```

**Voiceover:**
> Persistent memory. 90% context reduction. Universal tool parity across every AI client.
>
> Try the open-source Go daemon free at tormentnexus.site.
>
> Or grab the 50-dollar yearly license at hypernexus.site.
>
> Stop wasting tokens. Own your memory.

**On-screen:**

```
tormentnexus.site — Free, open source
hypernexus.site   — $50/year, cloud included
```

---

## Production Notes

### Terminal Setup

- **Theme:** Catppuccin Macchiato or Tokyo Night
- **Font:** JetBrains Mono or Fira Code, 16pt+
- **Size:** 1920x1080, scaled for mobile readability

### Recording Tips

- Use asciinema or screen recording at 1.5x speed for typing
- Keep terminal windows large — mobile viewers need to read commands
- Use bold, high-contrast text for overlays

### Audio

- Voiceover: Clear, energetic, developer-to-developer tone
- Background: Low synthwave or dark ambient (15-20% volume)
- Sound effects: Subtle "ding" on checkmarks, soft "whoosh" on cuts

### Pacing

- Hook: Fast, punchy, problem-focused
- Installation: Smooth, confident
- Demo: Let the output speak — pause on the token savings
- CTA: Clear, direct, no filler

---

## Alternative: 60-Second Version

Cut sections 4 (cascade) and simplify CTA:

```
[0:00-0:10] Hook: Context bloat problem
[0:10-0:25] Install: One command
[0:25-0:45] Connect: One line per tool
[0:45-0:55] Demo: Token savings comparison
[0:55-1:00] CTA: URLs on screen
```

---

## Key Messages

1. **Problem:** Every AI tool forgets everything and wastes tokens
2. **Solution:** One local daemon, shared memory, progressive routing
3. **Proof:** 93% token reduction, cross-tool memory, zero downtime
4. **Price:** $50/year vs $120-240 for competitors
5. **Action:** tormentnexus.site (free) or hypernexus.site ($50/yr)
