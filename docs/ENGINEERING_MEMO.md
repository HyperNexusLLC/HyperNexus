# HyperNexus — Engineering Memo

## Local-First MCP Control Plane: Token Reduction Architecture

**Author:** Robert Pelloni  
**Date:** August 2026  
**Status:** Production-ready, seeking strategic acquisition

---

## Executive Summary

HyperNexus is a Go-native control plane that reduces LLM input context payload size for tool-heavy agents from ~9,000 tokens to ~660 tokens (92.7% reduction) using local `sqlite-vec` progressive routing.

**Core Problem:** Cloud LLMs spend 80-90% of their input tokens re-reading massive tool schemas and system prompts on every single API call.

**Solution:** Local vector-based tool selection that dynamically routes only relevant tool schemas into context before sending the payload to cloud models.

---

## 1. The Core Metric

| Setup | Tokens per Request | Cost per 1K Requests (Claude 3.5 Sonnet) |
|-------|-------------------|------------------------------------------|
| Standard MCP (all tools) | 8,994 | $26.98 |
| HyperNexus (progressive) | 660 | $1.98 |
| **Reduction** | **92.7%** | **$25.00 savings** |

**Annual Projection (100K requests/month):**

- Claude 3.5 Sonnet: **$30,003/year savings**
- GPT-4o: **$25,003/year savings**

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     HyperNexus Daemon                       │
│                    (Single Go Binary)                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   MCP Router  │    │ sqlite-vec   │    │  LLM Gateway │  │
│  │              │    │   Embeddings │    │              │  │
│  │  • Parse     │───▶│  • Vector    │───▶│  • OpenAI    │  │
│  │    intent    │    │    search    │    │  • Anthropic │  │
│  │  • Select    │    │  • Schema    │    │  • Ollama    │  │
│  │    tools     │    │    matching  │    │  • OpenRouter│  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Memory Layer (L2 Vector Vault)                             │
│  • sqlite-vec local embeddings                              │
│  • Semantic search across sessions                          │
│  • Zero external DB dependencies                            │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Daemon** | Go (single binary) | Core control plane |
| **Vector DB** | sqlite-vec | Local tool schema embeddings |
| **Memory** | L2 Vector Vault | Persistent semantic memory |
| **Gateway** | HTTP/IPC | LLM provider routing |
| **MCP Server** | stdio/SSE | Tool protocol handling |

### Resource Footprint

| Metric | Value |
|--------|-------|
| Binary size | ~15MB |
| Memory usage | <30MB RAM |
| Startup time | <100ms |
| Dependencies | Zero (statically linked) |
| Platforms | Windows, macOS, Linux |

---

## 3. Progressive Routing Algorithm

### How It Works

1. **User sends query** → HyperNexus parses intent
2. **Vector similarity search** → Match query against tool schema embeddings
3. **Select top-K tools** → Only relevant tools (2-7) loaded into context
4. **Send to LLM** → Reduced payload (660 tokens vs 8,994)
5. **LLM executes tool** → Full tool schema available on-demand

### Example: "Read src/main.py and fix the bug on line 42"

**Standard MCP (all 76 tools):**

```json
{
  "tools": [
    {"name": "bash", "description": "Execute shell command...", "inputSchema": {...}},
    {"name": "read", "description": "Read file contents...", "inputSchema": {...}},
    {"name": "write", "description": "Create or overwrite file...", "inputSchema": {...}},
    {"name": "edit", "description": "Edit file using text replacement...", "inputSchema": {...}},
    {"name": "grep", "description": "Search file contents...", "inputSchema": {...}},
    {"name": "find", "description": "Search for files...", "inputSchema": {...}},
    {"name": "ls", "description": "List directory...", "inputSchema": {...}},
    // ... 69 more tools (jira, slack, aws, k8s, etc.)
  ]
}
// Total: 8,994 tokens
```

**HyperNexus (progressive routing):**

```json
{
  "tools": [
    {"name": "read", "description": "Read file contents...", "inputSchema": {...}},
    {"name": "edit", "description": "Edit file using text replacement...", "inputSchema": {...}},
    {"name": "bash", "description": "Execute shell command...", "inputSchema": {...}},
    {"name": "grep", "description": "Search file contents...", "inputSchema": {...}},
    {"name": "find", "description": "Search for files...", "inputSchema": {...}},
    {"name": "ls", "description": "List directory...", "inputSchema": {...}},
    {"name": "write", "description": "Create or overwrite file...", "inputSchema": {...}}
  ]
}
// Total: 1,191 tokens (86.8% reduction)
```

---

## 4. Integration Surface

### Embedding Options

| Method | Use Case | Complexity |
|--------|----------|------------|
| **Local HTTP Proxy** | Desktop apps, CLI tools | Low |
| **C Bindings** | Native integration | Medium |
| **IPC (stdio)** | MCP protocol | Low |
| **Docker** | Server deployment | Low |

### Integration Example (Local HTTP Proxy)

```typescript
// Cursor / VS Code / Desktop App
const HYPERNEXUS_PROXY = 'http://127.0.0.1:7778';

async function callLLM(prompt: string) {
  // HyperNexus automatically routes relevant tools
  const response = await fetch(`${HYPERNEXUS_PROXY}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet',
      messages: [{ role: 'user', content: prompt }]
      // No need to specify tools - HyperNexus handles it
    })
  });
  
  return response.json();
}
```

### MCP Protocol Integration

```json
// ~/.cursor/mcp.json
{
  "mcpServers": {
    "hypernexus": {
      "command": "hypernexus",
      "args": ["serve", "--port", "7778"],
      "env": {
        "HYPERNEXUS_HOME": "~/.hypernexus"
      }
    }
  }
}
```

---

## 5. Competitive Landscape

| Solution | Token Reduction | Local-First | Memory | MCP Support |
|----------|----------------|-------------|--------|-------------|
| **HyperNexus** | 92.7% | ✅ | ✅ | ✅ |
| LangChain | None | ❌ | ❌ | Partial |
| LlamaIndex | None | ❌ | ❌ | ❌ |
| Cursor (built-in) | None | ❌ | ❌ | ✅ |
| Copilot | None | ❌ | ❌ | ❌ |

---

## 6. Pre-Acquisition Checklist

- [x] **Clean Codebase:** Repository cleanly separates open-source components from proprietary IP
- [x] **Benchmark Suite:** Reproducible benchmark script (`scripts/benchmark.py`) - runs in 60 seconds
- [x] **IP Ownership:** All commit history and copyrights belong to Robert Pelloni / HyperNexus LLC
- [x] **Production Deployment:** Live at hypernexus.site with Stripe billing
- [x] **Documentation:** Complete API docs, architecture diagrams, integration guides
- [x] **Test Coverage:** 42 automated tests, 100% pass rate

---

## 7. Contact

**Robert Pelloni**  
Creator of HyperNexus  
Email: <HyperNexusOfficialLLC@gmail.com>  
Web: <https://hypernexus.site>  
GitHub: <https://github.com/robertpelloni/HyperNexus>

---

## Appendix: Benchmark Results

```
Standard MCP Setup (all tools loaded):
  Tools: 76
  Payload size: 35,978 bytes
  Estimated tokens: 8,994

Progressive Routing Results (HyperNexus):
  Query 1: "Read src/main.py and fix bug" → 1,191 tokens (86.8% reduction)
  Query 2: "Search for TODO comments" → 1,191 tokens (86.8% reduction)
  Query 3: "Create git commit" → 286 tokens (96.8% reduction)
  Query 4: "Run test suite" → 394 tokens (95.6% reduction)
  Query 5: "Deploy to Docker" → 287 tokens (96.8% reduction)
  Query 6: "Query PostgreSQL" → 257 tokens (97.1% reduction)
  Query 7: "Remember decision" → 481 tokens (94.7% reduction)
  Query 8: "Find TypeScript files" → 1,191 tokens (86.8% reduction)

Average: 660 tokens (92.7% reduction)
```
