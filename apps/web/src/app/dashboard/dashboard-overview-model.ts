import type {
	DashboardFallbackSummary,
	DashboardHealerSummary,
	DashboardInstallSurfaceArtifact,
	DashboardProviderSummary,
	DashboardServerSummary,
	DashboardSessionSummary,
	DashboardStartupStatus,
	DashboardStatusSummary,
	DashboardTrafficSummary,
	OverviewMetric,
	StartupChecklistItem,
} from "./dashboard-home-view";

type DashboardStartupChecks = DashboardStartupStatus["checks"];

export const DEFAULT_DASHBOARD_STARTUP_CHECKS: DashboardStartupChecks = {
	mcpAggregator: {
		ready: false,
		liveReady: false,
		residentReady: false,
		serverCount: 0,
		connectedCount: 0,
		residentConnectedCount: 0,
		initialization: null,
		persistedServerCount: 0,
		persistedToolCount: 0,
		inventoryReady: false,
		warmupInProgress: false,
	},
	configSync: {
		ready: false,
		status: null,
	},
	memory: {
		ready: false,
		initialized: false,
		agentMemory: false,
		claudeMem: {
			ready: true,
			enabled: false,
			storeExists: false,
			storePath: null,
			totalEntries: 0,
			sectionCount: 0,
			defaultSectionCount: 0,
			presentDefaultSectionCount: 0,
			missingSections: [],
			lastUpdatedAt: null,
		},
		tormentnexus: {
			ready: true,
			enabled: false,
			storeExists: false,
			storePath: null,
			totalEntries: 0,
			sectionCount: 0,
			defaultSectionCount: 0,
			presentDefaultSectionCount: 0,
			missingSections: [],
			lastUpdatedAt: null,
		},
	},
	browser: {
		ready: false,
		active: false,
		pageCount: 0,
	},
	sessionSupervisor: {
		ready: false,
		sessionCount: 0,
		restore: null,
	},
	extensionBridge: {
		ready: false,
		acceptingConnections: false,
		clientCount: 0,
		hasConnectedClients: false,
	},
	executionEnvironment: {
		ready: false,
		preferredShellId: null,
		preferredShellLabel: null,
		shellCount: 0,
		verifiedShellCount: 0,
		toolCount: 0,
		verifiedToolCount: 0,
		harnessCount: 0,
		verifiedHarnessCount: 0,
		supportsPowerShell: false,
		supportsPosixShell: false,
		notes: [],
	},
};

export const DASHBOARD_BROWSER_EXTENSION_SURFACE_IDS = [
	"browser-extension-chromium",
	"browser-extension-firefox",
] as const;

export function getDashboardBrowserExtensionArtifactSummary(
	artifacts?: DashboardInstallSurfaceArtifact[] | null,
): {
	readyCount: number;
	totalCount: number;
	missingFirefoxBundle: boolean;
	missingChromiumBundle: boolean;
	hasPartialFirefoxBundle: boolean;
	isDetecting: boolean;
	allReady: boolean;
} {
	const relevantArtifacts = (artifacts ?? []).filter((artifact) =>
		DASHBOARD_BROWSER_EXTENSION_SURFACE_IDS.includes(
			artifact.id as (typeof DASHBOARD_BROWSER_EXTENSION_SURFACE_IDS)[number],
		),
	);
	const totalCount = DASHBOARD_BROWSER_EXTENSION_SURFACE_IDS.length;

	if (relevantArtifacts.length === 0) {
		return {
			readyCount: 0,
			totalCount,
			missingFirefoxBundle: false,
			missingChromiumBundle: false,
			hasPartialFirefoxBundle: false,
			isDetecting: true,
			allReady: false,
		};
	}

	const chromium = relevantArtifacts.find(
		(artifact) => artifact.id === "browser-extension-chromium",
	);
	const firefox = relevantArtifacts.find(
		(artifact) => artifact.id === "browser-extension-firefox",
	);
	const readyCount = relevantArtifacts.filter(
		(artifact) => artifact.status === "ready",
	).length;

	return {
		readyCount,
		totalCount,
		missingFirefoxBundle: firefox?.status === "missing",
		missingChromiumBundle: chromium?.status === "missing",
		hasPartialFirefoxBundle: firefox?.status === "partial",
		isDetecting: false,
		allReady: readyCount === totalCount,
	};
}

export function getDashboardBrowserExtensionArtifactDetail(
	artifacts?: DashboardInstallSurfaceArtifact[] | null,
): string {
	const summary = getDashboardBrowserExtensionArtifactSummary(artifacts);

	if (summary.isDetecting) {
		return "Detecting Chromium and Firefox extension install artifacts from the workspace.";
	}

	if (summary.allReady) {
		return "Chromium/Edge and Firefox extension bundles are ready to load.";
	}

	if (summary.hasPartialFirefoxBundle) {
		return "Chromium/Edge bundle is ready, but Firefox still needs its browser-specific build output.";
	}

	if (summary.missingChromiumBundle && summary.missingFirefoxBundle) {
		return "Neither browser extension bundle has been built yet.";
	}

	if (summary.missingChromiumBundle) {
		return "Firefox bundle is ready, but Chromium/Edge still needs its unpacked build output.";
	}

	if (summary.missingFirefoxBundle) {
		return "Chromium/Edge bundle is ready, but Firefox still needs its unpacked build output.";
	}

	return `${summary.readyCount}/${summary.totalCount} browser extension bundles are ready.`;
}

export function getStartupChecks(
	startupStatus: DashboardStartupStatus,
): DashboardStartupChecks {
	const checks = startupStatus?.checks as
		| Partial<DashboardStartupChecks>
		| undefined;

	return {
		mcpAggregator: {
			...DEFAULT_DASHBOARD_STARTUP_CHECKS.mcpAggregator,
			...(checks?.mcpAggregator ?? {}),
		},
		configSync: {
			...DEFAULT_DASHBOARD_STARTUP_CHECKS.configSync,
			...(checks?.configSync ?? {}),
		},
		memory: {
			...DEFAULT_DASHBOARD_STARTUP_CHECKS.memory,
			...(checks?.memory ?? {}),
			claudeMem: {
				...DEFAULT_DASHBOARD_STARTUP_CHECKS.memory.claudeMem,
				...(checks?.memory?.claudeMem ?? {}),
			},
			tormentnexus: {
				...DEFAULT_DASHBOARD_STARTUP_CHECKS.memory.tormentnexus,
				...(checks?.memory?.tormentnexus ?? {}),
			},
		},
		browser: {
			...DEFAULT_DASHBOARD_STARTUP_CHECKS.browser,
			...(checks?.browser ?? {}),
		},
		sessionSupervisor: {
			...DEFAULT_DASHBOARD_STARTUP_CHECKS.sessionSupervisor,
			...(checks?.sessionSupervisor ?? {}),
		},
		extensionBridge: {
			...DEFAULT_DASHBOARD_STARTUP_CHECKS.extensionBridge,
			...(checks?.extensionBridge ?? {}),
		},
		executionEnvironment: {
			...DEFAULT_DASHBOARD_STARTUP_CHECKS.executionEnvironment,
			...(checks?.executionEnvironment ?? {}),
		},
	};
}

export function getAdvertisedServerCount(
	aggregator: DashboardStartupStatus["checks"]["mcpAggregator"],
): number {
	return (
		aggregator.advertisedServerCount ??
		aggregator.persistedServerCount ??
		aggregator.configuredServerCount ??
		aggregator.serverCount
	);
}

export function getAdvertisedToolCount(
	aggregator: DashboardStartupStatus["checks"]["mcpAggregator"],
): number {
	return aggregator.advertisedToolCount ?? aggregator.persistedToolCount;
}

export function getCachedInventoryDetail(
	aggregator: DashboardStartupStatus["checks"]["mcpAggregator"],
): string {
	const advertisedServerCount = getAdvertisedServerCount(aggregator);
	const advertisedToolCount = getAdvertisedToolCount(aggregator);
	const alwaysOnToolCount = aggregator.advertisedAlwaysOnToolCount ?? 0;
	const snapshotSource =
		aggregator.inventorySource === "config"
			? "last-known-good config"
			: aggregator.inventorySource === "database"
				? "cached database snapshot"
				: "cached snapshot";

	if (
		aggregator.inventoryReady &&
		advertisedServerCount === 0 &&
		advertisedToolCount === 0
	) {
		return "No configured servers yet · empty cached inventory is ready";
	}

	if (aggregator.inventoryReady) {
		const alwaysOnSuffix =
			alwaysOnToolCount > 0
				? ` · ${alwaysOnToolCount} always-on advertised immediately`
				: "";
		return `${advertisedServerCount} cached servers · ${advertisedToolCount} advertised tools from ${snapshotSource}${alwaysOnSuffix}`;
	}

	return "Waiting for the first cached MCP inventory snapshot";
}

export function getResidentMcpDetail(
	aggregator: DashboardStartupStatus["checks"]["mcpAggregator"],
): string {
	const residentTargetCount = aggregator.advertisedAlwaysOnServerCount ?? 0;
	const residentConnectedCount = aggregator.residentConnectedCount ?? 0;
	const totalServerCount = Math.max(
		aggregator.configuredServerCount ?? 0,
		getAdvertisedServerCount(aggregator),
	);
	const warmingCount = aggregator.warmingServerCount ?? 0;
	const failedWarmupCount = aggregator.failedWarmupServerCount ?? 0;
	const residentReady =
		aggregator.residentReady ??
		((aggregator.liveReady ?? aggregator.ready) &&
			residentConnectedCount >= residentTargetCount);

	if (residentTargetCount === 0) {
		return totalServerCount === 0
			? "No downstream servers configured · on-demand MCP launches are ready when needed"
			: `${totalServerCount} on-demand server${totalServerCount === 1 ? "" : "s"} can launch when needed · no resident MCP runtime is required`;
	}

	if (residentReady) {
		return `${residentConnectedCount}/${residentTargetCount} resident server connection${residentTargetCount === 1 ? "" : "s"} ready · on-demand tools can still cold-start as needed`;
	}

	if (aggregator.inventoryReady) {
		const suffixes = [
			warmingCount > 0 ? `${warmingCount} warming` : null,
			failedWarmupCount > 0 ? `${failedWarmupCount} failed` : null,
		].filter(Boolean);
		const postureSuffix =
			suffixes.length > 0 ? ` · ${suffixes.join(" · ")}` : "";

		return `Cached inventory is already advertised · resident always-on servers are still warming · on-demand tools remain launchable${postureSuffix}`;
	}

	return "Waiting for resident MCP runtime initialization";
}

export function getMemoryContextDetail(
	memory: DashboardStartupStatus["checks"]["memory"],
): string {
	const claudeMem = memory.tormentnexus || memory.claudeMem;

	if (memory.ready) {
		if (claudeMem?.enabled) {
			return "Memory manager initialized and HyperNexus default sections are ready";
		}

		return "Memory manager initialized and agent context services are available";
	}

	if (!memory.initialized) {
		return "Waiting for memory initialization";
	}

	if (claudeMem?.enabled) {
		if (!claudeMem.storeExists) {
			return "Memory manager is initialized, but HyperNexus store has not been created yet";
		}

		const presentSectionCount = Number(
			claudeMem.presentDefaultSectionCount ?? 0,
		);
		const defaultSectionCount = Number(claudeMem.defaultSectionCount ?? 0);
		if (defaultSectionCount > 0 && presentSectionCount < defaultSectionCount) {
			return `Memory manager is initialized, but HyperNexus is still seeding default sections (${presentSectionCount}/${defaultSectionCount} present)`;
		}

		return "Memory manager is initialized, but HyperNexus readiness is still pending";
	}

	return "Memory manager is present, but agent context wiring is still finishing";
}

export interface DashboardAlert {
	id: string;
	severity: "critical" | "warning" | "info";
	title: string;
	detail: string;
	href: string;
	hrefLabel: string;
}

export const DEGRADED_PROVIDER_AVAILABILITIES = new Set([
	"degraded",
	"offline",
	"rate_limited",
	"quota_exhausted",
	"cooldown",
	"missing_auth",
	"missing_config",
]);

export function isProviderDegraded(provider: DashboardProviderSummary): boolean {
	if (!provider.configured) {
		return false;
	}

	if (provider.authenticated === false || provider.lastError) {
		return true;
	}

	if (!provider.availability) {
		return false;
	}

	return DEGRADED_PROVIDER_AVAILABILITIES.has(provider.availability);
}

export function sentenceCase(value: string): string {
	if (!value) {
		return "Unknown";
	}

	const normalized = value.replace(/[_-]+/g, " ");
	return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function formatRelativeTimestamp(
	timestamp: number,
	now?: number | null,
): string {
	if (now === null || now === undefined) {
		return "just now";
	}

	const deltaMs = Math.max(0, now - timestamp);
	const deltaMinutes = Math.floor(deltaMs / 60000);

	if (deltaMinutes < 1) {
		return "just now";
	}

	if (deltaMinutes < 60) {
		return `${deltaMinutes}m ago`;
	}

	const deltaHours = Math.floor(deltaMinutes / 60);
	if (deltaHours < 24) {
		return `${deltaHours}h ago`;
	}

	const deltaDays = Math.floor(deltaHours / 24);
	return `${deltaDays}d ago`;
}

export function formatRestartCountdown(
	timestamp: number,
	now?: number | null,
): string {
	if (now === null || now === undefined) {
		return "soon";
	}

	const remainingMs = Math.max(0, timestamp - now);
	const remainingSeconds = Math.ceil(remainingMs / 1000);

	if (remainingSeconds <= 1) {
		return "in <1s";
	}

	if (remainingSeconds < 60) {
		return `in ${remainingSeconds}s`;
	}

	const remainingMinutes = Math.ceil(remainingSeconds / 60);
	if (remainingMinutes < 60) {
		return `in ${remainingMinutes}m`;
	}

	const remainingHours = Math.ceil(remainingMinutes / 60);
	if (remainingHours < 24) {
		return `in ${remainingHours}h`;
	}

	return `in ${Math.ceil(remainingHours / 24)}d`;
}

export function summarizeTrafficEvent(event: DashboardTrafficSummary): string {
	const target = event.toolName
		? `${event.method} · ${event.toolName}`
		: event.method;
	const detail =
		event.paramsSummary?.trim() ||
		event.error?.trim() ||
		"No parameters captured";
	return `${target} — ${detail}`;
}

export function getQuotaUsagePercent(
	provider: DashboardProviderSummary,
): number | null {
	if (provider.limit === null || provider.limit <= 0) {
		return null;
	}

	return Math.max(
		0,
		Math.min(100, Math.round((provider.used / provider.limit) * 100)),
	);
}

export function buildOverviewMetrics(
	mcpStatus: DashboardStatusSummary,
	sessions: DashboardSessionSummary[],
	providers: DashboardProviderSummary[],
	isBootstrapping = false,
): OverviewMetric[] {
	if (isBootstrapping) {
		return [
			{
				label: "MCP servers",
				value: "—",
				detail: "Connecting to live router telemetry",
			},
			{
				label: "Supervised sessions",
				value: "—",
				detail: "Waiting for the first session supervisor snapshot",
			},
			{
				label: "Configured providers",
				value: "—",
				detail: "Waiting for the first provider routing snapshot",
			},
		];
	}

	const runningSessions = sessions.filter(
		(session) => session.status === "running",
	).length;
	const actionableProviders = providers.filter(
		(provider) => provider.configured,
	).length;
	const degradedProviders = providers.filter((provider) =>
		isProviderDegraded(provider),
	).length;

	return [
		{
			label: "MCP servers",
			value: `${mcpStatus.connectedCount}/${mcpStatus.serverCount}`,
			detail: `${mcpStatus.toolCount} tools indexed across the router`,
		},
		{
			label: "Supervised sessions",
			value: `${runningSessions}/${sessions.length}`,
			detail:
				runningSessions > 0
					? "running right now"
					: "waiting for operator action",
		},
		{
			label: "Configured providers",
			value: `${actionableProviders}`,
			detail:
				actionableProviders === 0
					? "configure your first provider"
					: degradedProviders > 0
						? `${degradedProviders} need attention`
						: "all configured providers look healthy",
		},
	];
}

export function buildStartupChecklist(
	startupStatus: DashboardStartupStatus,
	isBootstrapping = false,
	installSurfaceArtifacts?: DashboardInstallSurfaceArtifact[] | null,
): StartupChecklistItem[] {
	const includeInstallArtifactsCheck = installSurfaceArtifacts !== undefined;

	if (isBootstrapping) {
		const checklistItems: StartupChecklistItem[] = [
			{
				label: "Cached inventory",
				ready: false,
				detail: "Waiting for the first live startup snapshot from core.",
			},
			{
				label: "Resident MCP runtime",
				ready: false,
				detail: "Waiting for the first live startup snapshot from core.",
			},
			{
				label: "Memory / context",
				ready: false,
				detail: "Waiting for the first live startup snapshot from core.",
			},
			{
				label: "Session restore",
				ready: false,
				detail: "Waiting for the first live startup snapshot from core.",
			},
			{
				label: "Client bridge",
				ready: false,
				detail: "Waiting for the first live startup snapshot from core.",
			},
			{
				label: "Execution environment",
				ready: false,
				detail: "Waiting for the first live startup snapshot from core.",
			},
		];

		if (includeInstallArtifactsCheck) {
			checklistItems.splice(5, 0, {
				label: "Extension install artifacts",
				ready: false,
				detail:
					"Detecting Chromium and Firefox extension install artifacts from the workspace.",
			});
		}

		return checklistItems;
	}

	const checks = getStartupChecks(startupStatus);
	const aggregator = checks.mcpAggregator;
	const memory = checks.memory;
	const restore = checks.sessionSupervisor.restore;
	const extensionBridge = checks.extensionBridge;
	const executionEnvironment = checks.executionEnvironment;
	const bridgeClientLabel = `${extensionBridge.clientCount} connected bridge client${extensionBridge.clientCount === 1 ? "" : "s"}`;
	const executionDetail = executionEnvironment.preferredShellLabel
		? `${executionEnvironment.preferredShellLabel} preferred · ${executionEnvironment.verifiedToolCount}/${executionEnvironment.toolCount} verified tools`
		: `${executionEnvironment.verifiedShellCount}/${executionEnvironment.shellCount} verified shells · ${executionEnvironment.verifiedToolCount}/${executionEnvironment.toolCount} verified tools`;

	const checklistItems: StartupChecklistItem[] = [
		{
			label: "Cached inventory",
			ready: aggregator.inventoryReady,
			detail: getCachedInventoryDetail(aggregator),
		},
		{
			label: "Resident MCP runtime",
			ready:
				aggregator.residentReady ?? aggregator.liveReady ?? aggregator.ready,
			detail: getResidentMcpDetail(aggregator),
		},
		{
			label: "Memory / context",
			ready: memory.ready,
			detail: getMemoryContextDetail(memory),
		},
		{
			label: "Session restore",
			ready: checks.sessionSupervisor.ready,
			detail: restore
				? `${restore.restoredSessionCount} restored · ${restore.autoResumeCount} auto-resumed`
				: "Waiting for supervisor restore",
		},
		{
			label: "Client bridge",
			ready: extensionBridge.ready,
			detail: extensionBridge.ready
				? `${bridgeClientLabel} · browser/editor bridge listener ready for new clients`
				: "Browser/editor bridge listener is offline",
		},
		{
			label: "Execution environment",
			ready: executionEnvironment.ready,
			detail: executionDetail,
		},
	];

	if (includeInstallArtifactsCheck) {
		const artifactSummary = getDashboardBrowserExtensionArtifactSummary(
			installSurfaceArtifacts,
		);
		checklistItems.splice(5, 0, {
			label: "Extension install artifacts",
			ready: artifactSummary.allReady,
			detail: getDashboardBrowserExtensionArtifactDetail(
				installSurfaceArtifacts,
			),
		});
	}

	return checklistItems;
}

export function buildDashboardAlerts(
	mcpStatus: DashboardStatusSummary,
	startupStatus: DashboardStartupStatus,
	servers: DashboardServerSummary[],
	providers: DashboardProviderSummary[],
	sessions: DashboardSessionSummary[],
	isBootstrapping = false,
	installSurfaceArtifacts?: DashboardInstallSurfaceArtifact[] | null,
): DashboardAlert[] {
	if (isBootstrapping) {
		return [];
	}

	const checks = getStartupChecks(startupStatus);
	const alerts: DashboardAlert[] = [];
	const startupPendingCount = buildStartupChecklist(
		startupStatus,
		false,
		installSurfaceArtifacts,
	).filter((item) => !item.ready).length;
	const disconnectedServers = servers.filter(
		(server) => server.status !== "connected",
	).length;
	const degradedProviders = providers.filter((provider) =>
		isProviderDegraded(provider),
	).length;
	const erroredSessions = sessions.filter(
		(session) => session.status === "error",
	).length;
	const startupSummary = startupStatus.summary?.trim();

	if (!mcpStatus.initialized) {
		alerts.push({
			id: "router-offline",
			severity: "critical",
			title: "MCP router is not initialized",
			detail:
				"Core has not finished bringing the router online yet, so tools may be unavailable.",
			href: "/dashboard/mcp",
			hrefLabel: "Inspect MCP router",
		});
	} else if (
		((checks.mcpAggregator.advertisedAlwaysOnServerCount ?? 0) > 0 &&
			(checks.mcpAggregator.residentConnectedCount ?? 0) === 0 &&
			checks.mcpAggregator.liveReady) ??
		checks.mcpAggregator.ready
	) {
		alerts.push({
			id: "router-disconnected",
			severity: "critical",
			title: "All resident MCP servers are disconnected",
			detail: `${checks.mcpAggregator.advertisedAlwaysOnServerCount ?? 0} always-on server${(checks.mcpAggregator.advertisedAlwaysOnServerCount ?? 0) === 1 ? "" : "s"} should be warm, but none are currently connected.`,
			href: "/dashboard/mcp",
			hrefLabel: "Inspect MCP router",
		});
	} else if (disconnectedServers > 0) {
		alerts.push({
			id: "server-degraded",
			severity: "warning",
			title: "Some MCP servers need attention",
			detail: `${disconnectedServers} server${disconnectedServers === 1 ? "" : "s"} ${disconnectedServers === 1 ? "is" : "are"} not fully connected.`,
			href: "/dashboard/mcp",
			hrefLabel: "Open server health",
		});
	}

	if (startupStatus.status === "degraded") {
		alerts.push({
			id: "startup-compat-fallback",
			severity: "warning",
			title: "Startup is using local compat fallback",
			detail:
				startupSummary ||
				"Live startup telemetry is unavailable, so HyperNexus is showing config-backed compatibility state instead of the full core startup contract.",
			href: "/dashboard/mcp/system",
			hrefLabel: "Review startup status",
		});
	} else if (startupPendingCount > 0) {
		alerts.push({
			id: "startup-pending",
			severity: startupStatus.ready ? "info" : "warning",
			title: startupStatus.ready
				? "Background startup checks still reporting pending"
				: "Startup sequence is still warming up",
			detail: `${startupPendingCount} startup check${startupPendingCount === 1 ? "" : "s"} ${startupPendingCount === 1 ? "is" : "are"} not ready yet.`,
			href: "/dashboard",
			hrefLabel: "Review startup readiness",
		});
	}

	if (degradedProviders > 0) {
		alerts.push({
			id: "provider-degraded",
			severity: degradedProviders > 1 ? "critical" : "warning",
			title: "Provider routing has degraded capacity",
			detail: `${degradedProviders} configured provider${degradedProviders === 1 ? "" : "s"} ${degradedProviders === 1 ? "needs" : "need"} attention before fallback narrows.`,
			href: "/dashboard/billing",
			hrefLabel: "Review providers",
		});
	}

	if (erroredSessions > 0) {
		alerts.push({
			id: "session-errors",
			severity: "critical",
			title: "Supervised sessions have failed",
			detail: `${erroredSessions} session${erroredSessions === 1 ? "" : "s"} ${erroredSessions === 1 ? "is" : "are"} in an error state and may need restart or log review.`,
			href: "/dashboard/session",
			hrefLabel: "Open sessions",
		});
	}

	return alerts.sort((left, right) => {
		const order = { critical: 0, warning: 1, info: 2 } as const;
		return order[left.severity] - order[right.severity];
	});
}

export function getServerTone(status: string): string {
	switch (status) {
		case "connected":
			return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
		case "connecting":
		case "restarting":
			return "border-amber-500/30 bg-amber-500/10 text-amber-200";
		case "error":
			return "border-rose-500/30 bg-rose-500/10 text-rose-200";
		default:
			return "border-slate-500/30 bg-slate-500/10 text-slate-200";
	}
}

export function getSessionTone(status: DashboardSessionSummary["status"]): string {
	switch (status) {
		case "running":
			return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
		case "starting":
		case "restarting":
			return "border-amber-500/30 bg-amber-500/10 text-amber-200";
		case "error":
			return "border-rose-500/30 bg-rose-500/10 text-rose-200";
		default:
			return "border-slate-500/30 bg-slate-500/10 text-slate-200";
	}
}

export function getProviderTone(provider: DashboardProviderSummary): string {
	if (!provider.configured) {
		return "border-slate-500/30 bg-slate-500/10 text-slate-200";
	}

	if (isProviderDegraded(provider)) {
		return "border-rose-500/30 bg-rose-500/10 text-rose-200";
	}

	return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
}

export function formatQuotaValue(value: number | null): string {
	if (value === null) {
		return "—";
	}

	return value.toLocaleString();
}

export function formatFallbackLabel(entry: DashboardFallbackSummary): string {
	return entry.model ? `${entry.provider} · ${entry.model}` : entry.provider;
}

export function getAlertTone(severity: DashboardAlert["severity"]): string {
	switch (severity) {
		case "critical":
			return "border-rose-500/30 bg-rose-500/10 text-rose-200";
		case "warning":
			return "border-amber-500/30 bg-amber-500/10 text-amber-200";
		default:
			return "border-cyan-500/30 bg-cyan-500/10 text-cyan-200";
	}
}
