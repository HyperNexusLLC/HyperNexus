# HyperNexus Screen Recording Walkthrough

**Date:** 2026-07-29
**Purpose:** Complete feature walkthrough for screen recording
**Duration:** ~15-20 minutes

---

## Pre-Recording Checklist

- [ ] Browser open to <https://hypernexus.site>
- [ ] Terminal open with SSH access
- [ ] Microphone ready
- [ ] Screen recording software ready

---

## Scene 1: Introduction (1 min)

**Say:**
> "Welcome to HyperNexus — the Universal AI Control Plane. Today I'll walk you through every feature of the software, showing you how it works in real AI clients."

**Show:**

- Open <https://hypernexus.site>
- Show the landing page

---

## Scene 2: Dashboard Overview (2 min)

**Navigate to:** <https://hypernexus.site/dashboard>

**Say:**
> "This is the HyperNexus dashboard. It's a Next.js application running on port 7779, connected to our Go kernel on port 7778."

**Show:**

- Dashboard loads with "HyperNexus" title
- Overview page with system status
- Point out the sidebar navigation

---

## Scene 3: Core Infrastructure Tests (2 min)

**Open terminal and run:**

```bash
# Test 1: Go Kernel Health
curl -sk https://hypernexus.site/api/go/health
# Expected: {"ok":true,"service":"hypernexus-go",...}

# Test 2: API Proxy
curl -sk https://hypernexus.site/api/go/api/mcp/status
# Expected: {"connected":true,"serverCount":1,...}

# Test 3: tRPC Endpoint
curl -sk https://hypernexus.site/trpc/mcp.getStatus
# Expected: {"result":{"data":{"connected":true,...}}}
```

**Say:**
> "All core infrastructure is working. The Go kernel is healthy, the API proxy is routing correctly through nginx, and tRPC is connected."

---

## Scene 4: MCP & Tools (2 min)

**Run:**

```bash
# MCP Server List
curl -sk https://hypernexus.site/api/go/api/mcp/servers
# Expected: 1 server (ollama)

# MCP Status
curl -sk https://hypernexus.site/api/go/api/mcp/status
# Expected: connected, serverCount:1
```

**Say:**
> "The MCP system is running with 1 server connected — ollama for local LLM inference. The tool discovery system is working."

---

## Scene 5: Memory System (2 min)

**Run:**

```bash
# Store memory via API
curl -sk -X POST https://hypernexus.site/api/go/api/memory/facts/add \
  -H 'Content-Type: application/json' \
  -d '{"title":"Screen Recording Test","content":"Testing memory storage during walkthrough","tags":["test","demo"],"namespace":"project"}'

# Search memory
curl -sk "http://localhost:7778/api/memory/search?query=Screen+Recording"

# Local memory script
python scripts/memory_local.py list
```

**Say:**
> "The memory system supports dual storage — both on the server and locally. You can store facts, search by keyword, and list all memories. This enables persistent context across AI sessions."

---

## Scene 6: Billing & Stripe (2 min)

**Run:**

```bash
# Create checkout session
curl -sk -X POST https://hypernexus.site/api/go/api/billing/stripe/checkout \
  -H 'Content-Type: application/json' \
  -d '{"plan":"pro"}'
# Expected: sessionId, sessionUrl (checkout.stripe.com), priceID
```

**Say:**
> "Stripe integration is fully functional. We can create checkout sessions, verify price IDs, and handle webhooks. The checkout flow is ready for customers."

**Show:**

- Open the Stripe checkout URL in a new tab
- Show the payment form (don't complete payment)

---

## Scene 7: Sessions & Agents (2 min)

**Run:**

```bash
# List imported sessions
curl -sk https://hypernexus.site/api/go/api/sessions/imported/list?limit=5
# Expected: 9 imported sessions from gemini, cursor, aider

# Scan for new sessions
curl -sk -X POST https://hypernexus.site/api/go/api/sessions/imported/scan
# Expected: 13 discovered, 9 imported
```

**Say:**
> "HyperNexus automatically imports sessions from AI clients like Gemini, Cursor, and Aider. We have 9 imported sessions with 24 durable memories stored."

---

## Scene 8: Marketing Agent (1 min)

**Run:**

```bash
# Check marketing agent status
ssh root@hypernexus.site "systemctl status marketing-agent --no-pager | head -10"
```

**Say:**
> "The marketing agent is running on port 8084 with 171 deals in cadence. It's autonomously managing outreach campaigns across multiple platforms."

---

## Scene 9: Dashboard Pages (2 min)

**Navigate through:**

- `/dashboard` — Home page
- `/dashboard/memory` — Memory management
- `/dashboard/sessions` — Session browser
- `/dashboard/tools` — Tool explorer
- `/dashboard/settings` — Configuration
- `/dashboard/billing` — Billing page
- `/dashboard/brain` — Brain visualization

**Say:**
> "The dashboard provides a complete interface for managing your AI control plane. You can browse memories, view sessions, explore tools, configure settings, and manage billing."

---

## Scene 10: MCP Client Integration (2 min)

**Show:**

```bash
# Show MCP config
cat ~/.pi/agent/mcp.json

# Test local MCP binary
echo '{"jsonrpc":"2.0","method":"initialize","id":1,"params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | C:/Users/hyper/workspace/HyperNexus/bin/hypernexus.exe mcp
```

**Say:**
> "HyperNexus integrates with AI clients via MCP — the Model Context Protocol. The local binary starts an MCP server that connects to the Go kernel, providing tools for memory, discovery, and execution."

---

## Scene 11: Full Test Suite (1 min)

**Run:**

```bash
bash scripts/run_all_tests.sh
```

**Say:**
> "And finally, here's our complete test suite — 42 tests across 6 phases. All tests pass. This ensures the system is production-ready."

**Show:**

- Test output with all 42 PASS results

---

## Scene 12: Conclusion (1 min)

**Say:**
> "That's HyperNexus — the Universal AI Control Plane. It provides persistent memory, MCP tool routing, session management, and a complete dashboard for managing your AI infrastructure.

> The system is production-ready with Stripe billing, marketing automation, and 42 passing tests.

> Visit hypernexus.site to learn more, or try it yourself with our installer. Thank you for watching!"

---

## Post-Recording

- [ ] Review footage
- [ ] Add captions/subtitles
- [ ] Upload to YouTube
- [ ] Share on social media
