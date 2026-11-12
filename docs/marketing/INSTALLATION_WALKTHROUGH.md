# HyperNexus Installation & Integration Walkthrough

**Duration:** 3-5 minutes  
**Format:** Screen capture with terminal, fast cuts, checkmarks

---

## Section 1: Installation (0:00 - 0:45)

### Windows (PowerShell)

```powershell
# Show this command on screen
irm https://hypernexus.site/install.ps1 | iex
```

### macOS / Linux (Terminal)

```bash
# Show this command on screen
curl -fsSL https://hypernexus.site/install.sh | bash
```

### npm (Any platform)

```bash
# Show this command on screen
npx @hypernexus/install@latest
```

**[Visual]:** Terminal showing successful install with checkmarks:

```
✓ Downloaded HyperNexus v1.0.1
✓ Installed to /usr/local/bin/hypernexus
✓ Config directory created
✓ Claude Desktop configured
✓ Auto-updater installed
✓ Watchdog installed
✓ Services started
✓ Installation complete!
```

---

## Section 2: Start the Daemon (0:45 - 1:15)

```bash
# Start the local control plane
hypernexus serve
```

**[Visual]:** Terminal output:

```
🧠 HyperNexus v1.0.1 starting...
✓ SQLite-vec memory vault loaded
✓ Progressive MCP gateway: http://localhost:8080/mcp
✓ LLM waterfall configured (OpenAI → OpenRouter → Ollama)
✓ Dashboard: http://localhost:7779/dashboard
✓ All systems GO
```

---

## Section 3: Connect to AI Clients (1:15 - 3:00)

### 3a. Claude Code (CLI)

```bash
claude mcp add hypernexus --transport http http://localhost:8080/mcp
```

**[Visual]:** Checkmark appears: ✓ Connected to Claude Code

### 3b. Claude Desktop (App)

Open Settings → Developer → Edit Config:

```json
{
  "mcpServers": {
    "hypernexus": {
      "url": "http://localhost:8080/mcp"
    }
  }
}
```

**[Visual]:** Checkmark appears: ✓ Connected to Claude Desktop

### 3c. Cursor (IDE)

Open Settings → MCP → Add Server:

```
Name: HyperNexus
URL: http://localhost:8080/mcp
```

**[Visual]:** Checkmark appears: ✓ Connected to Cursor

### 3d. Windsurf (IDE)

Open Settings → MCP Servers → Add:

```json
{
  "mcpServers": {
    "hypernexus": {
      "url": "http://localhost:8080/mcp"
    }
  }
}
```

**[Visual]:** Checkmark appears: ✓ Connected to Windsurf

### 3e. Aider (CLI)

```bash
# In aider, add MCP server
/mcp add hypernexus http://localhost:8080/mcp
```

**[Visual]:** Checkmark appears: ✓ Connected to Aider

### 3f. GitHub Copilot (CLI)

```bash
# Configure MCP in settings
gh config set mcp.server hypernexus
gh config set mcp.url http://localhost:8080/mcp
```

**[Visual]:** Checkmark appears: ✓ Connected to GitHub Copilot

### 3g. Codex CLI

```bash
codex mcp add hypernexus http://localhost:8080/mcp
```

**[Visual]:** Checkmark appears: ✓ Connected to Codex CLI

---

## Section 4: Verify All Connections (3:00 - 3:30)

```bash
# Check all connected clients
hypernexus status
```

**[Visual]:** Terminal output:

```
Connected Clients:
  ✓ Claude Code      - http://localhost:8080/mcp
  ✓ Claude Desktop   - http://localhost:8080/mcp
  ✓ Cursor           - http://localhost:8080/mcp
  ✓ Windsurf         - http://localhost:8080/mcp
  ✓ Aider            - http://localhost:8080/mcp
  ✓ GitHub Copilot   - http://localhost:8080/mcp
  ✓ Codex CLI        - http://localhost:8080/mcp

Memory: 0 sessions (fresh install)
Tools: 20,000+ MCP servers available
```

---

## Section 5: Demo Cross-Tool Memory (3:30 - 4:30)

**[Visual]:** Open Cursor, ask a question:

```
"Create a user authentication system with JWT tokens and log the decision."
```

**[Fast Cut]:** Open Claude Code (fresh terminal):

```
"What authentication system did we just create in Cursor?"
```

**[Visual]:** Claude Code instantly responds with the exact details from Cursor.

**[On-screen text]:**

```
✓ Cross-tool memory working
✓ Zero context loss
✓ 94% token reduction (52k → 3.1k)
```

---

## Section 6: Call to Action (4:30 - 5:00)

**[Visual]:** Split screen showing all AI clients connected.

**[Voiceover]:**
> "One install. One URL. Every AI tool remembers everything.
> Download free at HyperNexus.site or TormentNexus.site.
> Link in bio."

**[On-screen text]:**

```
Open Source: tormentnexus.site
Cloud Sync: hypernexus.site
Discord: discord.gg/Hj9P3GbVxR
```

---

## Production Notes

- **Font size:** 20pt+ for terminal commands (readable on mobile)
- **Cuts:** Keep each integration under 10 seconds
- **Music:** Subtle lo-fi or ambient (low volume)
- **Checkmarks:** Animate each checkmark as it appears
- **Total:** Aim for 4-5 minutes, can be split into shorter clips for TikTok/Reels
