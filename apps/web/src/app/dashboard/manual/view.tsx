'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
    Badge,
} from '@hypernexus/ui';
import { trpc } from '@/utils/trpc';
import {
    Book,
    Cpu,
    Shield,
    Activity,
    GraduationCap,
    GitBranch,
    Terminal,
    Database,
    Layers,
    Monitor,
    Radio,
    Wrench,
    ArrowLeft,
} from 'lucide-react';

const OMNI_CONSOLE_SECTIONS = [
    {
        anchor: '#mission-control',
        label: '🌌 Mission Control & Command Center',
        summary: 'Kernel readiness matrix, blocking-reason triage, live diagnostics, slash-command executor, and emergency shutdown.',
    },
    {
        anchor: '#memory-graphrag',
        label: '🧠 Memory & GraphRAG',
        summary: 'L1 scratchpad key-value working state, L2 SQLite/vector durable vault, entity-relation GraphRAG explorer, and L3 cold session archive.',
    },
    {
        anchor: '#mcp-registry',
        label: '🔌 MCP Registry & Progressive Tool Router',
        summary: '60+ server catalog, lazy schema hydration, semantic tool discovery, live JSON-RPC traffic stream, and parity test gates.',
    },
    {
        anchor: '#research-workflows',
        label: '🔬 Swarm & Deep Research',
        summary: 'Autonomous topic ingestion queue, multi-agent code-gen swarm launcher, and real-time swarm node topology.',
    },
    {
        anchor: '#workflow-orchestration',
        label: '🕸️ Autonomous DAG Engine',
        summary: 'Multi-step directed acyclic workflow library, live node state visualizer, and instant Pause/Resume execution controls.',
    },
    {
        anchor: '#system-recovery',
        label: '🛡️ Recovery, Sessions & Configuration',
        summary: 'SQLite integrity probe, catalog schema sync, cross-harness session import bridge, git chronicle, config.json editor, and immune healer.',
    },
    {
        anchor: '#health-metrics',
        label: '📊 Kernel Health & Latency',
        summary: 'Live Go sidecar (:7778) uptime, p50/p95 endpoint latency histograms, and heartbeat stall detection.',
    },
    {
        anchor: '#skills-workflows',
        label: '⚡ Agent Skills & Discipline Loops',
        summary: 'Assimilated SKILL.md catalog and standardized RECALL → DISCOVER → EXECUTE → PERSIST → VERIFY orchestration playbooks.',
    },
    {
        anchor: '#security-audit',
        label: '🔒 Security, Licensing & Audit',
        summary: 'Ed25519 offline/online license authority, corporate SSO enforcement, RBAC permission matrix, and append-only audit log.',
    },
    {
        anchor: '#healer-cognition',
        label: '🧬 Cognition & Autonomous Healer',
        summary: 'Cognitive focus telemetry and automated compile/test failure diagnosis and patch synthesis.',
    },
    {
        anchor: '#prompts-deployments',
        label: '🚀 Prompts, Deployments & Deep Links',
        summary: 'Compiled Go system prompts, independent static web deployment pipelines, Cloud portal, and hypernexus:// OS URI registry.',
    },
    {
        anchor: '#governance-billing',
        label: '💼 Provider Quotas & Billing Waterfall',
        summary: 'Multi-provider auth status, token/cost burn history, automatic depleted-model waterfall routing, and Stripe seat subscriptions.',
    },
    {
        anchor: '#integrations',
        label: '☁️ Harness Integrations & Browser Bridge',
        summary: 'One-click setup status for Claude Code, Cursor, Codex, Pi, CodeWhale, Freebuff, Hax, Antigravity, and Chrome/Edge CDP bridges.',
    },
] as const;

export default function ManualPage() {
    const [versionLabel, setVersionLabel] = useState('loading...');
    const [kernelOnline, setKernelOnline] = useState<boolean | null>(null);
    const executeTool = trpc.executeTool.useMutation();
    const queueQuery = trpc.research.ingestionQueue.useQuery(undefined, { refetchInterval: 10000 });
    const autonomyQuery = trpc.autonomy.getLevel.useQuery(undefined, { refetchInterval: 10000 });

    useEffect(() => {
        let cancelled = false;
        const loadVersion = async () => {
            try {
                const healthRes = await fetch('/api/go/health', { cache: 'no-store' });
                if (healthRes.ok) {
                    const data = (await healthRes.json()) as { version?: string; status?: string };
                    if (!cancelled && data?.version) {
                        const normalized = String(data.version).trim().replace(/^v/i, '');
                        setVersionLabel(`v${normalized}`);
                        setKernelOnline(true);
                        return;
                    }
                }
            } catch {
                // Fall back to workspace VERSION file via tool execution below
            }

            try {
                let output: unknown;
                try {
                    output = await executeTool.mutateAsync({ name: 'read_file', args: { filePath: 'VERSION' } });
                } catch {
                    output = await executeTool.mutateAsync({ name: 'read_file', args: { path: 'VERSION' } });
                }

                if (cancelled) return;
                const text = typeof output === 'string' ? output : JSON.stringify(output);
                const version = text.trim().replace(/^v/i, '');
                setVersionLabel(version ? `v${version}` : 'unknown');
                setKernelOnline(false);
            } catch {
                if (!cancelled) {
                    setVersionLabel('unknown');
                    setKernelOnline(false);
                }
            }
        };

        void loadVersion();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="container mx-auto p-6 space-y-6 max-w-6xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex flex-col gap-2">
                    <h1 className="text-4xl font-bold tracking-tight text-white flex items-center gap-3">
                        <Book className="w-8 h-8 text-cyan-400" />
                        HyperNexus Operator Manual
                    </h1>
                    <p className="text-lg text-muted-foreground">
                        Authoritative reference for the Go-Native AI Control Plane ({versionLabel}) — Consolidated Omni-Console, Memory Tiers, Win32 System Tray &amp; Multi-Harness Bus.
                    </p>
                </div>
                <Link
                    href="/dashboard"
                    title="Return to the consolidated single-page HyperNexus Omni-Console"
                    className="inline-flex items-center gap-2 self-start rounded-lg border border-cyan-500/40 bg-cyan-950/30 px-4 py-2 text-sm font-medium text-cyan-300 hover:bg-cyan-900/40 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Omni-Console
                </Link>
            </div>

            <Card className="bg-zinc-950 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-400" />
                        Live Control Plane Snapshot
                    </CardTitle>
                    <CardDescription>
                        Real-time telemetry from the Go kernel sidecar (<code>:7778</code>) and Next.js observation deck (<code>:7779</code>).
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                    <div
                        className="rounded-md border border-cyan-500/30 bg-cyan-950/20 px-3 py-2"
                        title="Live Go sidecar kernel health (:7778/health) and active build version"
                    >
                        <div className="text-xs uppercase tracking-wide text-cyan-300/80">Kernel Sidecar</div>
                        <div className="text-lg font-semibold text-cyan-300">
                            {kernelOnline === null ? 'Probing...' : kernelOnline ? `ONLINE (${versionLabel})` : `DEGRADED (${versionLabel})`}
                        </div>
                    </div>
                    <div
                        className="rounded-md border border-emerald-500/30 bg-emerald-950/20 px-3 py-2"
                        title="Completed research and knowledge ingestion jobs"
                    >
                        <div className="text-xs uppercase tracking-wide text-emerald-300/80">Processed</div>
                        <div className="text-xl font-semibold text-emerald-300">{queueQuery.data?.totals?.processed ?? 0}</div>
                    </div>
                    <div
                        className="rounded-md border border-amber-500/30 bg-amber-950/20 px-3 py-2"
                        title="Queued ingestion items awaiting worker execution"
                    >
                        <div className="text-xs uppercase tracking-wide text-amber-300/80">Pending</div>
                        <div className="text-xl font-semibold text-amber-300">{queueQuery.data?.totals?.pending ?? 0}</div>
                    </div>
                    <div
                        className="rounded-md border border-rose-500/30 bg-rose-950/20 px-3 py-2"
                        title="Failed ingestion items requiring retry or healer inspection"
                    >
                        <div className="text-xs uppercase tracking-wide text-rose-300/80">Failed</div>
                        <div className="text-xl font-semibold text-rose-300">{queueQuery.data?.totals?.failed ?? 0}</div>
                    </div>
                    <div
                        className="rounded-md border border-blue-500/30 bg-blue-950/20 px-3 py-2"
                        title="Active kernel autonomy posture enforced by Policy Service"
                    >
                        <div className="text-xs uppercase tracking-wide text-blue-300/80">Autonomy</div>
                        <div className="mt-1">
                            <Badge variant="outline" className="text-blue-300 border-blue-700/50">
                                {(autonomyQuery.data || 'autonomous').toUpperCase()}
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="getting-started" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 bg-zinc-900 border border-zinc-800 h-auto p-1">
                    <TabsTrigger
                        value="getting-started"
                        title="Single-page Omni-Console layout, all 13 quick-jump sections, and runtime port map"
                        className="data-[state=active]:bg-cyan-900/50 py-3"
                    >
                        Omni-Console Map
                    </TabsTrigger>
                    <TabsTrigger
                        value="core-agents"
                        title="Go Kernel, Director/Council/Healer agents, and L1/L2/L3 + GraphRAG memory tiers"
                        className="data-[state=active]:bg-purple-900/50 py-3"
                    >
                        Agents &amp; Memory Tiers
                    </TabsTrigger>
                    <TabsTrigger
                        value="workflows"
                        title="Windows System Tray controls, Cross-Session Bus, Edge CDP 9222 bridge, and Plan/Build modes"
                        className="data-[state=active]:bg-emerald-900/50 py-3"
                    >
                        Systray, Bus &amp; Harnesses
                    </TabsTrigger>
                    <TabsTrigger
                        value="advanced"
                        title="Progressive MCP tool routing, Ed25519 licensing, waterfall billing, and DB recovery"
                        className="data-[state=active]:bg-amber-900/50 py-3"
                    >
                        Security, Billing &amp; Ops
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="getting-started">
                    <Card className="bg-zinc-950 border-zinc-800">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Layers className="w-5 h-5 text-cyan-400" />
                                Consolidated Single-Page Omni-Console Architecture
                            </CardTitle>
                            <CardDescription>
                                Every subsystem is consolidated onto <code>/dashboard</code> in value-prioritized order with instant sticky-header anchor navigation and hover tooltips (<code>💡</code>).
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800">
                                    <h3 className="font-bold flex items-center gap-2 mb-1 text-cyan-300">
                                        <Cpu className="w-4 h-4" /> Port 7778 — Go Kernel
                                    </h3>
                                    <p className="text-xs text-zinc-400">
                                        Authoritative native sidecar serving 400+ REST endpoints, tRPC fast-paths, SQLite/FTS5 L2 memory, MCP stdio/SSE bridge, UDP gossip, and Win32 systray.
                                    </p>
                                </div>
                                <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800">
                                    <h3 className="font-bold flex items-center gap-2 mb-1 text-emerald-300">
                                        <Monitor className="w-4 h-4" /> Port 7779 — Web Console
                                    </h3>
                                    <p className="text-xs text-zinc-400">
                                        Next.js observation deck proxying <code>/api/go/*</code> and <code>/api/trpc/*</code> to the Go sidecar without hardcoded remote ports (Nginx-safe).
                                    </p>
                                </div>
                                <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800">
                                    <h3 className="font-bold flex items-center gap-2 mb-1 text-amber-300">
                                        <Wrench className="w-4 h-4" /> BelowNormal Priority
                                    </h3>
                                    <p className="text-xs text-zinc-400">
                                        All background kernels, builds, and LLM harnesses run at <code>BelowNormal</code> OS CPU priority (<code>scripts/set-llm-priority.ps1</code>) so foreground UI never stutters.
                                    </p>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-300 mb-3">
                                    All 13 Quick-Jump Dashboard Sections (Click to Jump)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {OMNI_CONSOLE_SECTIONS.map((sec) => (
                                        <Link
                                            key={sec.anchor}
                                            href={`/dashboard${sec.anchor}`}
                                            title={`Jump directly to ${sec.anchor} on the Omni-Console`}
                                            className="group rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 hover:border-cyan-500/40 hover:bg-zinc-900 transition-all"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-semibold text-sm text-zinc-100 group-hover:text-cyan-300">
                                                    {sec.label}
                                                </span>
                                                <code className="text-[11px] text-cyan-400/80 bg-cyan-950/30 px-1.5 py-0.5 rounded">
                                                    {sec.anchor}
                                                </code>
                                            </div>
                                            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                                                {sec.summary}
                                            </p>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="core-agents">
                    <div className="space-y-4">
                        <Card className="bg-zinc-950 border-zinc-800">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Database className="w-5 h-5 text-purple-400" />
                                    Three-Tier Memory Architecture &amp; Discipline Loop
                                </CardTitle>
                                <CardDescription>
                                    Every connected harness follows <strong>RECALL → DISCOVER → EXECUTE → PERSIST → VERIFY</strong>.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div className="p-4 rounded-lg border border-purple-900/40 bg-purple-950/10">
                                    <h4 className="font-bold text-purple-300 mb-1">L1 — Working Scratchpad</h4>
                                    <p className="text-xs text-zinc-300">
                                        Fast ephemeral key-value state (<code>memory_scratchpad_get/set/append</code>) for active goals, checkpoints, and live worker coordination.
                                    </p>
                                </div>
                                <div className="p-4 rounded-lg border border-cyan-900/40 bg-cyan-950/10">
                                    <h4 className="font-bold text-cyan-300 mb-1">L2 — Durable Vector + FTS Vault</h4>
                                    <p className="text-xs text-zinc-300">
                                        Cross-session facts stored via <code>POST /api/memory/facts/add</code> + <code>scripts/memory_local.py</code>, indexed with ~15ms SQLite FTS5, embeddings, and GraphRAG entity relations.
                                    </p>
                                </div>
                                <div className="p-4 rounded-lg border border-blue-900/40 bg-blue-950/10">
                                    <h4 className="font-bold text-blue-300 mb-1">L3 — Cold Session Archive</h4>
                                    <p className="text-xs text-zinc-300">
                                        Content-addressed gzipped transcripts (<code>.hypernexus/imported_sessions/archive/</code>) harvested across Claude, Codex, Pi, Muse, Gemini, and Antigravity.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="director">
                                <AccordionTrigger className="text-lg font-semibold text-yellow-400">The Director &amp; Command Center</AccordionTrigger>
                                <AccordionContent className="text-zinc-300">
                                    High-level orchestrator decomposing natural-language objectives into multi-agent squads and DAG workflows. Accessible from <code>#mission-control</code> and <code>#workflow-orchestration</code>.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="council">
                                <AccordionTrigger className="text-lg font-semibold text-purple-400">The Multi-Model Council</AccordionTrigger>
                                <AccordionContent className="text-zinc-300">
                                    Consensus engine running structured debates across Architect, Security Critic, and Systems Engineer personas, persisting binding architectural resolutions into L2 memory.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="supervisor">
                                <AccordionTrigger className="text-lg font-semibold text-blue-400">The Session Supervisor</AccordionTrigger>
                                <AccordionContent className="text-zinc-300">
                                    Monitors active CLI/GUI coding sessions, enforces RBAC/autonomy gates, and manages handoff/pickup continuity (<code>/api/agent-memory/handoff</code>).
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="healer">
                                <AccordionTrigger className="text-lg font-semibold text-emerald-400">The Immune Self-Healer</AccordionTrigger>
                                <AccordionContent className="text-zinc-300">
                                    Watches build, test, and MCP server health telemetry (<code>#system-recovery</code> &amp; <code>#healer-cognition</code>), isolating crash loops and proposing verified repairs.
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
                </TabsContent>

                <TabsContent value="workflows">
                    <div className="space-y-4">
                        <Card className="bg-zinc-950 border-zinc-800">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Monitor className="w-5 h-5 text-emerald-400" />
                                    Windows Win32 System Tray &amp; Deep-Link Protocol
                                </CardTitle>
                                <CardDescription>
                                    Automatically launched by <code>hypernexus serve</code> on Windows (<code>go/internal/systray/systray_windows.go</code>) with Explorer-restart recovery.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm text-zinc-300">
                                <ul className="list-disc list-inside space-y-1.5 text-xs text-zinc-300">
                                    <li><strong>Left-Click Tray Icon:</strong> Opens <code>http://127.0.0.1:7779/dashboard</code> in your default browser and surfaces the live native Event Log viewer.</li>
                                    <li><strong>Right-Click Context Menu:</strong> Displays the active kernel version header, the <strong>10 most recent clickable activity events</strong>, <em>Open Dashboard</em>, <em>Open Kernel API Index (:7778)</em>, <em>Show Full Event Logs</em>, and <em>Enable/Disable Auto-Start with Windows</em> (<code>HKCU\...\Run</code>).</li>
                                    <li><strong>Safe Shutdown Dialog:</strong> Choosing <em>Exit All HyperNexus Processes</em> prompts with three explicit choices: <strong>Yes</strong> (stops kernel + dashboard + watchdog/swarm background workers without touching sibling MCP stdio sessions), <strong>No</strong> (stops only the <code>:7778</code> kernel), or <strong>Cancel</strong>.</li>
                                    <li><strong>OS URI Protocol (<code>hypernexus://</code>):</strong> Trigger deep links from scripts or browsers (registered in <code>#prompts-deployments</code>), e.g. <code>hypernexus://open/dashboard</code> or <code>hypernexus://memory/search?q=systray</code>.</li>
                                </ul>
                            </CardContent>
                        </Card>

                        <Card className="bg-zinc-950 border-zinc-800">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Radio className="w-5 h-5 text-cyan-400" />
                                    Cross-Harness Session Bus &amp; Edge CDP 9222 Bridge
                                </CardTitle>
                                <CardDescription>
                                    Real-time peer coordination across local CLI/IDE agents and live browser AI tabs.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-zinc-300">
                                <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800 space-y-2">
                                    <h4 className="font-bold text-cyan-300 flex items-center gap-2">
                                        <Terminal className="w-4 h-4" /> Local Session Bus
                                    </h4>
                                    <p className="text-zinc-400">
                                        Register, heartbeat, and broadcast milestones across Antigravity, Muse Code, Claude Code, Codex, and Pi:
                                    </p>
                                    <pre className="bg-zinc-950 p-2 rounded border border-zinc-800 overflow-x-auto text-[11px] text-cyan-200">
{`node addons/shared/session-bus.mjs peers
node addons/shared/session-bus.mjs post --from <agent> --body "..."`}
                                    </pre>
                                </div>
                                <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800 space-y-2">
                                    <h4 className="font-bold text-purple-300 flex items-center gap-2">
                                        <GitBranch className="w-4 h-4" /> Edge CDP Port 9222 Bridge
                                    </h4>
                                    <p className="text-zinc-400">
                                        Inspect and exchange structured status updates with authenticated <code>muse.ai</code>, <code>gemini.google.com</code>, and <code>chatgpt.com</code> tabs:
                                    </p>
                                    <pre className="bg-zinc-950 p-2 rounded border border-zinc-800 overflow-x-auto text-[11px] text-purple-200">
{`node addons/shared/cdp-bridge.mjs list
node addons/shared/cdp-bridge.mjs read --target muse
node addons/shared/cdp-bridge.mjs send --target chatgpt "Status..."`}
                                    </pre>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="advanced">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="bg-zinc-950 border-zinc-800">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <GraduationCap className="w-5 h-5 text-pink-400" /> Progressive MCP &amp; Skill Assimilation
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-xs text-zinc-400 space-y-2">
                                <p>
                                    Instead of flooding LLM context windows with 400+ tool schemas, HyperNexus exposes compact discovery primitives (<code>mcp_list_servers</code>, <code>mcp_list_tools</code>, <code>/api/mcp/tools/search</code>) and hydrates full JSON schemas on demand via <code>mcp_call_tool</code>.
                                </p>
                                <p>
                                    New capabilities can also be assimilated from documentation into <code>.agent/skills/</code> and <code>.agents/skills/</code> for slash-skill invocation across all harnesses.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-zinc-950 border-zinc-800">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Shield className="w-5 h-5 text-orange-400" /> Ed25519 Licensing, RBAC &amp; Process Safety
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-xs text-zinc-400 space-y-2">
                                <p>
                                    Enterprise seats and offline air-gapped deployments are verified via Ed25519 cryptographic signatures in <code>#security-audit</code>, paired with Stripe seat checkout (<code>/api/billing/stripe/checkout</code>) and waterfall provider fallback in <code>#governance-billing</code>.
                                </p>
                                <p>
                                    <strong>Process Guardrail:</strong> Never kill <code>hypernexus.exe mcp</code> stdio processes when upgrading the HTTP kernel — target only the exact <code>:7778</code> listener PID so active IDE/CLI sessions stay connected uninterrupted.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
