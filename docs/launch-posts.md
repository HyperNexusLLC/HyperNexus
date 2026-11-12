# HyperNexus Launch Posts

## Show HN Post

**Title:** Show HN: HyperNexus – Open-source AI control plane with progressive tool routing

**URL:** <https://hypernexus.site>

**Text:**
Hi HN! We built HyperNexus, an open-source Universal AI Control Plane that solves three problems every AI developer faces:

1. **Token waste** – Dumping 50+ MCP tool definitions into context burns 50K tokens before the agent thinks. Progressive tool routing uses semantic search to inject only the top 3 relevant tools per prompt. 60% token reduction.

2. **Rate limit kills** – When OpenAI returns a 429 at 2 AM, your workflow stops. The LLM Waterfall Pattern cascades through providers: Primary API → Secondary API → Local models → Queue. Zero downtime.

3. **Memory loss** – AI agents forget everything between sessions. Dual-tier memory (L1 session scratchpad + L2 permanent semantic storage) with vector search gives agents persistent memory.

**Tech stack:** Go kernel (446 HTTP handlers, goroutines), Next.js dashboard, SQLite + sqlite-vec, MCP native, A2A protocol support.

**Pricing:** $5/mo hosted, free self-host (MIT license).

GitHub: <https://github.com/MDMAtk/TormentNexus>

Happy to answer questions about the architecture, tool routing algorithm, or waterfall failover implementation.

---

## Reddit r/LocalLLaMA Post

**Title:** I built an open-source AI control plane that reduces MCP tool token usage by 60%

**Body:**
Hey r/LocalLLaMA!

I've been working on HyperNexus, a Universal AI Control Plane that solves a few pain points I kept hitting:

**The Problem:**
When you have 50+ MCP servers, dumping all tool definitions into context burns 50K+ tokens before your agent even starts thinking. Plus, rate limits kill your workflow at 2 AM, and agents forget everything between sessions.

**The Solution:**

1. **Progressive Tool Routing** – Semantic vector search matches your prompt to the top 3 most relevant tools. Only inject what you need. 60% token reduction.

2. **LLM Waterfall** – Primary API → Secondary API → Local models → Queue. When one provider rate limits, automatic failover to the next. Zero downtime.

3. **Dual-Tier Memory** – L1 session scratchpad (fast, ephemeral) + L2 permanent semantic storage (SQLite + sqlite-vec). Agents remember decisions across sessions.

**Tech Stack:**

- Go kernel (446 HTTP handlers, goroutines)
- Next.js dashboard with 5-tab interface
- SQLite + sqlite-vec for vector search
- MCP native integration
- A2A protocol support
- Biomimetic memory decay (Ebbinghaus curve)

**Pricing:** $5/mo for hosted version, free if you self-host (MIT license).

GitHub: <https://github.com/MDMAtk/TormentNexus>
Site: <https://hypernexus.site>

Would love feedback on the architecture. Happy to answer questions!

---

## Discord Server Setup

**Server Name:** HyperNexus

**Channels:**

- #general – Community chat
- #support – Technical support
- #feature-requests – Ideas and suggestions
- #showcase – Show off your integrations
- #dev – Developer discussion
- #announcements – Product updates

**Invite link:** (create at discord.com/create)
