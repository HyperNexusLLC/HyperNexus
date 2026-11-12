'use client';

import * as React from 'react';
import { trpc } from '@/utils/trpc';
import type { DashboardStartupStatus } from '@/app/dashboard/dashboard-home-view';

const GO_PROXY_PREFIX = '/api/go';

async function fetchKernelJSON<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${GO_PROXY_PREFIX}${path}`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? (json.data as T) : null;
  } catch {
    return null;
  }
}

/**
 * useStartupStatus — tRPC primary, kernel HTTP fallback.
 * When the TS core (tRPC) is down, polls /api/go/api/startup/status
 * which the Go kernel serves from local state.
 */
export function useStartupStatus(refetchIntervalMs = 5000) {
  const query = trpc.startupStatus.useQuery(undefined, {
    refetchInterval: refetchIntervalMs,
    retry: false,
  });
  const [fallback, setFallback] = React.useState<DashboardStartupStatus | null>(null);

  React.useEffect(() => {
    if (query.data) return;
    let cancelled = false;
    const load = async () => {
      const data = await fetchKernelJSON<DashboardStartupStatus>('/api/startup/status');
      if (!cancelled) setFallback(data);
    };
    void load();
    const id = setInterval(load, refetchIntervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [query.data, refetchIntervalMs]);

  return {
    data: (query.data ?? fallback) as DashboardStartupStatus | undefined,
    isLoading: query.isLoading && !fallback,
    refetch: query.refetch,
    source: (query.data ? 'trpc' : fallback ? 'kernel-http' : null) as 'trpc' | 'kernel-http' | null,
  };
}

/**
 * useBrowserStatus — tRPC primary, kernel HTTP fallback via /api/go/api/browser/status.
 */
export function useBrowserStatus(refetchIntervalMs = 5000) {
  const query = trpc.browser.status.useQuery(undefined, {
    refetchInterval: refetchIntervalMs,
    retry: false,
  });
  const [fallback, setFallback] = React.useState<any>(null);

  React.useEffect(() => {
    if (query.data) return;
    let cancelled = false;
    const load = async () => {
      const data = await fetchKernelJSON<any>('/browser/status');
      if (!cancelled) setFallback(data);
    };
    void load();
    const id = setInterval(load, refetchIntervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [query.data, refetchIntervalMs]);

  return {
    data: query.data ?? fallback,
    isLoading: query.isLoading && !fallback,
    refetch: query.refetch,
    source: (query.data ? 'trpc' : fallback ? 'kernel-http' : null) as 'trpc' | 'kernel-http' | null,
  };
}

/**
 * useMcpStatus — tRPC primary, kernel HTTP fallback via /api/go/api/mcp/status.
 */
export function useMcpStatus(refetchIntervalMs = 10000) {
  const query = trpc.mcp.getStatus.useQuery(undefined, {
    refetchInterval: refetchIntervalMs,
    retry: false,
  });
  const [fallback, setFallback] = React.useState<any>(null);

  React.useEffect(() => {
    if (query.data) return;
    let cancelled = false;
    const load = async () => {
      const data = await fetchKernelJSON<any>('/api/mcp/status');
      if (!cancelled) setFallback(data);
    };
    void load();
    const id = setInterval(load, refetchIntervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [query.data, refetchIntervalMs]);

  return {
    data: query.data ?? fallback,
    isLoading: query.isLoading && !fallback,
    refetch: query.refetch,
    source: (query.data ? 'trpc' : fallback ? 'kernel-http' : null) as 'trpc' | 'kernel-http' | null,
  };
}
