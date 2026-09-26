# HyperNexus Architecture

## Overview

HyperNexus is a "Go-Powered Modular Monolith" designed for high-performance AI orchestration. The Go kernel is the sole authoritative control plane, serving HTTP API, tRPC-compatible endpoints, and MCP (Model Context Protocol) stdio. The Next.js dashboard provides the web UI.

## Core Components

### 1. Go Kernel (Control Plane) — `go/`

The authoritative engine of the system.

- **Port**: 7778 (HTTP API + tRPC + MCP aggregate)
- **SkillStore**: Manages JIT skill and tool disclosure using BM25 ranking and LRU eviction.
- **EventBus**: High-frequency, resilient message broker for Swarm events.
- **PairOrchestrator**: Enforces the "Planner → Implementer → Tester → Critic" collaboration cycle.
- **Vault**: Secure persistence for sessions, memories (L1/L2), and secrets.
- **MCP Router**: 4-layer progressive tool routing (semantic search → catalog ranking → LRU working set → runtime proxy) across 60+ downstream MCP servers.
- **Native Tool Registry**: Go-native implementations for memory, code intelligence, billing, sessions, swarm, squad, and more.

### 2. Next.js Dashboard — `apps/web` & `packages/ui`

Reactive management interface.

- **Port**: 7779 (web UI)
- **Framework**: Next.js 16 / React 19 / Tailwind CSS 4.
- **tRPC Proxy**: `/api/trpc/[trpc]` resolves native Go procedures directly via `getCompatPayload`, bypassing any external upstream.
- **Universal Responsiveness**: Uses `useResizeObserver` for dynamic canvas-based visualizations like the `KnowledgeGraph`.
- **Swarm Visualizer**: Real-time neural transcript viewer.

### 3. HyperNexus Supervisor — `packages/hypernexus-supervisor`

Watchdog and automation agent (MCP stdio).

- **Automation**: Uses PowerShell and Windows UI Automation to interact with external AI chat surfaces (Antigravity, Gemini, Claude).
- **Autopilot**: Implements an intelligent "bump" cycle to maintain development momentum autonomously.

## Communication Patterns

- **HTTP REST**: Primary API for command and control (554 routes across 26 categories).
- **tRPC**: Compatibility shim at `/trpc/` for TypeScript clients; dispatches in-process to Go REST handlers.
- **MCP (stdio)**: `hypernexus.exe mcp` serves Model Context Protocol for external AI clients (MiMoCode, Codex, Claude, etc.).
- **SSE (Server-Sent Events)**: Real-time event streaming from the Go kernel.
- **JSON-RPC**: Standard communication for downstream MCP servers.

## Memory Hierarchy (Hippocampus)

- **L1**: Short-term, in-memory session context (scratchpad).
- **L2**: Long-term, semantically indexed via SQLite-vec in the Go Vault (facts, observations, session summaries).
- **TrafficObserver**: Passive fact extraction from system traffic.
- **Spaced Repetition**: Consolidation scheduling for memory review.

## External tRPC Upstream (Optional)

The Go kernel is the sole control plane by default. An external tRPC upstream can be enabled by setting `HYPERNEXUS_TRPC_UPSTREAM` to a tRPC-compatible service URL. When set, the kernel will forward procedures to that upstream before falling back to its native Go implementations.

The legacy TypeScript control plane (`hypernexus-core`) was decommissioned at `v1.0.0-alpha.251`. No TypeScript bridge process is required.
