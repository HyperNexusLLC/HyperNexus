'use client';

import * as React from 'react';
import { trpc } from "@/utils/trpc";
import { normalizeMetricsData } from './metrics-page-normalizers';

interface RoutingRow {
    timestamp?: number;
    requestId?: string;
    provider?: string;
    model?: string;
    toolName?: string;
    strategy?: string;
    latencyMs?: number;
    success?: boolean;
    error?: string;
}

export default function MetricsPage() {
    const { data, error, isLoading } = trpc.metrics.getStats.useQuery(
        { windowMs: 3600000 },
        { refetchInterval: 5000 }
    );
    const [routing, setRouting] = React.useState<RoutingRow[]>([]);

    React.useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const res = await fetch("/api/go/api/metrics/routing-history?limit=20");
                const body = await res.json();
                const rows = Array.isArray(body?.data)
                    ? body.data
                    : Array.isArray(body?.data?.events)
                        ? body.data.events
                        : [];
                if (!cancelled) setRouting(rows as RoutingRow[]);
            } catch {
                if (!cancelled) setRouting([]);
            }
        };
        void load();
        const id = setInterval(load, 10000);
        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, []);

    const formatBytes = (b: number) => {
        if (b > 1073741824) return `${(b / 1073741824).toFixed(1)} GB`;
        if (b > 1048576) return `${(b / 1048576).toFixed(1)} MB`;
        if (b > 1024) return `${(b / 1024).toFixed(1)} KB`;
        return `${b} B`;
    };

    const normalized = normalizeMetricsData(data);

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">📊 Metrics</h1>
                <p className="text-muted-foreground">
                    System performance telemetry and resource monitoring.
                </p>
            </div>

            {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
                    Error: {error.message}
                </div>
            )}

            {isLoading && (
                <div className="text-muted-foreground animate-pulse">Loading metrics...</div>
            )}

            {data && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-card border rounded-lg p-4">
                            <div className="text-sm text-muted-foreground">Total Events</div>
                            <div className="text-2xl font-bold">{normalized.totalEvents.toLocaleString()}</div>
                        </div>
                        <div className="bg-card border rounded-lg p-4">
                            <div className="text-sm text-muted-foreground">Heap Usage</div>
                            <div className="text-2xl font-bold">
                                {normalized.averages.memoryHeap !== null ? formatBytes(normalized.averages.memoryHeap) : 'N/A'}
                            </div>
                        </div>
                        <div className="bg-card border rounded-lg p-4">
                            <div className="text-sm text-muted-foreground">RSS</div>
                            <div className="text-2xl font-bold">
                                {normalized.averages.memoryRss !== null ? formatBytes(normalized.averages.memoryRss) : 'N/A'}
                            </div>
                        </div>
                        <div className="bg-card border rounded-lg p-4">
                            <div className="text-sm text-muted-foreground">System Load</div>
                            <div className="text-2xl font-bold">
                                {normalized.averages.systemLoad !== null ? normalized.averages.systemLoad.toFixed(2) : 'N/A'}
                            </div>
                        </div>
                    </div>

                    {/* Event Type Breakdown */}
                    <div className="bg-card border rounded-lg p-6">
                        <h2 className="text-lg font-semibold mb-4">Event Type Breakdown</h2>
                        <div className="space-y-2">
                            {normalized.countRows.map(({ type, count }) => (
                                <div key={type} className="flex justify-between items-center">
                                    <span className="font-mono text-sm">{type}</span>
                                    <div className="flex items-center gap-4">
                                        <div className="w-32 bg-muted rounded-full h-2">
                                            <div
                                                className="bg-primary rounded-full h-2"
                                                style={{ width: `${Math.min(100, normalized.totalEvents > 0 ? (count / normalized.totalEvents) * 100 : 0)}%` }}
                                            />
                                        </div>
                                        <span className="text-sm text-muted-foreground w-16 text-right">
                                            {count}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Sparkline Chart */}
                    {normalized.series.length > 0 && (
                        <div className="bg-card border rounded-lg p-6">
                            <h2 className="text-lg font-semibold mb-4">Activity Over Time</h2>
                            <div className="flex items-end h-32 gap-px">
                                {normalized.series.map((bucket, i: number) => {
                                    const height = (bucket.count / normalized.maxSeriesCount) * 100;
                                    return (
                                        <div
                                            key={i}
                                            className="flex-1 bg-primary/60 hover:bg-primary rounded-t transition-colors"
                                            style={{ height: `${Math.max(2, height)}%` }}
                                            title={`${new Date(bucket.time).toLocaleTimeString()}: ${bucket.count} events`}
                                        />
                                    );
                                })}
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                <span>{normalized.firstSeriesTime !== null ? new Date(normalized.firstSeriesTime).toLocaleTimeString() : 'N/A'}</span>
                                <span>{normalized.lastSeriesTime !== null ? new Date(normalized.lastSeriesTime).toLocaleTimeString() : 'N/A'}</span>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Routing History — always shown (local fallback store) */}
            <div className="bg-card border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Routing History</h2>
                {routing.length === 0 ? (
                    <p className="text-muted-foreground italic">No routing decisions recorded yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-muted-foreground border-b">
                                    <th className="py-2 pr-3">Time</th>
                                    <th className="py-2 pr-3">Provider</th>
                                    <th className="py-2 pr-3">Model</th>
                                    <th className="py-2 pr-3">Tool</th>
                                    <th className="py-2 pr-3">Strategy</th>
                                    <th className="py-2 pr-3">Latency</th>
                                    <th className="py-2">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {routing.map((row, i) => (
                                    <tr key={i} className="border-b border-border/50">
                                        <td className="py-2 pr-3 text-muted-foreground">
                                            {row.timestamp ? new Date(row.timestamp).toLocaleTimeString() : '—'}
                                        </td>
                                        <td className="py-2 pr-3">{row.provider || '—'}</td>
                                        <td className="py-2 pr-3 font-mono text-xs">{row.model || '—'}</td>
                                        <td className="py-2 pr-3 font-mono text-xs">{row.toolName || '—'}</td>
                                        <td className="py-2 pr-3">{row.strategy || '—'}</td>
                                        <td className="py-2 pr-3">
                                            {typeof row.latencyMs === 'number' ? `${Math.round(row.latencyMs)}ms` : '—'}
                                        </td>
                                        <td className="py-2">
                                            <span className={row.success ? 'text-green-400' : 'text-red-400'}>
                                                {row.success ? 'ok' : (row.error || 'fail')}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
