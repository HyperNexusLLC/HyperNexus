"""HyperNexus skill for Prime Agent.

Thin, typed access to the HyperNexus control plane (Go kernel, default
http://127.0.0.1:7778): persistent multi-tier memory, MCP tool discovery,
knowledge graph, sessions, and system status. Every call is bounded so an
unreachable kernel never stalls a turn.
"""

from __future__ import annotations

import os
from typing import Any

import httpx

__all__ = [
    "run",
    "status",
    "kernel_status",
    "memory_store",
    "memory_fact",
    "memory_search",
    "memory_fts_search",
    "memory_list",
    "memory_delete",
    "memory_graph",
    "memory_relate",
    "scratchpad_get",
    "scratchpad_set",
    "scratchpad_append",
    "search_tools",
    "suggest_tools",
    "mcp_status",
    "mcp_servers",
    "mcp_tools",
    "mcp_call",
    "sessions",
    "session_context",
    "knowledge_graph",
    "knowledge_stats",
    "handoff",
    "pickup",
    "agent_memory_search",
    "system_status",
    "billing_status",
]

BASE_URL = os.environ.get("HYPERNEXUS_URL", "http://127.0.0.1:7778").rstrip("/")
DEFAULT_TIMEOUT = 5.0


class KernelUnreachable(RuntimeError):
    """The HyperNexus kernel did not answer. Start it with `hypernexus serve`."""


def _unwrap(payload: Any) -> Any:
    """Return the useful payload from the kernel's {bridge, data, success} envelope."""
    if isinstance(payload, dict) and "data" in payload and ("bridge" in payload or "success" in payload):
        return payload["data"]
    return payload


async def _request(
    method: str,
    path: str,
    *,
    params: dict[str, Any] | None = None,
    json: dict[str, Any] | None = None,
    timeout: float = DEFAULT_TIMEOUT,
    unwrap: bool = True,
) -> Any:
    url = f"{BASE_URL}{path}"
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.request(method, url, params=params, json=json)
    except httpx.HTTPError as exc:
        raise KernelUnreachable(
            f"HyperNexus kernel unreachable at {BASE_URL} ({exc.__class__.__name__}). "
            "Start it with `hypernexus serve` or set HYPERNEXUS_URL."
        ) from exc
    if resp.status_code >= 400:
        raise RuntimeError(f"{method} {path} -> HTTP {resp.status_code}: {resp.text[:300]}")
    if not resp.content:
        return None
    try:
        payload = resp.json()
    except ValueError:
        return resp.text
    return _unwrap(payload) if unwrap else payload


async def kernel_status(timeout: float = DEFAULT_TIMEOUT) -> dict[str, Any]:
    """Kernel health: service name, version, base URL, uptime."""
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.get(f"{BASE_URL}/health")
        return resp.json()


async def status(section: str = "status") -> str:
    """HyperNexus overview. section: status | memory | mcp | tools | sessions."""
    if section == "memory":
        stats = await _request("GET", "/api/memory/agent-stats")
        return str(stats)
    if section == "mcp":
        return str(await mcp_status())
    if section == "tools":
        return str(await _request("GET", "/api/tools/search", params={"query": "*", "limit": 10}))
    if section == "sessions":
        return str(await sessions())
    health = await kernel_status()
    return (
        f"HyperNexus {health.get('version', '?')} at {health.get('baseUrl', BASE_URL)} "
        f"(ok={health.get('ok')}, uptime {health.get('uptimeSec', 0)}s)"
    )


async def run(section: str = "status") -> str:
    """HyperNexus status and capability overview.

    section: "status" (default), "memory", "mcp", "tools", or "sessions".
    """
    return await status(section)


# ── memory ──────────────────────────────────────────────────────────────


async def memory_store(
    content: str,
    tags: str | list[str] | None = None,
    category: str = "general",
    importance: float = 0.5,
    session_id: str | None = None,
) -> Any:
    """Store a memory in the L2 vector vault. tags: comma string or list."""
    body: dict[str, Any] = {
        "content": content,
        "category": category,
        "importance": importance,
    }
    if tags is not None:
        body["tags"] = ",".join(tags) if isinstance(tags, list) else tags
    if session_id:
        body["session_id"] = session_id
    return await _request("POST", "/api/memory/add", json=body)


async def memory_fact(
    title: str,
    content: str,
    tags: str | list[str] | None = None,
    namespace: str = "project",
) -> Any:
    """Store a structured fact (title + content + tags + namespace). Returns the stored record."""
    body: dict[str, Any] = {"title": title, "content": content, "namespace": namespace}
    if tags is not None:
        body["tags"] = tags if isinstance(tags, list) else [t.strip() for t in tags.split(",")]
    return await _request("POST", "/api/memory/facts/add", json=body)


async def memory_search(
    query: str,
    limit: int = 10,
    tag: str | None = None,
    category: str | None = None,
    include_cold: bool = False,
) -> Any:
    """Keyword/vector search over L2 vault memories (empty query returns recent)."""
    params: dict[str, Any] = {"query": query, "limit": limit}
    if tag:
        params["tag"] = tag
    if category:
        params["category"] = category
    if include_cold:
        params["include_cold"] = "true"
    return await _request("GET", "/api/memory/search", params=params)


async def memory_fts_search(query: str, limit: int = 10) -> Any:
    """Fast full-text search over memories (hot path, sub-second)."""
    return await _request("GET", "/api/memory/fts-search", params={"query": query, "limit": limit})


async def memory_list(limit: int = 20) -> Any:
    """List recent L2 vault memories."""
    return await _request("GET", "/api/memory/list", params={"limit": limit})


async def memory_delete(id: str) -> Any:
    """Delete a memory by id."""
    return await _request("POST", "/api/agent-memory/delete", json={"id": id})


async def memory_graph(limit: int = 30) -> Any:
    """Knowledge-graph nodes and edges derived from memory relations."""
    return await _request("GET", "/api/memory/graph", params={"limit": limit})


async def memory_relate(source: str, target: str, relation: str = "related_to", metadata: dict | None = None) -> Any:
    """Add a knowledge-graph edge between two entities."""
    body: dict[str, Any] = {"source": source, "target": target, "relation": relation}
    if metadata:
        body["metadata"] = metadata
    return await _request("POST", "/api/memory/relations/add", json=body)


# ── scratchpad (L1 working memory) ──────────────────────────────────────


async def scratchpad_get(key: str) -> Any:
    """Read an L1 scratchpad key (e.g. 'persona', 'human', or any custom key)."""
    return await _request("GET", "/api/memory/scratchpad/get", params={"key": key})


async def scratchpad_set(key: str, value: str) -> Any:
    """Write/overwrite an L1 scratchpad key."""
    return await _request("POST", "/api/memory/scratchpad/set", json={"key": key, "value": value})


async def scratchpad_append(key: str, value: str) -> Any:
    """Append text to an L1 scratchpad key."""
    return await _request("POST", "/api/memory/scratchpad/set", json={"key": key, "value": value, "append": True})


# ── tool discovery over the 26k+ MCP tool catalog ───────────────────────


async def search_tools(query: str, limit: int = 10) -> Any:
    """Semantic search over the indexed MCP tool catalog."""
    return await _request("GET", "/api/tools/search", params={"query": query, "limit": limit})


async def suggest_tools(context: str) -> Any:
    """Proactive tool suggestions for a task description."""
    return await _request("GET", "/api/mcp/tool-suggestions", params={"context": context})


# ── MCP bridge (downstream MCP servers configured in the kernel) ────────


async def mcp_status() -> Any:
    """MCP runtime status: connected servers, tool counts, mode."""
    return await _request("GET", "/api/mcp/status")


async def mcp_servers() -> Any:
    """List MCP servers configured in the kernel."""
    return await _request("GET", "/api/mcp/servers")


async def mcp_tools(server: str | None = None) -> Any:
    """List MCP tools, optionally filtered to one server."""
    params = {"serverName": server} if server else None
    return await _request("GET", "/api/mcp/tools", params=params)


async def mcp_call(server_name: str, tool_name: str, arguments: dict[str, Any] | str | None = None) -> Any:
    """Call a tool on a downstream MCP server through the kernel."""
    import json as _json

    if isinstance(arguments, dict):
        arguments = _json.dumps(arguments)
    return await _request(
        "POST",
        "/api/mcp/tools/call",
        json={"serverName": server_name, "toolName": tool_name, "arguments": arguments or "{}"},
    )


# ── sessions & knowledge ────────────────────────────────────────────────


async def sessions() -> Any:
    """Active HyperNexus sessions summary."""
    return await _request("GET", "/api/sessions/summary")


async def session_context() -> Any:
    """Current session context bundle (goal, recent activity)."""
    return await _request("GET", "/api/sessions/context")


async def knowledge_graph(limit: int = 50) -> Any:
    """Knowledge-graph nodes and edges."""
    return await _request("GET", "/api/knowledge/graph", params={"limit": limit})


async def knowledge_stats() -> Any:
    """Knowledge-graph statistics."""
    return await _request("GET", "/api/knowledge/stats")


# ── cross-session handoff (agent memory) ────────────────────────────────


async def handoff(summary: str, session_id: str | None = None) -> str:
    """Build a cross-session handoff artifact (recent context + notes).

    Returns the artifact JSON string: persist it (HANDOFF.md, memory) and pass it
    to `pickup(artifact)` in the next session to restore the context.
    """
    body: dict[str, Any] = {"notes": summary}
    if session_id:
        body["sessionId"] = session_id
    return await _request("POST", "/api/agent-memory/handoff", json=body)


async def pickup(artifact: str) -> Any:
    """Restore a handoff artifact produced by `handoff()` into agent memory."""
    return await _request("POST", "/api/agent-memory/pickup", json={"artifact": artifact})


async def agent_memory_search(query: str, limit: int = 10) -> Any:
    """Search cross-session agent memories."""
    return await _request("GET", "/api/agent-memory/search", params={"query": query, "limit": limit})


# ── system ──────────────────────────────────────────────────────────────


async def system_status() -> Any:
    """Overall HyperNexus system health."""
    return await _request("GET", "/api/system/overview")


async def billing_status() -> Any:
    """Billing and provider status."""
    return await _request("GET", "/api/billing/status")
