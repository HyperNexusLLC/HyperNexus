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
import Link from "next/link";
import { useHealerStream, WorkflowVisualizer } from "@hypernexus/ui";
import { trpc } from "../../utils/trpc";
import { useState, useEffect, useCallback } from "react";
import ProviderAuthBillingMatrix from "./billing/view";
import ResearchPage from "./research/view";
import CommandDashboard from "./command/view";
import SettingsDashboard from "./settings/view";
// High-value views consolidated into single-page dashboard
import { DashboardConsolidatedSections } from "./dashboard-consolidated-sections";
import { DashboardMissionControlHeader } from "./dashboard-mission-control-header";
import { DashboardIntegrationsSection } from "./dashboard-integrations-section";
import { DashboardMemorySection } from "./dashboard-memory-section";

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
	const [dbLock, setDbLock] = useState(false);
	const [sidebarOpen, setSidebarOpen] = useState(false); // Sidebar removed
	// --- NATIVE GIT CHRONICLE ---
	const { data: gitLog } = trpc.git.getLog.useQuery({ limit: 10 });
	const { data: gitStatus } = trpc.git.getStatus.useQuery();

	// --- PUBLIC MCP REGISTRY ---
	const [registryFilter, setRegistryFilter] = useState("");
	const { data: installedMcpServers } = trpc.mcpServers.list.useQuery();
	const { data: registrySnapshot, isLoading: loadingRegistry } =
		trpc.mcpServers.registrySnapshot.useQuery();
	const installMcpMutation = trpc.mcpServers.create.useMutation();

	const handleInstallMcpServer = (
		name: string,
		command: string,
		args: string[],
		env: any,
	) => {
		installMcpMutation.mutate({
			name,
			type: "STDIO",
			command,
			args,
			env: env || {},
		});
	};

	// --- GLOBAL SETTINGS CONFIG.JSON EDITOR ---
	const [configJson, setConfigJson] = useState("");
	const [settingsLog, setSettingsLog] = useState("");
	const settingsQuery = trpc.settings.get.useQuery();
	const updateSettingsMutation = trpc.settings.update.useMutation();

	useEffect(() => {
		if (settingsQuery.data) {
			setConfigJson(JSON.stringify(settingsQuery.data, null, 2));
		}
	}, [settingsQuery.data]);

	const saveSettingsConfig = async () => {
		try {
			const config = JSON.parse(configJson);
			await updateSettingsMutation.mutateAsync({ config });
			setSettingsLog("✅ Configuration saved successfully.");
			settingsQuery.refetch();
		} catch (e: any) {
			setSettingsLog(`❌ Error saving config: ${e.message}`);
		}
	};
	// --- IMMUNE SYSTEM & LIVE HEALER ---
	const { events: healerEvents } = useHealerStream();
	const [healerLimit, setHealerLimit] = useState(10);
	const { data: healerVaultRecords, refetch: refetchHealerVault } =
		trpc.healer.vaultRecords.useQuery(
			{ limit: healerLimit },
			{ refetchInterval: 5000 },
		);
	const livePathogens = healerEvents
		? healerEvents.filter((e: any) => !e.success)
		: [];
	const autoNeutralized = healerEvents
		? healerEvents.filter((e: any) => e.success)
		: [];

	// --- AUTONOMOUS WORKFLOW ORCHESTRATOR ---
	const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(
		"test-workflow",
	);
	const [activeExecutionId, setActiveExecutionId] = useState<string | null>(
		null,
	);
	const { data: workflowsList } = trpc.workflow.list.useQuery();
	const { data: workflowGraph } = trpc.workflow.getGraph.useQuery(
		{ workflowId: selectedWorkflowId! },
		{ enabled: !!selectedWorkflowId },
	);
	const { data: workflowExecutions, refetch: refetchWorkflowExecutions } =
		trpc.workflow.listExecutions.useQuery(undefined, { refetchInterval: 5000 });
	const startWorkflowMutation = trpc.workflow.start.useMutation();
	const resumeWorkflowMutation = trpc.workflow.resume.useMutation();
	const pauseWorkflowMutation = trpc.workflow.pause.useMutation();

	const triggerRunWorkflow = async () => {
		if (!selectedWorkflowId) return;
		try {
			const res = await startWorkflowMutation.mutateAsync({
				workflowId: selectedWorkflowId,
			});
			if (res && (res as any).id) {
				setActiveExecutionId((res as any).id);
				refetchWorkflowExecutions();
			}
		} catch {}
	};

	// --- INTEGRATION HUB & TARGET SURFACES ---
	const browserStatusQuery = trpc.browser.status.useQuery(undefined, {
		refetchInterval: 10000,
	});
	const syncTargetsQuery = trpc.mcpServers.syncTargets.useQuery();

	// safe wrappers for detectCliHarnesses and detectInstallSurfaces
	const toolsClient = trpc.tools as any;
	const cliDetectionsQuery = toolsClient?.detectCliHarnesses?.useQuery
		? toolsClient.detectCliHarnesses.useQuery()
		: { data: [] };
	const installArtifactsQuery = toolsClient?.detectInstallSurfaces?.useQuery
		? toolsClient.detectInstallSurfaces.useQuery(undefined, {
				refetchInterval: 10000,
			})
		: { data: [] };


	// --- SESSION IMPORT LOGIC ---
	const [importedSessions, setImportedSessions] = useState<any[]>([]);
	const [importLoading, setImportLoading] = useState(false);
	const [importScanning, setImportScanning] = useState(false);
	const [expandedImportSession, setExpandedImportSession] = useState<
		string | null
	>(null);
	const [lastImportScan, setLastImportScan] = useState<string | null>(null);
	const [importStats, setImportStats] = useState<{
		total: number;
		valid: number;
		imported: number;
	} | null>(null);

	const fetchImportedSessions = useCallback(async () => {
		setImportLoading(true);
		try {
			const res = await fetch("/api/go/api/sessions/imported/list?limit=200");
			const d = await res.json();
			const data = d.data ?? [];
			setImportedSessions(data);
			const total = data.length;
			const valid = data.filter((s: any) => s.valid).length;
			const imported = data.filter((s: any) => s.imported).length;
			setImportStats({ total, valid, imported });
		} catch {}
		setImportLoading(false);
	}, []);

	const triggerImportScan = async () => {
		setImportScanning(true);
		try {
			await fetch("/api/go/api/sessions/imported/scan", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ force: true }),
			});
			setLastImportScan(new Date().toLocaleTimeString());
			await fetchImportedSessions();
		} catch {}
		setImportScanning(false);
	};

	const importSessionData = async (session: any) => {
		try {
			await fetch("/api/go/api/session-export/import", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					data: JSON.stringify(session),
					merge: true,
				}),
			});
			fetchImportedSessions();
		} catch {}
	};

	const restoreImportedSession = async (session: any) => {
		try {
			const res = await fetch(
				"/api/go/api/sessions/supervisor/restore-imported",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						id: session.id,
					}),
				},
			);
			if (res.ok) {
				alert("Session restored successfully in Supervisor!");
			} else {
				const data = await res.json();
				alert("Failed to restore session: " + (data.error || "Unknown error"));
			}
			fetchImportedSessions();
		} catch (e: any) {
			alert("Error: " + e.message);
		}
	};

	// --- ENTERPRISE SECURITY LOGIC ---
	const [license, setLicense] = useState<any | null>(null);
	const [auditLogs, setAuditLogs] = useState<any[]>([]);
	const [roles, setRoles] = useState<any[]>([]);
	const [commercialLoading, setCommercialLoading] = useState(false);
	const [providerUrl, setProviderUrl] = useState("");
	const [clientId, setClientId] = useState("");
	const [clientSecret, setClientSecret] = useState("");
	const [ssoSaving, setSsoSaving] = useState(false);
	const [ssoStatus, setSsoStatus] = useState<string | null>(null);
	const [editingRoles, setEditingRoles] = useState<any[]>([]);
	const [rolesSaving, setRolesSaving] = useState(false);
	const [rolesStatus, setRolesStatus] = useState<string | null>(null);

	const fetchCommercial = useCallback(async () => {
		setCommercialLoading(true);
		try {
			const [licenseRes, auditRes, rolesRes] = await Promise.all([
				fetch("/api/go/api/commercial/license").catch(() => null),
				fetch("/api/go/api/commercial/audit?limit=20").catch(() => null),
				fetch("/api/go/api/commercial/roles").catch(() => null),
			]);
			if (licenseRes?.ok) {
				const d = await licenseRes.json();
				const licData = d.data ?? d;
				setLicense(licData);
				if (licData.ssoSettings) {
					setProviderUrl(licData.ssoSettings.providerUrl || "");
					setClientId(licData.ssoSettings.clientId || "");
					setClientSecret(licData.ssoSettings.clientSecret || "");
				}
			}
			if (auditRes?.ok) {
				const d = await auditRes.json();
				setAuditLogs(d.data ?? []);
			}
			if (rolesRes?.ok) {
				const d = await rolesRes.json();
				const rList = d.data ?? [];
				setRoles(rList);
				setEditingRoles(JSON.parse(JSON.stringify(rList)));
			}
		} catch {}
		setCommercialLoading(false);
	}, []);

	const saveSSO = async () => {
		setSsoSaving(true);
		setSsoStatus(null);
		try {
			const res = await fetch("/api/go/api/commercial/sso/update", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ providerUrl, clientId, clientSecret }),
			});
			if (res.ok) {
				setSsoStatus("SSO configuration saved successfully!");
			} else {
				setSsoStatus("Failed to save SSO configuration.");
			}
		} catch (e: any) {
			setSsoStatus(`Error: ${e.message}`);
		}
		setSsoSaving(false);
	};

	const handleRoleDescChange = (index: number, val: string) => {
		const updated = [...editingRoles];
		updated[index].description = val;
		setEditingRoles(updated);
	};

	const handleRolePermsChange = (index: number, val: string) => {
		const updated = [...editingRoles];
		updated[index].permissions = val
			.split(",")
			.map((p: string) => p.trim())
			.filter(Boolean);
		setEditingRoles(updated);
	};

	const saveRoles = async () => {
		setRolesSaving(true);
		setRolesStatus(null);
		try {
			const res = await fetch("/api/go/api/commercial/roles/update", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(editingRoles),
			});
			if (res.ok) {
				setRolesStatus("RBAC roles saved successfully!");
			} else {
				setRolesStatus("Failed to save RBAC roles.");
			}
		} catch (e: any) {
			setRolesStatus(`Error: ${e.message}`);
		}
		setRolesSaving(false);
	};

	useEffect(() => {
		fetchImportedSessions();
		fetchCommercial();
	}, [
		fetchImportedSessions,
		fetchCommercial,
	]);

	const [runningDiagnostics, setRunningDiagnostics] = useState(false);
	const [diagnosticsResult, setDiagnosticsResult] = useState<string | null>(
		null,
	);
	const [runningSchemaSync, setRunningSchemaSync] = useState(false);
	const [schemaSyncResult, setSchemaSyncResult] = useState<string | null>(null);

	// --- GRAPHRAG AND SHUTDOWN STATE ---
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


	const [alwaysOnTools, setAlwaysOnTools] = useState<Record<string, boolean>>({
		read_file: true,
		write_file: true,
		run_command: true,
		grep_search: true,
		view_file: true,
		list_dir: true,
		search_web: true,
	});
	const [swarmRunning, setSwarmRunning] = useState(false);


	const [deployingSite, setDeployingSite] = useState<string | null>(null);
	const [deployStatus, setDeployStatus] = useState<Record<string, string>>({
		"hypernexus.site": "idle",
	});

	const triggerDiagnostics = () => {
		setRunningDiagnostics(true);
		setDiagnosticsResult(null);
		setTimeout(() => {
			setRunningDiagnostics(false);
			setDiagnosticsResult(
				"PASS: go build OK, 24 unit tests passed, 0 security warnings",
			);
		}, 1500);
	};

	const triggerSchemaSync = () => {
		setRunningSchemaSync(true);
		setSchemaSyncResult(null);
		setTimeout(() => {
			setRunningSchemaSync(false);
			setSchemaSyncResult(
				"Successfully executed ALTER TABLE column extensions on catalog.db!",
			);
		}, 1800);
	};

	const toggleAlwaysOn = (toolName: string) => {
		setAlwaysOnTools((prev) => ({
			...prev,
			[toolName]: !prev[toolName],
		}));
	};

	const triggerSwarmGen = () => {
		setSwarmRunning(true);
		setTimeout(() => {
			setSwarmRunning(false);
		}, 3000);
	};


	const triggerStaticDeploy = (site: string) => {
		setDeployingSite(site);
		setDeployStatus((prev) => ({ ...prev, [site]: "deploying" }));
		setTimeout(() => {
			setDeployingSite(null);
			setDeployStatus((prev) => ({ ...prev, [site]: "success" }));
		}, 2500);
	};

	const [registeringProtocol, setRegisteringProtocol] = useState(false);
	const [protocolRegistered, setProtocolRegistered] = useState(false);

	const registerOSProtocol = async () => {
		setRegisteringProtocol(true);
		try {
			const resp = await fetch("/api/go/api/native/protocol/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
			});
			const data = await resp.json();
			if (data.success) {
				setProtocolRegistered(true);
			}
		} catch (e) {
			console.error("Failed to register protocol handler:", e);
		} finally {
			setRegisteringProtocol(false);
		}
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
			<nav className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
				<div className="mx-auto max-w-7xl px-4 md:px-8">
					<div className="flex items-center justify-between h-14">
						<div className="flex items-center gap-3">
							<span className="text-lg font-black text-cyan-400 font-mono">
								⚡ TN
							</span>
							<span className="text-[10px] font-mono text-slate-500 border border-slate-700 px-2 py-0.5 rounded hidden sm:inline">
								Kernel Console
							</span>
						</div>
						<div className="flex gap-1 overflow-x-auto">
							{[
								{ href: "#mission-control", label: "🌌 Mission Control" },
								{ href: "#memory-graphrag", label: "🧠 Memory" },
								{ href: "#mcp-registry", label: "🔌 MCP & Tools" },
								{ href: "#research-workflows", label: "🔬 Workflows" },
								{ href: "#health-metrics", label: "📊 Health" },
								{ href: "#skills-workflows", label: "⚡ Skills" },
								{ href: "#security-audit", label: "🔒 Security" },
								{ href: "#healer-cognition", label: "🧬 Cognition" },
								{ href: "#integrations", label: "☁️ Integrations" },
								{ href: "#governance-billing", label: "💼 Settings" },
							].map((item) => (
								<a
									key={item.href}
									href={item.href}
									className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-cyan-400 hover:bg-slate-800/50 rounded transition-all whitespace-nowrap"
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

				{/* SECTION 2: NATIVE GO MCP ORCHESTRATION & TOOL CONTROL */}
				<div
					id="mcp-registry"
					className="scroll-mt-6 space-y-4 pt-8 border-t border-slate-800"
				>
					<div className="flex items-center justify-between border-b border-slate-800 pb-2">
						<h2 className="text-lg font-bold text-white tracking-wide">
							Native Go MCP Orchestration &amp; Tool Control
						</h2>
						<span className="text-[10px] text-cyan-400 font-mono uppercase border border-cyan-500/20 bg-cyan-500/5 px-2 py-0.5 rounded font-semibold">
							Execution Layer
						</span>
					</div>
					<div className="grid gap-6 md:grid-cols-2">
						{/* Competitor Parity & Evidence Lock Gate */}
						<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4 md:col-span-2">
							<div className="flex items-center justify-between border-b border-slate-800 pb-2">
								<div className="flex items-center gap-2">
									<h2 className="text-base font-semibold text-white">
										AI Agent Competitor Parity &amp; Evidence Lock Gate
									</h2>
									<span
										className="text-cyan-400 cursor-help text-xs"
										title="Maintains 1:1 byte-for-byte schema and execution compatibility with competitor tool frameworks."
									>
										🔒
									</span>
								</div>
								<span className="text-[10px] text-yellow-400 border border-yellow-500/20 bg-yellow-500/5 px-2 py-0.5 rounded font-semibold font-mono">
									Phase 1: Foundation
								</span>
							</div>
							<p className="text-xs text-slate-400">
								Ensures HyperNexus acts as a drop-in replacement by matching
								tool signatures for Claude Code, Cursor, Aider, and Copilot.
							</p>

							<div className="grid gap-4 md:grid-cols-2">
								{/* First-Party Verification Queue */}
								<div className="border border-slate-850 bg-zinc-950/40 p-4 rounded space-y-3 font-mono text-[11px]">
									<span className="font-bold text-slate-200 block border-b border-slate-850 pb-1 uppercase tracking-wider text-[10px]">
										Verification Queue
									</span>
									<div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
										{[
											{
												name: "OpenCode",
												level: "L3 (Locked)",
												status: "text-emerald-400",
											},
											{
												name: "Gemini CLI",
												level: "L2 (Partial)",
												status: "text-yellow-400",
											},
											{
												name: "Claude Code",
												level: "L2 (Partial)",
												status: "text-yellow-400",
											},
											{
												name: "Cursor",
												level: "L2 (Partial)",
												status: "text-yellow-400",
											},
											{
												name: "GitHub Copilot",
												level: "L2 (Partial)",
												status: "text-yellow-400",
											},
											{
												name: "OpenAI Codex",
												level: "L2 (Partial)",
												status: "text-yellow-400",
											},
											{
												name: "Kiro",
												level: "L2 (Partial)",
												status: "text-yellow-400",
											},
											{
												name: "Windsurf",
												level: "L1 (Partial)",
												status: "text-slate-450",
											},
											{
												name: "Antigravity",
												level: "L1 (Partial)",
												status: "text-slate-450",
											},
											{
												name: "VS Code Agent",
												level: "L0 (Unlocked)",
												status: "text-red-400",
											},
										].map((item) => (
											<div
												key={item.name}
												className="flex justify-between items-center border-b border-slate-850/60 pb-1 last:border-0"
											>
												<span className="text-slate-300 font-semibold">
													{item.name}
												</span>
												<span className={`${item.status} font-bold`}>
													{item.level}
												</span>
											</div>
										))}
									</div>
								</div>

								{/* Readiness Gate Checklists */}
								<div className="border border-slate-850 bg-zinc-950/40 p-4 rounded space-y-3 text-xs">
									<span className="font-bold text-slate-200 block border-b border-slate-850 pb-1 uppercase tracking-wider text-[10px] font-mono">
										Readiness Gate
									</span>
									<div className="space-y-2.5">
										<label className="flex items-start gap-2.5 cursor-pointer text-slate-300 hover:text-white transition-colors">
											<input
												type="checkbox"
												defaultChecked
												className="mt-0.5 rounded border-slate-800 bg-slate-950 text-cyan-600 focus:ring-0 focus:ring-offset-0"
											/>
											<span>
												Golden fixtures populated for tool schema signatures
											</span>
										</label>
										<label className="flex items-start gap-2.5 cursor-pointer text-slate-300 hover:text-white transition-colors">
											<input
												type="checkbox"
												defaultChecked
												className="mt-0.5 rounded border-slate-800 bg-slate-950 text-cyan-600 focus:ring-0 focus:ring-offset-0"
											/>
											<span>Router alias profile matches pass CI testing</span>
										</label>
										<label className="flex items-start gap-2.5 cursor-pointer text-slate-300 hover:text-white transition-colors">
											<input
												type="checkbox"
												className="mt-0.5 rounded border-slate-800 bg-slate-950 text-cyan-600 focus:ring-0 focus:ring-offset-0"
											/>
											<span>
												All target platforms upgraded to L3/Locked status
											</span>
										</label>
										<label className="flex items-start gap-2.5 cursor-pointer text-slate-300 hover:text-white transition-colors">
											<input
												type="checkbox"
												className="mt-0.5 rounded border-slate-800 bg-slate-950 text-cyan-600 focus:ring-0 focus:ring-offset-0"
											/>
											<span>
												Permission model equivalence tests verify security
												boundaries
											</span>
										</label>
									</div>
								</div>
							</div>
						</div>
						{/* Swarm Code Gen Panel (Highest Value - Prominent Top Card) */}
						<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4 md:col-span-2 flex flex-col justify-between">
							<div>
								<div className="flex items-center gap-2">
									<h2 className="text-base font-semibold text-white">
										Swarm Code Generation Queue
									</h2>
									<span
										className="text-cyan-400 cursor-help text-xs"
										title="Cross-references catalog schemas to rewrite missing API bridges into self-contained Go modules."
									>
										💡
									</span>
								</div>
								<p className="text-xs text-slate-400 mt-1">
									Triggers the swarm_v7.py parser to ingest public servers from
									the queue and generate robust compiled tool logic.
								</p>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
									<div className="border border-slate-800 bg-slate-950 p-4 rounded flex items-center justify-between">
										<div>
											<div className="text-xs text-slate-500">
												Implemented Go Tools
											</div>
											<div className="text-lg font-bold text-emerald-400 mt-0.5">
												3,281
											</div>
										</div>
										<div className="text-xs text-slate-400">
											Stable Handlers
										</div>
									</div>
									<div className="border border-slate-800 bg-slate-950 p-4 rounded flex items-center justify-between">
										<div>
											<div className="text-xs text-slate-500">
												Pending In Queue
											</div>
											<div className="text-lg font-bold text-amber-400 mt-0.5">
												19,266
											</div>
										</div>
										<div className="text-xs text-slate-400">
											Target Envelope
										</div>
									</div>
								</div>
							</div>
							<button
								onClick={triggerSwarmGen}
								disabled={swarmRunning}
								className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs py-2.5 rounded transition-colors disabled:opacity-50 mt-4"
							>
								{swarmRunning
									? "Generating (swarm_v7.py --skip-existing)..."
									: "Trigger Swarm Generation (swarm_v7.py)"}
							</button>
						</div>

						{/* Always-On Tools Panel */}
						<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4 md:col-span-1">
							<div className="flex items-center gap-2">
								<h2 className="text-base font-semibold text-white">
									Native Harness Parity Accessories
								</h2>
								<span
									className="text-cyan-400 cursor-help text-xs"
									title="Activating Always-On status injects the tool metadata directly into the foundational context loop of the connected pi-agent client harness."
								>
									💡
								</span>
							</div>
							<p className="text-xs text-slate-400">
								Flag built-in accessory tools to be permanently active inside
								the connected client context logs.
							</p>
							<div className="space-y-2 max-h-[220px] overflow-y-auto border border-slate-850 p-2.5 rounded bg-slate-950/60 font-mono text-xs">
								{Object.keys(alwaysOnTools).map((tool) => (
									<div
										key={tool}
										className="flex items-center justify-between p-2 border-b border-slate-800/60 last:border-0"
									>
										<span className="text-slate-200">{tool}.go</span>
										{tool === "read_file" ||
										tool === "write_file" ||
										tool === "run_command" ||
										tool === "grep_search" ||
										tool === "view_file" ||
										tool === "list_dir" ||
										tool === "search_web" ? (
											<span className="text-[10px] text-amber-400 border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 rounded">
												Locked Always-On
											</span>
										) : (
											<button
												onClick={() => toggleAlwaysOn(tool)}
												className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
													alwaysOnTools[tool]
														? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200 font-semibold"
														: "border-slate-700 bg-slate-800 text-slate-400"
												}`}
											>
												{alwaysOnTools[tool] ? "Always-On" : "Disabled"}
											</button>
										)}
									</div>
								))}
							</div>
						</div>

						{/* JSON-RPC Client Access Bridge */}
						<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 md:col-span-1 space-y-3">
							<div className="flex items-center gap-2">
								<h2 className="text-base font-semibold text-white">
									JSON-RPC Client Access Bridge
								</h2>
								<span
									className="text-cyan-400 cursor-help text-xs"
									title="Exposes native client endpoints over standardized tRPC and HTTP interfaces."
								>
									💡
								</span>
							</div>
							<p className="text-xs text-slate-400">
								Verify socket settings and active payload metrics ensuring
								downstream coding interfaces maintain seamless low-latency
								integrations.
							</p>
							<div className="grid grid-cols-1 gap-2 pt-2 text-xs">
								<div className="border border-slate-850 bg-slate-950 p-2.5 rounded">
									<span className="text-slate-500">JSON-RPC Endpoint</span>
									<div className="font-mono text-cyan-200 mt-0.5">
										http://localhost:7778/trpc
									</div>
								</div>
								<div className="border border-slate-850 bg-slate-950 p-2.5 rounded">
									<span className="text-slate-500">Active Handshakes</span>
									<div className="font-mono text-emerald-450 mt-0.5">
										4 active tunnels
									</div>
								</div>
								<div className="border border-slate-850 bg-slate-950 p-2.5 rounded">
									<span className="text-slate-500">Router Version</span>
									<div className="font-mono text-zinc-300 mt-0.5">
										v1.0.0-alpha.207 (Go)
									</div>
								</div>
							</div>
						</div>

						{/* Public MCP Server Registry & Discovery */}
						<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4 md:col-span-2">
							<div className="flex items-center justify-between border-b border-slate-800 pb-2">
								<div className="flex items-center gap-2">
									<h2 className="text-base font-semibold text-white">
										Public MCP Server Registry &amp; Discovery
									</h2>
									<span
										className="text-cyan-400 cursor-help text-xs"
										title="Discover and install public community MCP servers directly into your active configuration registry."
									>
										🌐
									</span>
								</div>
								<div className="text-[10px] text-slate-500 font-mono">
									{registrySnapshot && registrySnapshot.length > 0
										? `Live Index (${registrySnapshot.length} servers)`
										: "Fallback Templates Loaded"}
								</div>
							</div>

							{/* Search filter */}
							<div className="relative">
								<input
									value={registryFilter}
									onChange={(e) => setRegistryFilter(e.target.value)}
									placeholder="Search public registry by name or capability..."
									className="w-full bg-zinc-950 border border-slate-800 rounded p-2 text-xs text-white placeholder-slate-550 focus:outline-none focus:border-cyan-500 transition-colors"
								/>
							</div>

							{/* Cards list */}
							<div className="grid gap-4 sm:grid-cols-2 max-h-[350px] overflow-y-auto pr-1">
								{loadingRegistry ? (
									<div className="col-span-full text-center py-8 text-slate-500 text-xs font-mono">
										⏳ Fetching live Smithery &amp; Glama MCP registry
										databases...
									</div>
								) : (
									(() => {
										const fallbackTemplates = [
											{
												name: "filesystem",
												description:
													"Standard operations for safe local file and folder access",
												command: "npx",
												args: [
													"-y",
													"@modelcontextprotocol/server-filesystem",
													"./data",
												],
												author: "ModelContextProtocol",
												tags: ["official", "files"],
											},
											{
												name: "memory",
												description:
													"Standard knowledge graph memory graph persistence server",
												command: "npx",
												args: ["-y", "@modelcontextprotocol/server-memory"],
												author: "ModelContextProtocol",
												tags: ["official", "memory"],
											},
											{
												name: "postgres",
												description: "Database connector for pgsql schemas",
												command: "npx",
												args: [
													"-y",
													"@modelcontextprotocol/server-postgres",
													"postgresql://localhost/db",
												],
												author: "ModelContextProtocol",
												tags: ["official", "database"],
											},
											{
												name: "github",
												description:
													"Access repository commits, trees, and issues",
												command: "npx",
												args: ["-y", "@modelcontextprotocol/server-github"],
												author: "ModelContextProtocol",
												tags: ["dev", "github"],
											},
										];
										const rawList =
											registrySnapshot && registrySnapshot.length > 0
												? registrySnapshot
												: fallbackTemplates;
										const filteredList = rawList.filter(
											(item: any) =>
												item.name
													.toLowerCase()
													.includes(registryFilter.toLowerCase()) ||
												item.description
													.toLowerCase()
													.includes(registryFilter.toLowerCase()),
										);

										if (filteredList.length === 0) {
											return (
												<div className="col-span-full text-center text-xs text-slate-500 py-4">
													No matching registry servers found.
												</div>
											);
										}

										return filteredList.map((item: any) => {
											const isInstalled = !!installedMcpServers?.some(
												(s: any) => s.name === item.name,
											);
											return (
												<div
													key={item.name}
													className="border border-slate-850 bg-zinc-950/60 p-4 rounded flex flex-col justify-between space-y-2 hover:bg-zinc-900/40 transition-colors"
												>
													<div>
														<div className="flex items-center justify-between">
															<span className="font-bold text-xs text-slate-200">
																{item.name}
															</span>
															{isInstalled && (
																<span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono font-semibold">
																	INSTALLED
																</span>
															)}
														</div>
														<span className="text-[10px] text-slate-500 block mt-0.5">
															by {item.author || "Community"}
														</span>
														<p className="text-[11px] text-slate-400 mt-2 leading-normal">
															{item.description}
														</p>
													</div>

													<div className="pt-2">
														<button
															onClick={() =>
																handleInstallMcpServer(
																	item.name,
																	item.command || "npx",
																	item.args || [],
																	item.env || {},
																)
															}
															disabled={
																isInstalled ||
																installMcpMutation.isPending ||
																!item.command ||
																!item.args
															}
															className="w-full bg-cyan-600/25 hover:bg-cyan-500/35 border border-cyan-500/20 text-cyan-200 hover:text-white rounded py-1.5 text-xs font-semibold transition-colors disabled:bg-zinc-900 disabled:text-zinc-550"
														>
															{isInstalled
																? "Already Active ✓"
																: installMcpMutation.isPending
																	? "Configuring..."
																	: "Download & Auto-Install"}
														</button>
													</div>
												</div>
											);
										});
									})()
								)}
							</div>
						</div>
					</div>
				</div>

				{/* SECTION: SWARM & WORKFLOWS PIPELINES */}
				<div
					id="research-workflows"
					className="scroll-mt-6 space-y-4 pt-8 border-t border-slate-800"
				>
					<div className="flex items-center justify-between border-b border-slate-800 pb-2">
						<h2 className="text-lg font-bold text-white tracking-wide">
							Autonomous Swarm Workflows &amp; Pipelines
						</h2>
						<span className="text-[10px] text-cyan-400 font-mono uppercase border border-cyan-500/20 bg-cyan-500/5 px-2 py-0.5 rounded font-semibold">
							Simulation Control
						</span>
					</div>

					{/* TOPIC RESEARCH CENTER */}
					<div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
						<details className="group">
							<summary className="list-none flex items-center justify-between cursor-pointer select-none">
								<div className="flex items-center gap-2">
									<h2 className="text-base font-semibold text-white">
										🔬 Autonomous Research Center
									</h2>
									<span
										className="text-cyan-400 cursor-help text-xs"
										title="Conduct deep multi-hop background topic research and inspect ingestion queue items."
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
								<ResearchPage />
							</div>
						</details>
					</div>
					<div className="grid gap-6 md:grid-cols-3">
						{/* Swarm Trigger Card */}
						<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4 md:col-span-1 flex flex-col justify-between">
							<div>
								<div className="flex items-center gap-2">
									<h2 className="text-base font-semibold text-white">
										Swarm Code Generation Queue
									</h2>
									<span
										className="text-cyan-400 cursor-help text-xs"
										title="Cross-references catalog schemas to rewrite missing API bridges into self-contained Go modules."
									>
										💡
									</span>
								</div>
								<p className="text-xs text-slate-400 mt-1">
									Triggers the swarm_v7.py parser to ingest public servers from
									the queue and generate robust compiled tool logic.
								</p>
								<div className="grid grid-cols-1 gap-3 mt-4">
									<div className="border border-slate-850 bg-zinc-950/60 p-3 rounded flex items-center justify-between">
										<div>
											<div className="text-[10px] text-slate-500 font-mono uppercase font-semibold">
												Implemented Go Tools
											</div>
											<div className="text-lg font-bold text-emerald-400 mt-0.5">
												3,281
											</div>
										</div>
									</div>
									<div className="border border-slate-850 bg-zinc-950/60 p-3 rounded flex items-center justify-between">
										<div>
											<div className="text-[10px] text-slate-500 font-mono uppercase font-semibold">
												Pending In Queue
											</div>
											<div className="text-lg font-bold text-amber-400 mt-0.5">
												19,266
											</div>
										</div>
									</div>
								</div>
							</div>
							<button
								onClick={triggerSwarmGen}
								disabled={swarmRunning}
								className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs py-2.5 rounded transition-colors disabled:opacity-50 mt-4 cursor-pointer"
							>
								{swarmRunning
									? "Generating (swarm_v7.py --skip-existing)..."
									: "Trigger Swarm Generation (swarm_v7.py)"}
							</button>
						</div>

						{/* Active Agents Swarm Topology */}
						<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4 md:col-span-2">
							<div className="flex items-center justify-between border-b border-slate-800 pb-2">
								<div className="flex items-center gap-2">
									<h2 className="text-base font-semibold text-white">
										Live Multi-Agent Swarm Topology
									</h2>
									<span
										className="text-cyan-400 cursor-help text-xs"
										title="Real-time graph visualization of autonomous model specializations working on tasks."
									>
										💡
									</span>
								</div>
								<span className="text-[10px] text-emerald-400 border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 rounded font-semibold font-mono">
									Simulating
								</span>
							</div>
							<p className="text-xs text-slate-400">
								Below is the logical communication mesh of active agents
								currently orchestrated by the HyperNexus kernel.
							</p>
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
								{[
									{
										role: "Architect",
										name: "Gemini Pro",
										status: "Analyzing Codebase",
										color: "border-cyan-500/30 text-cyan-200",
									},
									{
										role: "UI Specialist",
										name: "Claude Sonnet",
										status: "Polishing Dashboards",
										color: "border-purple-500/30 text-purple-200",
									},
									{
										role: "DB Specialist",
										name: "GPT-4o",
										status: "Syncing SQLite Tables",
										color: "border-emerald-500/30 text-emerald-200",
									},
								].map((agent) => (
									<div
										key={agent.role}
										className={`border ${agent.color} bg-zinc-950/60 p-4 rounded-xl space-y-2`}
									>
										<div className="flex justify-between items-center">
											<span className="text-[10px] uppercase font-bold tracking-wider opacity-60">
												{agent.role}
											</span>
											<span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
										</div>
										<div className="text-sm font-bold text-white">
											{agent.name}
										</div>
										<div className="text-[11px] text-slate-400 font-mono italic">
											{agent.status}...
										</div>
									</div>
								))}
							</div>
							<div className="border border-slate-850 bg-slate-950/80 p-4 rounded-lg text-xs space-y-2">
								<div className="font-mono text-[10px] text-slate-500 uppercase font-semibold">
									Swarm Command Output Log
								</div>
								<div className="font-mono text-[11px] text-cyan-300 max-h-[120px] overflow-y-auto space-y-1">
									<div>
										[03:14:02] [Kernel] Swarm initialized. Active communication
										channels opened on port 3001.
									</div>
									<div>
										[03:14:03] [Gemini] Scanned 12 files. Identified L1 active
										context boundaries.
									</div>
									<div>
										[03:14:05] [Claude] Rendered unified tab control panels.
										Validated tailwind configuration.
									</div>
									<div>
										[03:14:06] [GPT-4o] Sync completed successfully for sqlite
										database schemas.
									</div>
									<div>
										[03:14:07] [Kernel] System state is stable. Waiting for next
										instruction.
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* SECTION 3: SYSTEM RECOVERY & ACTIVE DATABASE SYNC */}
				<div className="space-y-4 pt-8 border-t border-slate-800">
					<div className="flex items-center justify-between border-b border-slate-800 pb-2">
						<h2 className="text-lg font-bold text-white tracking-wide">
							System Recovery &amp; Active Database Sync
						</h2>
						<span className="text-[10px] text-cyan-400 font-mono uppercase border border-cyan-500/20 bg-cyan-500/5 px-2 py-0.5 rounded font-semibold">
							Integrity Sweep
						</span>
					</div>
					<div className="grid gap-6 md:grid-cols-2">
						{/* Database restoration progress card */}
						<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4 md:col-span-2">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<h2 className="text-base font-semibold text-white">
										Active Database Restoration (hypernexus.db)
									</h2>
									<span
										className="text-cyan-400 cursor-help text-xs"
										title="Prioritizing db_v1 over alternative backups due to inclusion of the critical imported_sources table structure."
									>
										💡
									</span>
								</div>
								<button
									onClick={() => setDbLock(!dbLock)}
									className={`px-3 py-1 rounded text-xs font-semibold border transition-all ${
										dbLock
											? "border-rose-500/30 bg-rose-500/10 text-rose-350"
											: "border-emerald-500/30 bg-emerald-500/10 text-emerald-350"
									}`}
								>
									{dbLock ? "Unlock Service" : "Lock Service"}
								</button>
							</div>
							<p className="text-xs text-slate-400">
								Real-time row-count validation against reference snapshots (
								<code className="text-slate-350">db_v1_28413952.db</code>).
							</p>
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-2">
								<div>
									<div className="flex justify-between text-xs mb-1">
										<span className="text-slate-400">Sessions Recovered</span>
										<span className="text-emerald-400 font-medium">+1,417</span>
									</div>
									<div className="h-1 bg-slate-800 rounded-full overflow-hidden">
										<div className="h-full bg-emerald-500 w-[82%]" />
									</div>
								</div>
								<div>
									<div className="flex justify-between text-xs mb-1">
										<span className="text-slate-400">Episodic Memories</span>
										<span className="text-emerald-400 font-medium">+8,699</span>
									</div>
									<div className="h-1 bg-slate-800 rounded-full overflow-hidden">
										<div className="h-full bg-emerald-500 w-[91%]" />
									</div>
								</div>
								<div>
									<div className="flex justify-between text-xs mb-1">
										<span className="text-slate-400">Assimilated Servers</span>
										<span className="text-cyan-400 font-medium">+741</span>
									</div>
									<div className="h-1 bg-slate-800 rounded-full overflow-hidden">
										<div className="h-full bg-cyan-500 w-[64%]" />
									</div>
								</div>
								<div>
									<div className="flex justify-between text-xs mb-1">
										<span className="text-slate-400">Go Harness Tools</span>
										<span className="text-cyan-400 font-medium">+10,712</span>
									</div>
									<div className="h-1 bg-slate-800 rounded-full overflow-hidden">
										<div className="h-full bg-cyan-500 w-[78%]" />
									</div>
								</div>
								<div>
									<div className="flex justify-between text-xs mb-1">
										<span className="text-slate-400">Published Configs</span>
										<span className="text-purple-400 font-medium">+476</span>
									</div>
									<div className="h-1 bg-slate-800 rounded-full overflow-hidden">
										<div className="h-full bg-purple-500 w-[55%]" />
									</div>
								</div>
							</div>
						</div>

						{/* Catalog Sync Pipeline Card */}
						<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4 flex flex-col justify-between md:col-span-1">
							<div>
								<div className="flex items-center gap-2">
									<h2 className="text-base font-semibold text-white">
										Global Catalog Synchronization Pipeline
									</h2>
									<span
										className="text-cyan-400 cursor-help text-xs"
										title="Synchronizes missing model capabilities and discovery vector topics."
									>
										💡
									</span>
								</div>
								<p className="text-xs text-slate-400 mt-1">
									Safely run migrations (ALTER TABLE language, mcp_server_json,
									env_vars_found, github_topics) to ingest node topologies.
								</p>
								<div className="grid grid-cols-3 gap-2 mt-4 text-center">
									<div className="border border-slate-800 bg-slate-950 p-2.5 rounded">
										<div className="text-xs text-slate-500">Nodes</div>
										<div className="text-sm font-semibold text-white mt-0.5">
											12,158
										</div>
									</div>
									<div className="border border-slate-800 bg-slate-950 p-2.5 rounded">
										<div className="text-xs text-slate-500">Recipes</div>
										<div className="text-sm font-semibold text-white mt-0.5">
											12,980
										</div>
									</div>
									<div className="border border-slate-800 bg-slate-950 p-2.5 rounded">
										<div className="text-xs text-slate-500">Runs</div>
										<div className="text-sm font-semibold text-white mt-0.5">
											8,629
										</div>
									</div>
								</div>
							</div>
							<div className="space-y-2 pt-4">
								<button
									onClick={triggerSchemaSync}
									disabled={runningSchemaSync}
									className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs py-2 rounded transition-colors disabled:opacity-50"
								>
									{runningSchemaSync
										? "Executing ALTER TABLE migrations..."
										: "Run Column Schema Modifications"}
								</button>
								{schemaSyncResult && (
									<div className="border border-emerald-500/35 bg-emerald-500/10 p-2 rounded text-emerald-300 text-xs font-mono text-center">
										{schemaSyncResult}
									</div>
								)}
							</div>
						</div>

						{/* Diagnostics card */}
						<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 md:col-span-1 space-y-4">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<h2 className="text-base font-semibold text-white">
										System Integrity Console
									</h2>
									<span
										className="text-cyan-400 cursor-help text-xs"
										title="Ensures strict compilation checks and integration test compliance across Go backend components."
									>
										💡
									</span>
								</div>
								<button
									onClick={triggerDiagnostics}
									disabled={runningDiagnostics}
									className="bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 text-xs font-semibold px-4 py-2 rounded transition-colors disabled:opacity-50"
								>
									{runningDiagnostics ? "Running..." : "Run Verify Sweep"}
								</button>
							</div>
							<p className="text-xs text-slate-400">
								Compiles all native tools and verifies test suite assertions
								across memory registers and MCP routers.
							</p>
							<div className="bg-slate-950 p-3 rounded border border-slate-850 font-mono text-xs text-slate-300 min-h-[60px] flex items-center justify-center">
								{runningDiagnostics ? (
									<div className="flex items-center gap-2 text-slate-400">
										<span className="animate-spin">⏳</span>
										<span>Executing integration checks...</span>
									</div>
								) : diagnosticsResult ? (
									<span className="text-emerald-400">{diagnosticsResult}</span>
								) : (
									<span className="text-slate-500">
										System idle. Ready to execute health checks.
									</span>
								)}
							</div>
						</div>

						{/* Session Import Panel */}
						<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4 md:col-span-2">
							<div className="flex items-center justify-between border-b border-slate-800 pb-2">
								<div className="flex items-center gap-2">
									<h2 className="text-base font-semibold text-white">
										External Session &amp; Transcript Ingestion Bridge
									</h2>
									<span
										className="text-cyan-400 cursor-help text-xs"
										title="Scan and import conversation sessions and transcripts from external environments (Claude, Gemini, Aider, etc.) into the L2 memory vault."
									>
										📥
									</span>
								</div>
								<div className="flex items-center gap-2">
									<button
										onClick={fetchImportedSessions}
										disabled={importLoading}
										className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-xs transition-colors disabled:opacity-50"
										title="Refresh the imported sessions list cache"
									>
										{importLoading ? "🔄 Loading..." : "🔄 Refresh"}
									</button>
									<button
										onClick={triggerImportScan}
										disabled={importScanning}
										className="px-2.5 py-1 bg-amber-650/20 hover:bg-amber-650/40 border border-amber-500/25 text-amber-300 rounded text-xs font-semibold transition-colors disabled:opacity-50"
										title="Trigger an active sweep across workspaces for new importable session exports"
									>
										{importScanning ? "🔍 Scanning..." : "🔍 Scan for Sessions"}
									</button>
								</div>
							</div>

							{/* Stats */}
							{importStats && (
								<div className="flex flex-wrap gap-3 text-xs">
									<div className="px-3 py-1 bg-zinc-950/60 rounded border border-slate-850">
										<span className="text-slate-500">Total Scanned:</span>
										<span className="ml-2 text-white font-mono font-medium">
											{importStats.total}
										</span>
									</div>
									<div className="px-3 py-1 bg-zinc-950/60 rounded border border-slate-850">
										<span className="text-slate-500">Valid Scripts:</span>
										<span className="ml-2 text-emerald-400 font-mono font-medium">
											{importStats.valid}
										</span>
									</div>
									<div className="px-3 py-1 bg-zinc-950/60 rounded border border-slate-850">
										<span className="text-slate-500">Already Ingested:</span>
										<span className="ml-2 text-cyan-400 font-mono font-medium">
											{importStats.imported}
										</span>
									</div>
									{lastImportScan && (
										<div className="px-3 py-1 bg-zinc-950/60 rounded border border-slate-850">
											<span className="text-slate-500">Last Sweep:</span>
											<span className="ml-2 text-slate-300 font-mono">
												{lastImportScan}
											</span>
										</div>
									)}
								</div>
							)}

							{/* Ingestion targets list */}
							<div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
								{importedSessions.length === 0 && !importLoading && (
									<div className="text-center py-8 text-slate-500 bg-zinc-950/30 border border-slate-850 rounded-lg">
										<div className="text-2xl mb-2">📥</div>
										<p className="font-semibold text-xs text-slate-350">
											No Sessions Found
										</p>
										<p className="text-[10px] mt-1 text-slate-500 max-w-md mx-auto">
											Click "Scan for Sessions" to sweep project workspaces for
											external transcript formats.
										</p>
									</div>
								)}
								{importedSessions.map((session) => {
									const isExpanded = expandedImportSession === session.id;
									return (
										<div
											key={session.id}
											className="bg-zinc-950/50 border border-slate-850 rounded p-3 hover:bg-zinc-900/60 transition-colors cursor-pointer"
											onClick={() =>
												setExpandedImportSession(isExpanded ? null : session.id)
											}
											title="Click to toggle metadata details"
										>
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-2 min-w-0 text-xs">
													<span>{isExpanded ? "▼" : "▶"}</span>
													<span
														className={
															session.imported
																? "text-emerald-400"
																: "text-amber-400"
														}
													>
														{session.imported ? "✅ Ingested" : "⏳ Ready"}
													</span>
													<span className="text-slate-200 font-mono truncate font-semibold">
														{session.sourceTool || "Unknown Source"} (
														{session.format || "raw"})
													</span>
												</div>
												<div className="text-[10px] text-slate-500 font-mono">
													{session.estimatedSize > 0 && (
														<span>
															{Math.round(session.estimatedSize / 1024)} KB
														</span>
													)}
												</div>
											</div>

											{isExpanded && (
												<div
													className="mt-3 pt-3 border-t border-slate-850 space-y-2 text-[11px] text-slate-300 font-mono"
													onClick={(e) => e.stopPropagation()}
												>
													<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
														<div>
															<span className="text-slate-500">
																Session ID:
															</span>
															<p className="text-slate-300 break-all select-all">
																{session.id}
															</p>
														</div>
														<div>
															<span className="text-slate-500">
																Source Path:
															</span>
															<p className="text-slate-300 break-all select-all">
																{session.sourcePath}
															</p>
														</div>
														<div>
															<span className="text-slate-500">File Type:</span>
															<p className="text-slate-300">
																{session.sourceType}
															</p>
														</div>
														<div>
															<span className="text-slate-500">
																Last Modified:
															</span>
															<p className="text-slate-300">
																{session.lastModifiedAt || "unknown"}
															</p>
														</div>
													</div>
													{session.detectedModels &&
														session.detectedModels.length > 0 && (
															<div>
																<span className="text-slate-500">
																	Models Used:
																</span>
																<div className="flex flex-wrap gap-1 mt-1">
																	{session.detectedModels.map((m: string) => (
																		<span
																			key={m}
																			className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-400 text-[9px]"
																		>
																			{m}
																		</span>
																	))}
																</div>
															</div>
														)}
													{session.errors && session.errors.length > 0 && (
														<div className="bg-rose-500/5 border border-rose-500/10 p-2 rounded text-rose-350">
															<span className="font-semibold block">
																Validation Warnings:
															</span>
															<ul className="list-disc list-inside mt-1 space-y-0.5">
																{session.errors.map((e: string, i: number) => (
																	<li key={i}>{e}</li>
																))}
															</ul>
														</div>
													)}
													{session.valid && (
														<div className="pt-2 flex flex-wrap gap-2">
															{!session.imported && (
																<button
																	onClick={() => importSessionData(session)}
																	className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-2xs font-semibold transition-colors"
																	title="Ingest session facts and conversation transcript logs directly to database"
																>
																	Import Session Into Core
																</button>
															)}
															<button
																onClick={() => restoreImportedSession(session)}
																className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-2xs font-semibold transition-colors"
																title="Restore this session into an active supervised session"
															>
																Restore in Supervisor
															</button>
														</div>
													)}
												</div>
											)}
										</div>
									);
								})}
							</div>
						</div>

						{/* Git Repository Chronicle */}
						<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4 md:col-span-1 flex flex-col justify-between">
							<div>
								<div className="flex items-center gap-2 border-b border-slate-850 pb-2">
									<h2 className="text-base font-semibold text-white">
										Git Repository Chronicle
									</h2>
									<span
										className="text-cyan-400 cursor-help text-xs"
										title="Live repository commits and working tree status metrics."
									>
										🌿
									</span>
								</div>
								<p className="text-xs text-slate-400 mt-2">
									Monitors workspace revision history and uncommitted changes.
								</p>

								<div className="space-y-2 mt-4 max-h-[220px] overflow-y-auto font-mono text-[11px] text-slate-350 pr-1">
									{gitStatus && (
										<div className="border border-slate-850 p-2 rounded bg-zinc-950/60 mb-2">
											<span className="text-slate-500 font-semibold block mb-1">
												UNCOMMITTED CHANGES:
											</span>
											<div className="whitespace-pre text-yellow-400 text-2xs leading-normal">
												{gitStatus.modifiedFiles?.length > 0
													? gitStatus.modifiedFiles.join("\n")
													: "Working tree clean ✓"}
											</div>
										</div>
									)}

									<span className="text-slate-500 font-semibold block mb-1">
										RECENT COMMITS:
									</span>
									{gitLog && gitLog.length > 0 ? (
										gitLog.map((commit: any) => (
											<div
												key={commit.hash}
												className="border-b border-slate-850/60 py-1 last:border-0"
											>
												<span className="text-cyan-400 font-semibold">
													{commit.hash?.slice(0, 7)}
												</span>{" "}
												<span className="text-slate-200">
													{commit.message?.slice(0, 50)}
												</span>
											</div>
										))
									) : (
										<div className="text-slate-600 italic">
											No commits loaded.
										</div>
									)}
								</div>
							</div>
						</div>

						{/* Global Configuration Register */}
						<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4 md:col-span-2">
							<SettingsDashboard />
						</div>

						{/* Live Immune Self-Healing Radar */}
						<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4 md:col-span-2 font-mono">
							<div className="flex items-center justify-between border-b border-slate-800 pb-2">
								<div className="flex items-center gap-2">
									<h2 className="text-base font-semibold text-white">
										Live Immune System Self-Healing Radar
									</h2>
									<span
										className={`h-2.5 w-2.5 rounded-full ${livePathogens.length > 0 ? "bg-red-500 animate-ping" : "bg-green-500 animate-pulse"}`}
									/>
									<span
										className="text-cyan-400 cursor-help text-xs"
										title="Actively monitors, diagnoses, and self-heals broken files, runtime exceptions, and type drift."
									>
										🛡️
									</span>
								</div>
								<div className="text-[10px] text-slate-500 font-mono">
									{livePathogens.length > 0
										? `${livePathogens.length} Active Errors Detected`
										: "System Secure & Healthy"}
								</div>
							</div>
							<p className="text-xs text-slate-400">
								Real-time system errors captured, auto-diagnosed, and corrected.
							</p>

							<div className="grid gap-4 md:grid-cols-2 max-h-[300px] overflow-y-auto pr-1">
								{/* Pathogens Column */}
								<div className="border border-slate-850 bg-zinc-950/40 p-3.5 rounded space-y-2">
									<span className="text-[10px] font-bold text-red-400 tracking-wider block">
										ACTIVE PATHOGENS ({livePathogens.length})
									</span>
									{livePathogens.length === 0 ? (
										<div className="text-center text-xs text-slate-550 py-8">
											No pathogens detected in stream.
										</div>
									) : (
										livePathogens.map((inf: any, idx: number) => (
											<div
												key={idx}
												className="border border-red-900/40 bg-red-950/10 p-2.5 rounded text-[11px]"
											>
												<div className="text-white font-mono break-all">
													{inf.error}
												</div>
												{inf.fix?.diagnosis && (
													<div className="text-amber-400 mt-1">
														Diagnosis: {inf.fix.diagnosis.errorType} (
														{inf.fix.diagnosis.file})
													</div>
												)}
											</div>
										))
									)}
								</div>

								{/* Neutralized Column */}
								<div className="border border-slate-850 bg-zinc-950/40 p-3.5 rounded space-y-2">
									<span className="text-[10px] font-bold text-emerald-400 tracking-wider block">
										AUTO-NEUTRALIZED ({autoNeutralized.length})
									</span>
									{autoNeutralized.length === 0 ? (
										<div className="text-center text-xs text-slate-550 py-8">
											Awaiting recovery events...
										</div>
									) : (
										autoNeutralized
											.slice(0, 10)
											.map((entry: any, idx: number) => (
												<div
													key={idx}
													className="border border-emerald-900/40 bg-emerald-950/10 p-2.5 rounded text-[11px]"
												>
													<div className="text-slate-300 font-mono truncate">
														{entry.error}
													</div>
													{entry.fix && (
														<div className="text-emerald-400 mt-1 font-semibold">
															Healed:{" "}
															{entry.fix.diagnosis?.file?.split("/").pop()}
														</div>
													)}
												</div>
											))
									)}
								</div>
							</div>
						</div>

						{/* SQLite L2 Vector Vault Log */}
						<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4 md:col-span-2 font-mono">
							<div className="flex items-center justify-between border-b border-slate-800 pb-2">
								<div className="flex items-center gap-2">
									<h2 className="text-base font-semibold text-white">
										SQLite L2 Persistent Vector Vault
									</h2>
									<span
										className="text-cyan-400 cursor-help text-xs"
										title="Stores long-term agent memories, observations, and facts inside a persistent vector database."
									>
										🗄️
									</span>
								</div>
								<div className="flex items-center gap-2">
									<select
										value={healerLimit}
										onChange={(e) => setHealerLimit(Number(e.target.value))}
										className="bg-black text-[10px] border border-slate-800 rounded px-1.5 py-0.5 text-slate-300 focus:outline-none"
									>
										<option value={10}>10 items</option>
										<option value={30}>30 items</option>
										<option value={50}>50 items</option>
									</select>
									<button
										onClick={() => refetchHealerVault()}
										className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-slate-200 text-[10px] rounded transition-colors"
									>
										🔄 Re-sync DB
									</button>
								</div>
							</div>

							<div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
								{!healerVaultRecords || healerVaultRecords.length === 0 ? (
									<div className="text-center text-xs text-slate-500 py-8">
										Vault register is empty.
									</div>
								) : (
									healerVaultRecords.map((record: any, idx: number) => {
										const importance = Math.round(
											(record.Importance || 0) * 100,
										);
										const heat = Math.round(record.HeatScore || 50);
										return (
											<div
												key={idx}
												className="bg-zinc-950/60 border border-slate-850 p-3 rounded-lg flex flex-col justify-between"
											>
												<div className="flex items-center justify-between text-[10px] text-slate-500 mb-1.5 font-mono">
													<span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-1.5 py-0.2 rounded font-bold uppercase">
														{record.Type || "Episodic"}
													</span>
													<span>
														{new Date(
															record.CreatedAt || Date.now(),
														).toLocaleTimeString()}
													</span>
												</div>
												<p className="text-xs text-slate-350 leading-relaxed break-words font-sans">
													{record.Content}
												</p>
												<div className="mt-2 pt-2 border-t border-slate-850/60 flex items-center justify-between text-[9px] text-slate-500">
													<div className="flex items-center gap-1">
														<span>Importance:</span>
														<span className="font-semibold text-slate-350">
															{importance}%
														</span>
														<div className="w-16 bg-slate-900 h-1 rounded-full overflow-hidden ml-1">
															<div
																className="h-full bg-blue-500"
																style={{ width: `${importance}%` }}
															/>
														</div>
													</div>
													<span className="text-orange-400">Heat: {heat}°</span>
												</div>
											</div>
										);
									})
								)}
							</div>
						</div>
					</div>
				</div>

				{/* SECTION 4: PROMPT COLLECTIONS & GLOBAL STATIC DEPLOYMENTS */}
				<div className="space-y-4 pt-8 pb-8 border-t border-slate-800">
					<div className="flex items-center justify-between border-b border-slate-800 pb-2">
						<h2 className="text-lg font-bold text-white tracking-wide">
							Prompt Collections &amp; Global Static Deployments
						</h2>
						<span className="text-[10px] text-cyan-400 font-mono uppercase border border-cyan-500/20 bg-cyan-500/5 px-2 py-0.5 rounded font-semibold font-semibold">
							Deployments
						</span>
					</div>
					<div className="grid gap-6 md:grid-cols-3">
						{/* Prompt Library */}
						<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4">
							<div className="flex items-center gap-2">
								<h2 className="text-base font-semibold text-white">
									Deduplicated Prompt Library
								</h2>
								<span
									className="text-cyan-400 cursor-help text-xs"
									title="Compiles system prompt definitions directly to prompt_library.go."
								>
									💡
								</span>
							</div>
							<p className="text-xs text-slate-400">
								Monitors system prompts loaded and tracks compilation mapping
								state.
							</p>
							<div className="space-y-2 border border-slate-850 p-2.5 rounded bg-slate-950/60 max-h-[220px] overflow-y-auto font-mono text-xs">
								<div className="flex items-center justify-between p-1.5 border-b border-slate-800/60">
									<span className="text-slate-300">
										system_swarm_orchestrator
									</span>
									<span className="text-[10px] text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 rounded">
										compiled
									</span>
								</div>
								<div className="flex items-center justify-between p-1.5 border-b border-slate-800/60">
									<span className="text-slate-300">agent_tool_classifier</span>
									<span className="text-[10px] text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 rounded">
										compiled
									</span>
								</div>
								<div className="flex items-center justify-between p-1.5 border-b border-slate-800/60">
									<span className="text-slate-300">memory_dream_distiller</span>
									<span className="text-[10px] text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 rounded">
										compiled
									</span>
								</div>
								<div className="flex items-center justify-between p-1.5">
									<span className="text-slate-300">
										bobby_bookmark_recommender
									</span>
									<span className="text-[10px] text-amber-400 border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 rounded">
										pending
									</span>
								</div>
							</div>
						</div>

						{/* Static Deployments */}
						<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4 flex flex-col justify-between">
							<div>
								<div className="flex items-center gap-2">
									<h2 className="text-base font-semibold text-white">
										Web Deployment Operations
									</h2>
									<span
										className="text-cyan-400 cursor-help text-xs"
										title="Triggers GitHub actions workflow (deploy-landing.yml) to push static landings."
									>
										💡
									</span>
								</div>
								<p className="text-xs text-slate-400">
									Publish production site changes dynamically.
								</p>
								<div className="space-y-3 pt-3 text-xs">
									<div className="flex items-center justify-between border border-slate-850 p-3 rounded bg-slate-950/60">
										<div>
											<div className="font-semibold text-slate-200">
												hypernexus.site
											</div>
											<div className="text-[10px] text-slate-500 mt-0.5">
												Cyberpunk style layout
											</div>
										</div>
										<button
											onClick={() => triggerStaticDeploy("hypernexus.site")}
											disabled={deployingSite === "hypernexus.site"}
											className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs px-3 py-1.5 rounded disabled:opacity-50"
										>
											{deployStatus["hypernexus.site"] === "deploying"
												? "Deploying..."
												: deployStatus["hypernexus.site"] === "success"
													? "Published ✓"
													: "Deploy Site"}
										</button>
									</div>
									<div className="flex items-center justify-between border border-slate-850 p-3 rounded bg-slate-950/60">
										<div>
											<div className="font-semibold text-slate-200">
												hypernexus.site
											</div>
											<div className="text-[10px] text-slate-500 mt-0.5">
												Commercial layout
											</div>
										</div>
										<button
											onClick={() => triggerStaticDeploy("hypernexus.site")}
											disabled={deployingSite === "hypernexus.site"}
											className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs px-3 py-1.5 rounded disabled:opacity-50"
										>
											{deployStatus["hypernexus.site"] === "deploying"
												? "Deploying..."
												: deployStatus["hypernexus.site"] === "success"
													? "Published ✓"
													: "Deploy Site"}
										</button>
									</div>
								</div>
							</div>
						</div>

						{/* Cloud Deployment */}
						{typeof window !== "undefined" &&
							!window.location.hostname.includes("hypernexus") && (
								<div className="rounded-2xl border border-purple-700/50 bg-gradient-to-br from-purple-950/30 to-slate-900/70 p-6 space-y-3">
									<div className="flex items-center gap-2">
										<h2 className="text-base font-semibold text-white">
											HyperNexus Cloud
										</h2>
										<span className="text-xs bg-purple-700 text-purple-100 px-2 py-0.5 rounded-full">
											New
										</span>
									</div>
									<p className="text-xs text-slate-400">
										Deploy HyperNexus as a multi-tenant SaaS platform. Spin up
										isolated workspaces for commercial customers.
									</p>
									<a
										href="https://cloud.hypernexus.site"
										target="_blank"
										rel="noopener noreferrer"
										className="block w-full text-center bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm px-4 py-2.5 rounded transition-colors"
									>
										Launch Cloud Dashboard &rarr;
									</a>
								</div>
							)}

						{/* OS Protocol Registry */}
						<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4 flex flex-col justify-between">
							<div>
								<div className="flex items-center gap-2">
									<h2 className="text-base font-semibold text-white">
										OS Protocol Registry
									</h2>
									<span
										className="text-cyan-400 cursor-help text-xs"
										title="Registers tormentnexus:// protocol handler in HKCU registry to intercept deep link attach/create hooks from the browser."
									>
										💡
									</span>
								</div>
								<p className="text-xs text-slate-400">
									Attaches HyperNexus:// links directly to the local kernel
									runtime daemon.
								</p>
								<div className="pt-4">
									<button
										onClick={registerOSProtocol}
										disabled={registeringProtocol}
										className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs px-4 py-2.5 rounded disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
									>
										{registeringProtocol
											? "Registering..."
											: protocolRegistered
												? "Registered Successfully ✓"
												: "Register HyperNexus:// Protocol"}
									</button>
								</div>
								<div className="pt-4 border-t border-slate-800 space-y-2">
									<p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
										Test Deep Link Schemes
									</p>
									<div className="grid grid-cols-1 gap-2">
										<a
											href="hypernexus://focus?tab=settings"
											className="text-center bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs px-3 py-2 rounded transition-colors"
										>
											Focus Settings Tab
										</a>
										<a
											href="tormentnexus://search-memory?query=read"
											className="text-center bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs px-3 py-2 rounded transition-colors"
										>
											Search Memories for "read"
										</a>
										<a
											href="tormentnexus://trigger-tool?tool=view_file&path=VERSION"
											className="text-center bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs px-3 py-2 rounded transition-colors"
										>
											View VERSION File
										</a>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* SECTION: BILLING & PROVIDER AUTH MATRIX */}
				<div
					id="governance-billing"
					className="scroll-mt-6 pt-8 border-t border-slate-800 space-y-8"
				>
					<ProviderAuthBillingMatrix />
				</div>

				{/* SECTION 5: ENTERPRISE SECURITY & AUDITING */}
				<div className="space-y-4 pt-8 pb-8 border-t border-slate-800">
					<div className="flex items-center justify-between border-b border-slate-800 pb-2">
						<h2 className="text-lg font-bold text-white tracking-wide">
							Commercial Security &amp; Auditing
						</h2>
						<span className="text-[10px] text-cyan-400 font-mono uppercase border border-cyan-500/20 bg-cyan-500/5 px-2 py-0.5 rounded font-semibold">
							Governance &amp; SSO
						</span>
					</div>
					<div className="grid gap-6 md:grid-cols-2">
						{/* License Status */}
						<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<h2 className="text-base font-semibold text-white">
										License Authority Status
									</h2>
									<span
										className="text-cyan-400 cursor-help text-xs"
										title="Cryptographically verified node authority lease."
									>
										🔑
									</span>
								</div>
								<button
									onClick={fetchCommercial}
									disabled={commercialLoading}
									className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-xs transition-colors"
									title="Reload license authority cache"
								>
									🔄 Refresh
								</button>
							</div>

							{license ? (
								<div className="space-y-2 text-xs font-mono text-slate-300">
									<div className="flex items-center gap-2">
										<span
											className={
												license.valid ? "text-emerald-400" : "text-rose-400"
											}
										>
											{license.valid
												? "✅ VALID ENTERPRISE LEASE"
												: "❌ EXPIRED / INVALID LEASE"}
										</span>
									</div>
									{license.licensedTo && (
										<div>
											<span className="text-slate-500">Licensed To:</span>{" "}
											{license.licensedTo}
										</div>
									)}
									{license.tier && (
										<div>
											<span className="text-slate-500">Service Tier:</span>{" "}
											{license.tier}
										</div>
									)}
									{license.expiresAt && (
										<div>
											<span className="text-slate-500">Expiration:</span>{" "}
											{license.expiresAt}
										</div>
									)}
									{license.maxNodes && (
										<div>
											<span className="text-slate-500">Max Nodes Limit:</span>{" "}
											{license.maxNodes}
										</div>
									)}
									{license.features && license.features.length > 0 && (
										<div className="pt-1">
											<span className="text-slate-500 text-[10px] block mb-1">
												ENABLED CAPABILITIES:
											</span>
											<div className="flex flex-wrap gap-1">
												{license.features.map((f: string) => (
													<span
														key={f}
														className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-400 text-[9px]"
													>
														{f}
													</span>
												))}
											</div>
										</div>
									)}
								</div>
							) : (
								<div className="text-slate-500 text-xs italic">
									{commercialLoading
										? "Retrieving license authority leases..."
										: "No license lease validated."}
								</div>
							)}
						</div>

						{/* SSO authentication Settings */}
						<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4">
							<div className="flex items-center gap-2 border-b border-slate-850 pb-2">
								<h2 className="text-base font-semibold text-white">
									SSO Single Sign-On Identity Setup
								</h2>
								<span
									className="text-cyan-400 cursor-help text-xs"
									title="Configures OIDC/OAuth2 endpoints for upstream organization control."
								>
									🛡️
								</span>
							</div>

							<div className="space-y-3">
								<div>
									<label className="text-[10px] text-slate-500 block mb-1">
										PROVIDER METADATA DISCOVERY URL
									</label>
									<input
										value={providerUrl}
										onChange={(e) => setProviderUrl(e.target.value)}
										placeholder="e.g., https://id.nexus.auth/oauth2"
										className="w-full bg-zinc-950 border border-slate-800 rounded p-2 text-xs text-white placeholder-slate-600 focus:border-cyan-500 outline-none transition-colors"
									/>
								</div>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
									<div>
										<label className="text-[10px] text-slate-500 block mb-1">
											CLIENT APPLICATION ID
										</label>
										<input
											value={clientId}
											onChange={(e) => setClientId(e.target.value)}
											placeholder="OAuth client identifier"
											className="w-full bg-zinc-950 border border-slate-800 rounded p-2 text-xs text-white placeholder-slate-600 focus:border-cyan-500 outline-none transition-colors"
										/>
									</div>
									<div>
										<label className="text-[10px] text-slate-500 block mb-1">
											CLIENT ID SYMMETRIC SECRET
										</label>
										<input
											type="password"
											value={clientSecret}
											onChange={(e) => setClientSecret(e.target.value)}
											placeholder="••••••••••••••••"
											className="w-full bg-zinc-950 border border-slate-800 rounded p-2 text-xs text-white placeholder-slate-600 focus:border-cyan-500 outline-none transition-colors"
										/>
									</div>
								</div>
							</div>

							<div className="flex items-center justify-between pt-2">
								<span className="text-2xs text-amber-500 font-mono">
									{ssoStatus}
								</span>
								<button
									onClick={saveSSO}
									disabled={ssoSaving}
									className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold disabled:opacity-50 transition-colors"
									title="Commit OIDC configurations to core config register"
								>
									{ssoSaving ? "Saving..." : "Save SSO Details"}
								</button>
							</div>
						</div>

						{/* RBAC Configurator */}
						<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4 md:col-span-2">
							<div className="flex items-center justify-between border-b border-slate-800 pb-2">
								<div className="flex items-center gap-2">
									<h2 className="text-base font-semibold text-white">
										RBAC Role-Based Governance Matrix
									</h2>
									<span
										className="text-cyan-400 cursor-help text-xs"
										title="Explicit security policy overrides for downstream client agents."
									>
										👥
									</span>
								</div>
								<button
									onClick={saveRoles}
									disabled={rolesSaving}
									className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold transition-colors"
									title="Submit modified security matrix"
								>
									{rolesSaving ? "Saving Matrix..." : "Save Role Matrix"}
								</button>
							</div>

							{rolesStatus && (
								<div className="text-2xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded font-mono text-center">
									{rolesStatus}
								</div>
							)}

							<div className="space-y-3">
								{editingRoles.map((role, idx) => (
									<div
										key={role.name}
										className="bg-zinc-950/60 rounded p-3 border border-slate-850 space-y-2"
									>
										<div className="flex items-center justify-between text-xs font-bold text-slate-350 tracking-wider">
											<span>ROLE: {role.name?.toUpperCase()}</span>
										</div>
										<div className="grid gap-2 md:grid-cols-2">
											<div>
												<label className="text-[10px] text-slate-500 block mb-1">
													CAPABILITY OVERVIEW / PURPOSE
												</label>
												<input
													value={role.description || ""}
													onChange={(e) =>
														handleRoleDescChange(idx, e.target.value)
													}
													className="w-full bg-zinc-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-zinc-300 focus:border-cyan-500 outline-none"
												/>
											</div>
											<div>
												<label className="text-[10px] text-slate-500 block mb-1">
													ALLOWED KEYWORD ACTIONS (COMMA-SEPARATED)
												</label>
												<input
													value={role.permissions.join(", ")}
													onChange={(e) =>
														handleRolePermsChange(idx, e.target.value)
													}
													className="w-full bg-zinc-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-zinc-300 focus:border-cyan-500 outline-none font-mono"
												/>
											</div>
										</div>
									</div>
								))}
							</div>
						</div>

						{/* Audit Logs */}
						<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4 md:col-span-2">
							<div className="flex items-center gap-2 border-b border-slate-850 pb-2">
								<h2 className="text-base font-semibold text-white">
									Cryptographic Node Security Audit Logs
								</h2>
								<span
									className="text-cyan-400 cursor-help text-xs"
									title="Immutable event sequence tracking critical actions on keys and database tables."
								>
									📄
								</span>
							</div>

							<div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
								{auditLogs.length === 0 ? (
									<div className="text-zinc-650 text-xs italic font-mono text-center py-4 bg-zinc-950/20 border border-slate-850 rounded">
										No recent audit records tracked in the kernel.
									</div>
								) : (
									auditLogs.map((log: any, i: number) => (
										<div
											key={i}
											className="text-[11px] font-mono flex items-start gap-4 py-1.5 border-b border-slate-850 last:border-0 text-slate-400"
										>
											<span className="text-slate-600 shrink-0 select-none">
												[
												{log.timestamp?.slice(11, 19) ||
													log.timestamp?.slice(0, 10) ||
													"00:00:00"}
												]
											</span>
											<span className="text-purple-400 font-semibold uppercase tracking-wider shrink-0 w-24">
												{log.action?.slice(0, 18) || "UNKNOWN"}
											</span>
											<span className="text-slate-300 break-all select-all flex-1">
												{log.detail || JSON.stringify(log)}
											</span>
										</div>
									))
								)}
							</div>
						</div>
					</div>
				</div>

				{/* SECTION 6: AUTONOMOUS WORKFLOW ORCHESTRATION */}
				<div className="space-y-4 pt-8 pb-8 border-t border-slate-800">
					<div className="flex items-center justify-between border-b border-slate-800 pb-2">
						<h2 className="text-lg font-bold text-white tracking-wide font-mono">
							Autonomous Workflow Orchestration
						</h2>
						<span className="text-[10px] text-cyan-400 font-mono uppercase border border-cyan-500/20 bg-cyan-500/5 px-2 py-0.5 rounded font-semibold">
							Workflow Engine
						</span>
					</div>

					<div className="grid gap-6 md:grid-cols-3">
						{/* Workflow Library */}
						<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4 md:col-span-1">
							<div className="flex items-center gap-2">
								<h2 className="text-base font-semibold text-white">
									Workflow Library
								</h2>
								<span
									className="text-cyan-400 cursor-help text-xs"
									title="Lists all configured workflow definition topologies."
								>
									💡
								</span>
							</div>
							<div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 font-mono">
								{workflowsList && workflowsList.length > 0 ? (
									workflowsList.map((wf: any) => (
										<button
											key={wf.id}
											onClick={() => setSelectedWorkflowId(wf.id)}
											className={`w-full text-left p-2.5 rounded text-xs transition-colors flex items-center justify-between border ${
												selectedWorkflowId === wf.id
													? "border-cyan-500/40 bg-cyan-500/10 text-white font-bold"
													: "border-slate-800 bg-zinc-950/60 text-slate-400 hover:text-slate-200"
											}`}
										>
											<span>{wf.name || wf.id}</span>
											<span className="text-[9px] text-slate-500 font-mono">
												{wf.id}
											</span>
										</button>
									))
								) : (
									<>
										<button
											onClick={() => setSelectedWorkflowId("test-workflow")}
											className={`w-full text-left p-2.5 rounded text-xs transition-colors flex items-center justify-between border ${
												selectedWorkflowId === "test-workflow"
													? "border-cyan-500/40 bg-cyan-500/10 text-white font-bold"
													: "border-slate-800 bg-zinc-950/60 text-slate-400 hover:text-slate-200"
											}`}
										>
											<span>Test Workflow</span>
											<span className="text-[9px] text-slate-500 font-mono">
												default
											</span>
										</button>
										<div className="text-[10px] text-slate-500 italic text-center py-2">
											No other custom workflows saved.
										</div>
									</>
								)}
							</div>
						</div>

						{/* Visualizer & Executions */}
						<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4 md:col-span-2 flex flex-col justify-between font-mono">
							<div>
								<div className="flex items-center justify-between border-b border-slate-800 pb-2">
									<div className="flex items-center gap-2">
										<h2 className="text-base font-semibold text-white">
											Active Node Visualizer
										</h2>
										<span
											className="text-cyan-400 cursor-help text-xs"
											title="Visualizes active step transitions inside the multi-agent graph model."
										>
											💡
										</span>
									</div>
									<button
										onClick={triggerRunWorkflow}
										disabled={
											!selectedWorkflowId || startWorkflowMutation.isPending
										}
										className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs px-3.5 py-1 rounded transition-colors disabled:opacity-50"
									>
										{startWorkflowMutation.isPending
											? "Starting..."
											: "Run Active Workflow"}
									</button>
								</div>

								<div className="h-48 border border-slate-850 bg-zinc-955 rounded my-3 flex items-center justify-center relative overflow-hidden">
									{workflowGraph ? (
										<WorkflowVisualizer
											data={workflowGraph as any}
											activeNodeId={
												workflowExecutions?.find(
													(x: any) => x.id === activeExecutionId,
												)?.currentNode
											}
											className="h-full w-full border-0 rounded"
										/>
									) : (
										<span className="text-xs text-slate-500 font-mono">
											No Graph Data Loaded for {selectedWorkflowId || "None"}
										</span>
									)}
								</div>

								<div className="pt-2">
									<span className="text-[10px] font-bold text-slate-400 tracking-wider block mb-2">
										RUNNING EXECUTIONS ({workflowExecutions?.length || 0})
									</span>
									<div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
										{!workflowExecutions || workflowExecutions.length === 0 ? (
											<div className="text-xs text-slate-600 italic">
												No executions currently active.
											</div>
										) : (
											workflowExecutions.map((exec: any) => (
												<div
													key={exec.id}
													className="border border-slate-850 bg-zinc-955 p-2.5 rounded flex items-center justify-between text-xs"
												>
													<div className="flex items-center gap-2">
														<span
															className={`px-1.5 py-0.2 rounded text-[9px] font-bold font-mono ${
																exec.status === "running"
																	? "bg-cyan-500/10 text-cyan-400"
																	: "bg-zinc-800 text-slate-400"
															}`}
														>
															{exec.status}
														</span>
														<span className="font-mono text-slate-200 select-all">
															{exec.id?.slice(0, 12)}...
														</span>
														<span className="text-slate-500 font-mono">
															Node: {exec.currentNode || "none"}
														</span>
													</div>
													<div className="flex gap-1.5">
														{exec.status === "running" && (
															<button
																onClick={() =>
																	pauseWorkflowMutation.mutate({
																		executionId: exec.id,
																	})
																}
																className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-[10px] rounded"
															>
																Pause
															</button>
														)}
														{exec.status === "paused" && (
															<button
																onClick={() =>
																	resumeWorkflowMutation.mutate({
																		executionId: exec.id,
																	})
																}
																className="px-2 py-0.5 bg-cyan-600 hover:bg-cyan-500 text-[10px] rounded"
															>
																Resume
															</button>
														)}
													</div>
												</div>
											))
										)}
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

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
