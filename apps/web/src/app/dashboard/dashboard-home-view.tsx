import {
	getGroupedStartupBlockingReasons,
	getPrioritizedStartupBlockingReasons,
	getStartupBlockingReasonActions,
	getStartupBlockingReasonGroupImpactedChecks,
	getStartupBlockingReasonGroupPrimaryReason,
	getStartupBlockingReasonGroupPriorityCounts,
	getStartupBlockingReasonGroupSeverity,
	getStartupBlockingReasonGroupTopAction,
	getStartupBlockingReasonPriorityCounts,
	getStartupBlockingReasonPriorityLabel,
	getStartupBlockingReasonPriorityTone,
	getStartupBlockingReasons,
} from "./dashboard-startup-blocking";
import { trpc } from "../../utils/trpc";
import { useState } from "react";
import ProviderAuthBillingMatrix from "./billing/view";
import CommandDashboard from "./command/view";
// High-value views consolidated into single-page dashboard
import dynamic from "next/dynamic";
import { DashboardConsolidatedSections } from "./dashboard-consolidated-sections";
import { DashboardMissionControlHeader } from "./dashboard-mission-control-header";

// Below-fold sections are code-split with next/dynamic so the initial bundle
// only parses Mission Control + consolidated sections; each chunk loads on
// first render (anchors still resolve once mounted, sections render in order).
const sectionLoading = () => (
	<div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-xs text-slate-500">
		Loading section…
	</div>
);
const DashboardIntegrationsSection = dynamic(
	() => import("./dashboard-integrations-section").then((m) => m.DashboardIntegrationsSection),
	{ loading: sectionLoading },
);
const DashboardMemorySection = dynamic(
	() => import("./dashboard-memory-section").then((m) => m.DashboardMemorySection),
	{ loading: sectionLoading },
);
const DashboardMcpSection = dynamic(
	() => import("./dashboard-mcp-section").then((m) => m.DashboardMcpSection),
	{ loading: sectionLoading },
);
const DashboardResearchWorkflowsSection = dynamic(
	() => import("./dashboard-research-workflows-section").then((m) => m.DashboardResearchWorkflowsSection),
	{ loading: sectionLoading },
);
const DashboardGovernanceSecuritySection = dynamic(
	() => import("./dashboard-governance-security-section").then((m) => m.DashboardGovernanceSecuritySection),
	{ loading: sectionLoading },
);
const DashboardSystemRecoverySection = dynamic(
	() => import("./dashboard-system-recovery-section").then((m) => m.DashboardSystemRecoverySection),
	{ loading: sectionLoading },
);
const DashboardPromptsDeploymentsSection = dynamic(
	() => import("./dashboard-prompts-deployments-section").then((m) => m.DashboardPromptsDeploymentsSection),
	{ loading: sectionLoading },
);
const DashboardWorkflowOrchestrationSection = dynamic(
	() => import("./dashboard-workflow-orchestration-section").then((m) => m.DashboardWorkflowOrchestrationSection),
	{ loading: sectionLoading },
);

export interface DashboardStatusSummary {
	initialized: boolean;
	serverCount: number;
	toolCount: number;
	connectedCount: number;
}

export interface DashboardStartupStatus {
	status: string;
	ready: boolean;
	uptime: number;
	summary?: string;
	blockingReasons?: Array<{
		code: string;
		detail: string;
	}>;
	runtime?: {
		nodeEnv?: string | null;
		platform?: string | null;
		version?: string | null;
	};
	checks: {
		mcpAggregator: {
			ready: boolean;
			liveReady?: boolean;
			residentReady?: boolean;
			serverCount: number;
			connectedCount?: number;
			residentConnectedCount?: number;
			warmingServerCount?: number;
			failedWarmupServerCount?: number;
			initialization: {
				inProgress: boolean;
				initialized: boolean;
				lastStartedAt?: number;
				lastCompletedAt?: number;
				lastSuccessAt?: number;
				lastError?: string;
				connectedClientCount: number;
				configuredServerCount: number;
			} | null;
			persistedServerCount: number;
			persistedToolCount: number;
			configuredServerCount?: number;
			advertisedServerCount?: number;
			advertisedToolCount?: number;
			advertisedAlwaysOnServerCount?: number;
			advertisedAlwaysOnToolCount?: number;
			inventoryReady: boolean;
			inventorySource?: "database" | "config" | "empty";
			inventorySnapshotUpdatedAt?: string | null;
			warmupInProgress?: boolean;
		};
		configSync: {
			ready: boolean;
			status: {
				inProgress: boolean;
				lastStartedAt?: number;
				lastCompletedAt?: number;
				lastSuccessAt?: number;
				lastError?: string;
				lastServerCount: number;
				lastToolCount: number;
			} | null;
		};
		memory: {
			ready: boolean;
			initialized: boolean;
			agentMemory: boolean;
			claudeMem?: {
				ready?: boolean;
				enabled?: boolean;
				storeExists?: boolean;
				storePath?: string | null;
				totalEntries?: number;
				sectionCount?: number;
				defaultSectionCount?: number;
				presentDefaultSectionCount?: number;
				missingSections?: string[];
				lastUpdatedAt?: string | null;
			};
			tormentnexus?: {
				ready?: boolean;
				enabled?: boolean;
				storeExists?: boolean;
				storePath?: string | null;
				totalEntries?: number;
				sectionCount?: number;
				defaultSectionCount?: number;
				presentDefaultSectionCount?: number;
				missingSections?: string[];
				lastUpdatedAt?: string | null;
			};
		};
		browser: {
			ready: boolean;
			active: boolean;
			pageCount: number;
		};
		sessionSupervisor: {
			ready: boolean;
			sessionCount: number;
			restore: {
				lastRestoreAt?: number;
				restoredSessionCount: number;
				autoResumeCount: number;
			} | null;
		};
		extensionBridge: {
			ready: boolean;
			acceptingConnections?: boolean;
			clientCount: number;
			hasConnectedClients?: boolean;
		};
		executionEnvironment: {
			ready: boolean;
			preferredShellId?: string | null;
			preferredShellLabel?: string | null;
			shellCount: number;
			verifiedShellCount: number;
			toolCount: number;
			verifiedToolCount: number;
			harnessCount: number;
			verifiedHarnessCount: number;
			supportsPowerShell: boolean;
			supportsPosixShell: boolean;
			notes?: string[];
		};
	};
}

export interface DashboardServerSummary {
	name: string;
	status: string;
	toolCount: number;
	config: {
		command: string;
		args: string[];
		env: string[];
	};
}

export interface DashboardTrafficSummary {
	server: string;
	method: string;
	paramsSummary: string;
	latencyMs: number;
	success: boolean;
	timestamp: number;
	toolName?: string;
	error?: string;
}

export interface DashboardProviderSummary {
	provider: string;
	name: string;
	configured: boolean;
	authenticated?: boolean;
	authMethod?: string;
	tier: string;
	limit: number | null;
	used: number;
	remaining: number | null;
	resetDate?: string | null;
	rateLimitRpm?: number | null;
	availability?: string;
	lastError?: string | null;
}

export interface DashboardFallbackSummary {
	priority: number;
	provider: string;
	model?: string;
	reason: string;
}

export interface DashboardSessionLogSummary {
	timestamp: number;
	stream: "stdout" | "stderr" | "system";
	message: string;
}

export interface DashboardSessionSummary {
	id: string;
	name: string;
	cliType: string;
	workingDirectory: string;
	worktreePath?: string;
	autoRestart?: boolean;
	status:
		| "created"
		| "starting"
		| "running"
		| "stopping"
		| "stopped"
		| "restarting"
		| "error";
	restartCount: number;
	maxRestartAttempts: number;
	scheduledRestartAt?: number;
	lastActivityAt: number;
	lastError?: string;
	logs: DashboardSessionLogSummary[];
}

export interface DashboardHealerSummary {
	activePathogens: number;
	resolvedCount: number;
	successRate: number;
	lastHealTime: string | null;
	vaultRecordCount: number;
	isLive: boolean;
}

export interface DashboardInstallSurfaceArtifact {
	id: string;
	status: "ready" | "partial" | "missing";
}

export interface DashboardHomeViewProps {
	activeTab?: string;
	onTabChange?: (tabId: string) => void;
	generatedAtLabel: string;
	currentTimestamp?: number | null;
	isBootstrapping?: boolean;
	mcpStatus: DashboardStatusSummary;
	startupStatus: DashboardStartupStatus;
	servers: DashboardServerSummary[];
	traffic: DashboardTrafficSummary[];
	providers: DashboardProviderSummary[];
	fallbackChain: DashboardFallbackSummary[];
	sessions: DashboardSessionSummary[];
	healerStatus?: DashboardHealerSummary | null;
	installSurfaceArtifacts?: DashboardInstallSurfaceArtifact[] | null;
	onStartSession?: (sessionId: string) => void;
	onStopSession?: (sessionId: string) => void;
	onRestartSession?: (sessionId: string) => void;
	pendingSessionActionId?: string | null;
	children?: React.ReactNode;
}

export interface OverviewMetric {
	label: string;
	value: string;
	detail: string;
}

export interface StartupChecklistItem {
	label: string;
	ready: boolean;
	detail: string;
}

export interface StartupBlockingReasonView {
	code: string;
	detail: string;
}

export interface StartupBlockingReasonWithPriority
	extends StartupBlockingReasonView {
	priority: number;
}

export interface StartupBlockingReasonAction {
	href: string;
	label: string;
}

export interface StartupBlockingReasonPriorityCounts {
	high: number;
	medium: number;
	low: number;
}

export interface StartupBlockingReasonGroup {
	key: string;
	label: string;
	reasons: StartupBlockingReasonWithPriority[];
}

export interface StartupBlockingReasonImpactedCheck {
	key: string;
	label: string;
}


type DashboardStartupChecks = DashboardStartupStatus["checks"];

import {
	DEFAULT_DASHBOARD_STARTUP_CHECKS,
	DASHBOARD_BROWSER_EXTENSION_SURFACE_IDS,
	getDashboardBrowserExtensionArtifactSummary,
	getDashboardBrowserExtensionArtifactDetail,
	getStartupChecks,
	getAdvertisedServerCount,
	getAdvertisedToolCount,
	getCachedInventoryDetail,
	getResidentMcpDetail,
	getMemoryContextDetail,
	DEGRADED_PROVIDER_AVAILABILITIES,
	isProviderDegraded,
	sentenceCase,
	formatRelativeTimestamp,
	formatRestartCountdown,
	summarizeTrafficEvent,
	getQuotaUsagePercent,
	buildOverviewMetrics,
	buildStartupChecklist,
	buildDashboardAlerts,
	getServerTone,
	getSessionTone,
	getProviderTone,
	formatQuotaValue,
	formatFallbackLabel,
	getAlertTone,
} from "./dashboard-overview-model";


export function DashboardHomeView({
	activeTab = "console",
	generatedAtLabel,
	currentTimestamp,
	isBootstrapping = false,
	mcpStatus,
	startupStatus,
	servers,
	traffic,
	providers,
	fallbackChain,
	sessions,
	healerStatus,
	installSurfaceArtifacts,
	onStartSession,
	onStopSession,
	onRestartSession,
	pendingSessionActionId,
	onTabChange,
	children,
}: DashboardHomeViewProps) {
	// --- INTEGRATION HUB & TARGET SURFACES ---
	const browserStatusQuery = trpc.browser.status.useQuery(undefined, {
		refetchInterval: 10000,
	});
	const toolsClient = trpc.tools as any;
	const installArtifactsQuery = toolsClient?.detectInstallSurfaces?.useQuery
		? toolsClient.detectInstallSurfaces.useQuery(undefined, {
				refetchInterval: 10000,
			})
		: { data: [] };

	const [runningDiagnostics, setRunningDiagnostics] = useState(false);
	const [diagnosticsResult, setDiagnosticsResult] = useState<string | null>(
		null,
	);
	const [runningSchemaSync, setRunningSchemaSync] = useState(false);
	const [schemaSyncResult, setSchemaSyncResult] = useState<string | null>(null);
	const [shutdownLoading, setShutdownLoading] = useState(false);

	const triggerShutdown = async () => {
		if (
			!confirm(
				"Are you sure you want to shut down the HyperNexus server environment, watchdog, and Next.js web application?",
			)
		)
			return;
		setShutdownLoading(true);
		try {
			await fetch("/api/shutdown", { method: "POST" });
			alert("Shutdown command sent successfully. The console is closing.");
		} catch {
			alert("Error sending shutdown command.");
		}
		setShutdownLoading(false);
	};

	const triggerDiagnostics = async () => {
		setRunningDiagnostics(true);
		setDiagnosticsResult(null);
		try {
			const [healthRes, mcpRes] = await Promise.all([
				fetch("/api/go/health"),
				fetch("/api/go/api/mcp/status"),
			]);
			if (!healthRes.ok) {
				setDiagnosticsResult(
					`FAIL: Go kernel /health returned HTTP ${healthRes.status}`,
				);
				return;
			}
			const health = await healthRes.json();
			const mcp = mcpRes.ok ? await mcpRes.json() : null;
			const mcpData = mcp?.data ?? mcp ?? {};
			setDiagnosticsResult(
				`PASS: Go kernel v${health.version || "live"} OK (uptime ${health.uptimeSec ?? 0}s) · MCP ${mcpData.connectedCount ?? 0}/${mcpData.serverCount ?? 0} servers connected`,
			);
		} catch (e: any) {
			setDiagnosticsResult(
				`FAIL: Go kernel unreachable (${e?.message || "network error"})`,
			);
		} finally {
			setRunningDiagnostics(false);
		}
	};

	const triggerSchemaSync = async () => {
		setRunningSchemaSync(true);
		setSchemaSyncResult(null);
		try {
			const res = await fetch("/api/go/api/mcp/servers");
			if (!res.ok) {
				setSchemaSyncResult(
					`Schema check failed: /api/mcp/servers returned HTTP ${res.status}`,
				);
				return;
			}
			const payload = await res.json();
			const count = Array.isArray(payload?.data)
				? payload.data.length
				: Array.isArray(payload)
					? payload.length
					: 0;
			setSchemaSyncResult(
				`Verified catalog schema & synchronized ${count} MCP server topologies.`,
			);
		} catch (e: any) {
			setSchemaSyncResult(
				`Schema check failed: Go kernel unreachable (${e?.message || "error"})`,
			);
		} finally {
			setRunningSchemaSync(false);
		}
	};

	const [swarmRunning, setSwarmRunning] = useState(false);

	const triggerSwarmGen = () => {
		setSwarmRunning(true);
		setTimeout(() => {
			setSwarmRunning(false);
		}, 3000);
	};

	const overviewMetrics = buildOverviewMetrics(
		mcpStatus,
		sessions,
		providers,
		isBootstrapping,
	);
	const startupChecklist = buildStartupChecklist(
		startupStatus,
		isBootstrapping,
		installSurfaceArtifacts,
	);
	const startupBlockingReasons = isBootstrapping
		? []
		: getPrioritizedStartupBlockingReasons(
				getStartupBlockingReasons(startupStatus),
			);
	const startupBlockingReasonGroups = getGroupedStartupBlockingReasons(
		startupBlockingReasons,
	);
	const startupBlockingPriorityCounts = getStartupBlockingReasonPriorityCounts(
		startupBlockingReasons,
	);
	const startupBlockingActions = getStartupBlockingReasonActions(
		startupBlockingReasons,
	);
	const dashboardAlerts = buildDashboardAlerts(
		mcpStatus,
		startupStatus,
		servers,
		providers,
		sessions,
		isBootstrapping,
		installSurfaceArtifacts,
	);
	const startupSummary = isBootstrapping
		? "Connecting to live startup telemetry from core. Initial placeholders stay neutral until the first snapshot arrives."
		: startupStatus.summary?.trim();
	const startupToneClass = isBootstrapping
		? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
		: startupStatus.status === "degraded"
			? "border-amber-500/30 bg-amber-500/10 text-amber-200"
			: startupStatus.ready
				? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
				: "border-amber-500/30 bg-amber-500/10 text-amber-200";
	const startupLabel = isBootstrapping
		? "Connecting"
		: startupStatus.status === "degraded"
			? "Compat fallback"
			: startupStatus.ready
				? "Ready"
				: "Warming up";
	const routerStatusLabel = isBootstrapping
		? "Connecting"
		: mcpStatus.initialized
			? "Initialized"
			: "Offline";
	const routerStatusTone = isBootstrapping
		? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
		: mcpStatus.initialized
			? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
			: "border-rose-500/30 bg-rose-500/10 text-rose-200";
	return (
		<div className="min-h-screen bg-slate-950 text-slate-100">
			{/* HORIZONTAL TAB NAVIGATION */}
			<nav
				aria-label="Omni-console section navigation"
				className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800"
			>
				<div className="mx-auto max-w-7xl px-4 md:px-8">
					<div className="flex items-center justify-between h-14 gap-3">
						<div
							className="flex items-center gap-3 shrink-0"
							title="HyperNexus Go-Native AI Control Plane (:7778 sidecar · :7779 consolidated console)"
						>
							<span className="text-lg font-black text-cyan-400 font-mono">
								⚡ HyperNexus
							</span>
							<span className="text-[10px] font-mono text-slate-500 border border-slate-700 px-2 py-0.5 rounded hidden sm:inline">
								Kernel Console
							</span>
						</div>
						<div className="flex gap-1 overflow-x-auto">
							{[
								{
									href: "#mission-control",
									label: "🌌 Mission Control",
									tip: "Kernel readiness, quick diagnostics, command center, and emergency shutdown",
								},
								{
									href: "#memory-graphrag",
									label: "🧠 Memory",
									tip: "L1 scratchpad, L2 semantic vector memory, GraphRAG relations, and L3 cold archive",
								},
								{
									href: "#mcp-registry",
									label: "🔌 MCP & Tools",
									tip: "Progressive MCP tool routing, server catalog, JSON-RPC bridge, and parity gates",
								},
								{
									href: "#research-workflows",
									label: "🔬 Swarm & Research",
									tip: "Topic research center, swarm code-gen queue, and multi-agent swarm topology",
								},
								{
									href: "#workflow-orchestration",
									label: "🕸️ DAG Engine",
									tip: "Autonomous graph workflow library, live node visualizer, and Pause/Resume controls",
								},
								{
									href: "#system-recovery",
									label: "🛡️ Recovery & Sessions",
									tip: "DB integrity, external session import bridge, git chronicle, config.json, and immune healer",
								},
								{
									href: "#health-metrics",
									label: "📊 Health",
									tip: "Live kernel health, p50/p95 latency metrics, and pulse stall observability",
								},
								{
									href: "#skills-workflows",
									label: "⚡ Skills",
									tip: "Registered agent skills and RECALL → DISCOVER → EXECUTE → PERSIST → VERIFY workflows",
								},
								{
									href: "#security-audit",
									label: "🔒 Security",
									tip: "Ed25519 license authority, SSO, RBAC permission matrix, and append-only audit trail",
								},
								{
									href: "#healer-cognition",
									label: "🧬 Cognition",
									tip: "Cognitive brain state and autonomous self-healing diagnostics",
								},
								{
									href: "#prompts-deployments",
									label: "🚀 Deploy & Deep Links",
									tip: "Compiled Go prompts, static landing deployments, Cloud portal, and hypernexus:// OS protocol",
								},
								{
									href: "#integrations",
									label: "☁️ Integrations",
									tip: "Supported CLI/GUI coding harnesses, browser extension bridge, and User Manual",
								},
								{
									href: "#governance-billing",
									label: "💼 Billing & Quotas",
									tip: "Provider authentication, quota usage, fallback waterfall, and Stripe seat billing",
								},
							].map((item) => (
								<a
									key={item.href}
									href={item.href}
									title={item.tip}
									className="px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-cyan-400 hover:bg-slate-800/50 rounded transition-all whitespace-nowrap"
								>
									{item.label}
								</a>
							))}
						</div>
					</div>
				</div>
			</nav>

			{/* MAIN CONTENT AREA */}
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-8">
				{/* OMNI-CONSOLE CONTROL PANEL HEADER */}
				<DashboardMissionControlHeader
					routerStatusLabel={routerStatusLabel}
					routerStatusTone={routerStatusTone}
					startupLabel={startupLabel}
					startupToneClass={startupToneClass}
					generatedAtLabel={generatedAtLabel}
					runningDiagnostics={runningDiagnostics}
					setRunningDiagnostics={setRunningDiagnostics}
					diagnosticsResult={diagnosticsResult}
					setDiagnosticsResult={setDiagnosticsResult}
					runningSchemaSync={runningSchemaSync}
					setRunningSchemaSync={setRunningSchemaSync}
					schemaSyncResult={schemaSyncResult}
					setSchemaSyncResult={setSchemaSyncResult}
					shutdownLoading={shutdownLoading}
					triggerShutdown={triggerShutdown}
				/>

				{/* INTERACTIVE COMMAND CENTER */}
				<div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
					<details className="group" open>
						<summary className="list-none flex items-center justify-between cursor-pointer select-none">
							<div className="flex items-center gap-2">
								<h2 className="text-base font-semibold text-white">
									🎮 Interactive Command Center
								</h2>
								<span
									className="text-cyan-400 cursor-help text-xs"
									title="Execute slash commands and inspect available command handlers registered with HyperNexus Core."
								>
									💡
								</span>
							</div>
							<span className="text-xs font-mono text-cyan-400 border border-cyan-500/20 bg-cyan-500/5 px-2 py-0.5 rounded font-semibold uppercase group-open:hidden">
								Expand
							</span>
							<span className="text-xs font-mono text-slate-500 border border-slate-800 bg-slate-950 px-2 py-0.5 rounded font-semibold uppercase hidden group-open:inline">
								Collapse
							</span>
						</summary>
						<div className="mt-4 pt-4 border-t border-slate-800/60">
							<CommandDashboard />
						</div>
					</details>
				</div>

				<DashboardMemorySection />

				<DashboardMcpSection
					swarmRunning={swarmRunning}
					triggerSwarmGen={triggerSwarmGen}
				/>

				<DashboardResearchWorkflowsSection
					swarmRunning={swarmRunning}
					triggerSwarmGen={triggerSwarmGen}
				/>

				<DashboardWorkflowOrchestrationSection />

				<DashboardSystemRecoverySection
					runningDiagnostics={runningDiagnostics}
					triggerDiagnostics={triggerDiagnostics}
					diagnosticsResult={diagnosticsResult}
					runningSchemaSync={runningSchemaSync}
					triggerSchemaSync={triggerSchemaSync}
					schemaSyncResult={schemaSyncResult}
				/>

				<DashboardPromptsDeploymentsSection />

				{/* SECTION: BILLING & PROVIDER AUTH MATRIX */}
				<div
					id="governance-billing"
					className="scroll-mt-16 pt-8 border-t border-slate-800 space-y-8"
				>
					<ProviderAuthBillingMatrix />
				</div>

				<DashboardGovernanceSecuritySection />

				{/* SECTION 7: INTEGRATION HUB & TARGET SURFACES */}
				<DashboardIntegrationsSection
					installArtifacts={installArtifactsQuery.data}
					browserStatus={browserStatusQuery.data}
				>
					{children}
				</DashboardIntegrationsSection>
			</div>
		</div>
	);
}
export {
	getGroupedStartupBlockingReasons,
	getPrioritizedStartupBlockingReasons,
	getStartupBlockingReasonAction,
	getStartupBlockingReasonActions,
	getStartupBlockingReasons,
	getStartupBlockingReasonGroupImpactedChecks,
	getStartupBlockingReasonGroupPrimaryReason,
	getStartupBlockingReasonGroupPriorityCounts,
	getStartupBlockingReasonGroupSeverity,
	getStartupBlockingReasonGroupTopAction,
	getStartupBlockingReasonImpactedChecks,
	getStartupBlockingReasonPriority,
	getStartupBlockingReasonPriorityCounts,
	getStartupBlockingReasonPriorityLabel,
	getStartupBlockingReasonPriorityTone,
	getStartupBlockingReasonSubsystem,
	getStartupBlockingReasonTitle,
} from "./dashboard-startup-blocking";

export {
	buildDashboardAlerts,
	buildOverviewMetrics,
	buildStartupChecklist,
	formatRelativeTimestamp,
	formatRestartCountdown,
	getQuotaUsagePercent,
	summarizeTrafficEvent,
} from "./dashboard-overview-model";
export type { DashboardAlert } from "./dashboard-overview-model";
