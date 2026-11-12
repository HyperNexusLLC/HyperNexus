# HyperNexus Demo Video Script

**Audience:** Tech-savvy developers, college students, indie hackers
**Tone:** Casual, genuine, like showing a friend something cool
**Length:** ~10 minutes

---

## Opening (30 seconds)

**[Screen: HyperNexus landing page]**

"Hey, so I built this thing called HyperNexus and I want to show you what it does.

If you use AI tools for coding — ChatGPT, Claude, Cursor, whatever — you've probably run into this problem: every time you start a new chat, the AI forgets everything. You're re-explaining your project from scratch. Over and over.

HyperNexus fixes that. It gives all your AI tools a shared brain."

---

## The Problem (1 minute)

**[Screen: Open a new ChatGPT chat]**

"Watch this. I'm going to ask ChatGPT about my project."

**Type:** "What's my current project about?"

**[Screen: ChatGPT has no idea]**

"Nothing. It has no context. Now imagine doing this 10 times a day across 5 different AI tools. That's a lot of wasted time.

What if your AI tools could remember what you told them — and share that memory with each other?"

---

## The Solution: MCP (2 minutes)

**[Screen: Terminal]**

"HyperNexus connects to your AI tools through something called MCP — the Model Context Protocol. It's like USB for AI. One plug, works everywhere.

Here's what the config looks like:"

```bash
cat ~/.pi/agent/mcp.json
```

**[Screen: Show the JSON config]**

"That's it. One file. Same file works for Pi, Claude Desktop, Cursor, Aider, Gemini CLI — all five major AI clients.

Let me show you it's actually working:"

```bash
curl -sk https://hypernexus.site/api/go/health
```

**[Screen: Health check response]**

"Go kernel is running. Let's check MCP:"

```bash
curl -sk https://hypernexus.site/api/go/api/mcp/status
```

**[Screen: MCP status showing connected]**

"One MCP server connected. The tools are ready."

---

## Memory System (2 minutes)

**[Screen: Terminal]**

"Okay here's the cool part. Memory.

I'm going to store something:"

```bash
curl -sk -X POST https://hypernexus.site/api/go/api/memory/facts/add \
  -H 'Content-Type: application/json' \
  -d '{"title":"My Project","content":"Building a CLI tool that syncs local files to S3 buckets","tags":["project"],"namespace":"project"}'
```

**[Screen: Success response with memory ID]**

"Stored. Now watch — I can search for it:"

```bash
curl -sk "http://localhost:7778/api/memory/search?query=CLI+tool"
```

**[Screen: Search results showing the memory]**

"Found it. And here's the thing — this memory is available to ALL my AI tools. Claude knows about my project. Cursor knows. Aider knows. I don't have to re-explain anything.

There's also a local script for development:"

```bash
python scripts/memory_local.py list
```

**[Screen: List of stored memories]**

"Dual storage — local for dev, server for production. Memories persist across sessions and across tools."

---

## Dashboard Tour (2 minutes)

**[Screen: Browser — hypernexus.site/dashboard]**

"Let me show you the dashboard."

**[Screen: Dashboard loads with HyperNexus branding]**

"This is the control center. Everything in one place.

**Memory page** — browse and search your stored memories."

**[Screen: Click through memory page]**

**Sessions page** — see imported sessions from your AI clients."

**[Screen: Click through sessions page]**

"Tools page — discover available MCP tools."

**[Screen: Click through tools page]**

"Settings — configure everything."

**[Screen: Click through settings page]**

"Brain — visualize your memory system."

**[Screen: Click through brain page]**

"Everything runs on ports 7778 and 7779. The Go kernel handles the backend, Next.js handles the frontend."

---

## Billing & Stripe (1 minute)

**[Screen: Terminal]**

"Stripe is fully integrated. Watch:"

```bash
curl -sk -X POST https://hypernexus.site/api/go/api/billing/stripe/checkout \
  -H 'Content-Type: application/json' \
  -d '{"plan":"pro"}'
```

**[Screen: Response with session ID and Stripe URL]**

"Checkout session created. That URL goes to a real Stripe checkout page. Webhooks are configured. The whole payment flow works."

---

## Full Test Suite (1 minute)

**[Screen: Terminal]**

"I wrote a test suite that runs everything:"

```bash
bash scripts/run_all_tests.sh
```

**[Screen: Test output showing all 42 tests passing]**

"42 tests across 6 phases. Infrastructure, MCP, memory, billing, sessions, dashboard. All passing.

This is what production-ready looks like."

---

## What's Running (1 minute)

**[Screen: Terminal]**

"Let me show you what's actually running on the server:"

```bash
ssh root@hypernexus.site "systemctl list-units --type=service --state=running | grep hyper"
```

**[Screen: List of services]**

"Go kernel on 7778. Dashboard on 7779. Cloud service on 7780. Marketing agent on 8084. Redis on 6379.

Plus Docker containers for the demo site, test orgs, and analytics."

---

## Closing (30 seconds)

**[Screen: HyperNexus landing page]**

"That's HyperNexus. A universal AI control plane that gives all your tools shared memory, tool discovery, and a single dashboard to manage everything.

It's open source. Link in the description.

If you're tired of re-explaining your project to every AI tool, try it out.

Thanks for watching."

---

## Notes for Recording

- Keep it genuine, not salesy
- Show real terminal output, not mockups
- If something breaks, that's content — show the fix
- Aim for 10 minutes total
- Record in one take if possible, edit later
