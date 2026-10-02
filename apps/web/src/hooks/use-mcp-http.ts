'use client';

/**
 * use-mcp-http.ts — HTTP fallback hooks for MCP tool operations.
 *
 * Pattern: tRPC primary, kernel HTTP fallback via /api/go/api/mcp/*.
 * When the TS core (tRPC) is down or unreachable, these hooks poll
 * the Go kernel directly so the search / inspector / tool pages still work.
 *
 * Each hook returns { data, isLoading, refetch, source } where source
 * is 'trpc' | 'kernel-http' | null so callers can show a badge.
 */

import * as React from 'react';
import { trpc } from '@/utils/trpc';

const GO_PROXY_PREFIX = '/api/go';

async function fetchKernelJSON<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${GO_PROXY_PREFIX}${path}`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success !== false ? ((json.data ?? json) as T) : null;
  } catch {
    return null;
  }
}

async function postKernelJSON<T>(path: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(`${GO_PROXY_PREFIX}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success !== false ? ((json.data ?? json) as T) : null;
  } catch {
    return null;
  }
}

// ─── Read hooks (tRPC primary, HTTP fallback) ────────────────────────────

/** List all MCP tools (listTools). */
export function useMcpListTools() {
  const query = trpc.mcp.listTools.useQuery(undefined, { retry: false });
  const [fallback, setFallback] = React.useState<any>(null);

  React.useEffect(() => {
    if (query.data) return;
    let cancelled = false;
    const load = async () => {
      const data = await fetchKernelJSON<any>('/api/mcp/tools');
      if (!cancelled) setFallback(data);
    };
    void load();
  }, [query.data]);

  return {
    data: query.data ?? fallback,
    isLoading: query.isLoading && !fallback,
    refetch: query.refetch,
    source: (query.data ? 'trpc' : fallback ? 'kernel-http' : null) as 'trpc' | 'kernel-http' | null,
  };
}

/** Search MCP tools (searchTools). */
export function useMcpSearchTools(queryStr: string, limit = 20) {
  const query = trpc.mcp.searchTools.useQuery(
    { query: queryStr, limit },
    { enabled: queryStr.length > 0, retry: false },
  );
  const [fallback, setFallback] = React.useState<any>(null);

  React.useEffect(() => {
    if (query.data || !queryStr) return;
    let cancelled = false;
    const load = async () => {
      const data = await fetchKernelJSON<any>(
        `/api/mcp/tools/search?q=${encodeURIComponent(queryStr)}&limit=${limit}`,
      );
      if (!cancelled) setFallback(data);
    };
    void load();
  }, [query.data, queryStr, limit]);

  return {
    data: query.data ?? fallback,
    isLoading: query.isLoading && !fallback,
    refetch: query.refetch,
    source: (query.data ? 'trpc' : fallback ? 'kernel-http' : null) as 'trpc' | 'kernel-http' | null,
  };
}

/** Get working set (loaded tools). */
export function useMcpWorkingSet(refetchMs = 4000) {
  const query = trpc.mcp.getWorkingSet.useQuery(undefined, {
    refetchInterval: refetchMs,
    retry: false,
  });
  const [fallback, setFallback] = React.useState<any>(null);

  React.useEffect(() => {
    if (query.data) return;
    let cancelled = false;
    const load = async () => {
      const data = await fetchKernelJSON<any>('/api/mcp/working-set');
      if (!cancelled) setFallback(data);
    };
    void load();
    const id = setInterval(load, refetchMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [query.data, refetchMs]);

  return {
    data: query.data ?? fallback,
    isLoading: query.isLoading && !fallback,
    refetch: query.refetch,
    source: (query.data ? 'trpc' : fallback ? 'kernel-http' : null) as 'trpc' | 'kernel-http' | null,
  };
}

/** Get tool selection telemetry. */
export function useMcpTelemetry(refetchMs = 4000) {
  const query = trpc.mcp.getToolSelectionTelemetry.useQuery(undefined, {
    refetchInterval: refetchMs,
    retry: false,
  });
  const [fallback, setFallback] = React.useState<any>(null);

  React.useEffect(() => {
    if (query.data) return;
    let cancelled = false;
    const load = async () => {
      const data = await fetchKernelJSON<any>('/api/mcp/tool-selection-telemetry');
      if (!cancelled) setFallback(data);
    };
    void load();
    const id = setInterval(load, refetchMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [query.data, refetchMs]);

  return {
    data: query.data ?? fallback,
    isLoading: query.isLoading && !fallback,
    refetch: query.refetch,
    source: (query.data ? 'trpc' : fallback ? 'kernel-http' : null) as 'trpc' | 'kernel-http' | null,
  };
}

/** Get tool preferences. */
export function useMcpPreferences() {
  const query = trpc.mcp.getToolPreferences.useQuery(undefined, { retry: false });
  const [fallback, setFallback] = React.useState<any>(null);

  React.useEffect(() => {
    if (query.data) return;
    let cancelled = false;
    const load = async () => {
      const data = await fetchKernelJSON<any>('/api/mcp/preferences');
      if (!cancelled) setFallback(data);
    };
    void load();
  }, [query.data]);

  return {
    data: query.data ?? fallback,
    isLoading: query.isLoading && !fallback,
    refetch: query.refetch,
    source: (query.data ? 'trpc' : fallback ? 'kernel-http' : null) as 'trpc' | 'kernel-http' | null,
  };
}

/** Get JSONC editor content. */
export function useMcpJsoncEditor() {
  const query = trpc.mcp.getJsoncEditor.useQuery(undefined, { retry: false });
  const [fallback, setFallback] = React.useState<any>(null);

  React.useEffect(() => {
    if (query.data) return;
    let cancelled = false;
    const load = async () => {
      const data = await fetchKernelJSON<any>('/api/mcp/config/jsonc');
      if (!cancelled) setFallback(data);
    };
    void load();
  }, [query.data]);

  return {
    data: query.data ?? fallback,
    isLoading: query.isLoading && !fallback,
    refetch: query.refetch,
    source: (query.data ? 'trpc' : fallback ? 'kernel-http' : null) as 'trpc' | 'kernel-http' | null,
  };
}

/** Get working set eviction history. */
export function useMcpEvictionHistory(refetchMs = 8000) {
  const query = trpc.mcp.getWorkingSetEvictionHistory.useQuery(undefined, {
    refetchInterval: refetchMs,
    retry: false,
  });
  const [fallback, setFallback] = React.useState<any>(null);

  React.useEffect(() => {
    if (query.data) return;
    let cancelled = false;
    const load = async () => {
      const data = await fetchKernelJSON<any>('/api/mcp/working-set/evictions');
      if (!cancelled) setFallback(data);
    };
    void load();
    const id = setInterval(load, refetchMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [query.data, refetchMs]);

  return {
    data: query.data ?? fallback,
    isLoading: query.isLoading && !fallback,
    refetch: query.refetch,
    source: (query.data ? 'trpc' : fallback ? 'kernel-http' : null) as 'trpc' | 'kernel-http' | null,
  };
}

// ─── Mutation helpers (try tRPC, fall back to kernel HTTP) ───────────────

/** Call a tool — tries tRPC then kernel HTTP. */
export async function callMcpTool(toolName: string, args: Record<string, unknown>) {
  // HTTP path is the fallback; caller can use trpc mutation as primary
  return postKernelJSON<any>('/api/mcp/tools/call', { name: toolName, arguments: args });
}

/** Load a tool into the working set. */
export async function loadMcpTool(toolName: string) {
  return postKernelJSON<any>('/api/mcp/native/load', { name: toolName });
}

/** Unload a tool from the working set. */
export async function unloadMcpTool(toolName: string) {
  return postKernelJSON<any>('/api/mcp/native/unload', { name: toolName });
}

/** Get a tool's JSON schema. */
export async function getMcpToolSchema(toolName: string) {
  return fetchKernelJSON<any>(`/api/mcp/tools/schema?name=${encodeURIComponent(toolName)}`);
}

/** Set tool preferences. */
export async function setMcpToolPreferences(prefs: Record<string, unknown>) {
  return postKernelJSON<any>('/api/mcp/preferences', prefs);
}

/** Clear tool selection telemetry. */
export async function clearMcpTelemetry() {
  return postKernelJSON<any>('/api/mcp/tool-selection-telemetry/clear', {});
}

/** Clear working set eviction history. */
export async function clearMcpEvictionHistory() {
  return postKernelJSON<any>('/api/mcp/working-set/evictions/clear', {});
}

/** Save JSONC editor content. */
export async function saveMcpJsonc(content: string) {
  return postKernelJSON<any>('/api/mcp/config/jsonc', { content });
}
