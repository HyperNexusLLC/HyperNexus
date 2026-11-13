import type {
	DashboardStartupStatus,
	StartupBlockingReasonAction,
	StartupBlockingReasonGroup,
	StartupBlockingReasonImpactedCheck,
	StartupBlockingReasonPriorityCounts,
	StartupBlockingReasonView,
	StartupBlockingReasonWithPriority,
} from "./dashboard-home-view";

const STARTUP_BLOCKING_REASON_GROUP_ORDER: Record<string, number> = {
	mcp: 0,
	memory: 1,
	sessions: 2,
	integrations: 3,
	startup: 4,
};

export function getStartupBlockingReasons(
	startupStatus: DashboardStartupStatus,
): StartupBlockingReasonView[] {
	if (!Array.isArray(startupStatus.blockingReasons)) {
		return [];
	}

	return startupStatus.blockingReasons
		.filter((reason): reason is StartupBlockingReasonView =>
			Boolean(
				reason &&
					typeof reason.code === "string" &&
					typeof reason.detail === "string",
			),
		)
		.map((reason) => ({
			code: reason.code,
			detail: reason.detail,
		}));
}

export function getStartupBlockingReasonAction(
	code: string,
): StartupBlockingReasonAction {
	switch (code) {
		case "mcp_aggregator_not_initialized":
		case "mcp_inventory_not_ready":
		case "mcp_resident_runtime_not_ready":
		case "mcp_config_sync_pending":
			return {
				href: "/dashboard/mcp/system",
				label: "Open MCP system",
			};
		case "memory_not_ready":
		case "claude_mem_not_ready":
			return {
				href: "/dashboard/memory",
				label: "Open memory dashboard",
			};
		case "browser_service_not_ready":
		case "extension_bridge_not_ready":
		case "execution_environment_not_ready":
			return {
				href: "/dashboard/integrations",
				label: "Open Integration Hub",
			};
		case "session_restore_not_ready":
			return {
				href: "/dashboard/session",
				label: "Open sessions",
			};
		default:
			return {
				href: "/dashboard",
				label: "Open startup overview",
			};
	}
}

export function getStartupBlockingReasonImpactedChecks(
	code: string,
): StartupBlockingReasonImpactedCheck[] {
	switch (code) {
		case "mcp_aggregator_not_initialized":
		case "mcp_inventory_not_ready":
			return [
				{ key: "cached-inventory", label: "Cached inventory" },
				{ key: "resident-runtime", label: "Resident MCP runtime" },
			];
		case "mcp_resident_runtime_not_ready":
			return [{ key: "resident-runtime", label: "Resident MCP runtime" }];
		case "mcp_config_sync_pending":
			return [{ key: "cached-inventory", label: "Cached inventory" }];
		case "memory_not_ready":
		case "claude_mem_not_ready":
			return [{ key: "memory-context", label: "Memory / context" }];
		case "session_restore_not_ready":
			return [{ key: "session-restore", label: "Session restore" }];
		case "browser_service_not_ready":
		case "extension_bridge_not_ready":
			return [{ key: "client-bridge", label: "Client bridge" }];
		case "execution_environment_not_ready":
			return [{ key: "execution-environment", label: "Execution environment" }];
		default:
			return [];
	}
}

export function getStartupBlockingReasonGroupImpactedChecks(
	reasons: StartupBlockingReasonWithPriority[],
): StartupBlockingReasonImpactedCheck[] {
	const seen = new Set<string>();
	const impactedChecks: StartupBlockingReasonImpactedCheck[] = [];

	for (const reason of reasons) {
		const checks = getStartupBlockingReasonImpactedChecks(reason.code);
		for (const check of checks) {
			if (seen.has(check.key)) {
				continue;
			}

			seen.add(check.key);
			impactedChecks.push(check);
		}
	}

	return impactedChecks;
}

export function getStartupBlockingReasonSubsystem(code: string): {
	key: string;
	label: string;
} {
	switch (code) {
		case "mcp_aggregator_not_initialized":
		case "mcp_inventory_not_ready":
		case "mcp_resident_runtime_not_ready":
		case "mcp_config_sync_pending":
			return {
				key: "mcp",
				label: "MCP router",
			};
		case "memory_not_ready":
		case "claude_mem_not_ready":
			return {
				key: "memory",
				label: "Memory / context",
			};
		case "session_restore_not_ready":
			return {
				key: "sessions",
				label: "Session supervisor",
			};
		case "browser_service_not_ready":
		case "extension_bridge_not_ready":
		case "execution_environment_not_ready":
			return {
				key: "integrations",
				label: "Integrations",
			};
		default:
			return {
				key: "startup",
				label: "Startup platform",
			};
	}
}

export function getStartupBlockingReasonTitle(code: string): string {
	switch (code) {
		case "mcp_aggregator_not_initialized":
			return "MCP router is not initialized";
		case "mcp_inventory_not_ready":
			return "Cached MCP inventory is not ready";
		case "mcp_resident_runtime_not_ready":
			return "Resident MCP runtime is still warming";
		case "mcp_config_sync_pending":
			return "MCP config sync is still pending";
		case "memory_not_ready":
			return "Memory manager is still initializing";
		case "claude_mem_not_ready":
			return "HyperNexus default sections are not ready";
		case "browser_service_not_ready":
			return "Browser service bridge is not ready";
		case "extension_bridge_not_ready":
			return "Extension bridge listener is offline";
		case "execution_environment_not_ready":
			return "Execution environment verification is incomplete";
		case "session_restore_not_ready":
			return "Session restore has not completed yet";
		default:
			return "Startup blocker requires operator attention";
	}
}

export function getStartupBlockingReasonPriority(code: string): number {
	switch (code) {
		case "mcp_aggregator_not_initialized":
		case "mcp_resident_runtime_not_ready":
		case "execution_environment_not_ready":
			return 100;
		case "mcp_inventory_not_ready":
		case "mcp_config_sync_pending":
		case "extension_bridge_not_ready":
			return 80;
		case "memory_not_ready":
		case "claude_mem_not_ready":
		case "session_restore_not_ready":
			return 60;
		case "browser_service_not_ready":
			return 40;
		default:
			return 20;
	}
}

export function getStartupBlockingReasonPriorityLabel(
	priority: number,
): "High" | "Medium" | "Low" {
	if (priority >= 80) {
		return "High";
	}

	if (priority >= 50) {
		return "Medium";
	}

	return "Low";
}

export function getStartupBlockingReasonPriorityTone(
	priorityLabel: "High" | "Medium" | "Low",
): string {
	switch (priorityLabel) {
		case "High":
			return "border-rose-500/40 bg-rose-500/10 text-rose-100";
		case "Medium":
			return "border-amber-500/40 bg-amber-500/10 text-amber-100";
		default:
			return "border-emerald-500/40 bg-emerald-500/10 text-emerald-100";
	}
}

export function getStartupBlockingReasonPriorityCounts(
	startupBlockingReasons: StartupBlockingReasonWithPriority[],
): StartupBlockingReasonPriorityCounts {
	return startupBlockingReasons.reduce<StartupBlockingReasonPriorityCounts>(
		(counts, reason) => {
			const label = getStartupBlockingReasonPriorityLabel(reason.priority);
			if (label === "High") {
				counts.high += 1;
			} else if (label === "Medium") {
				counts.medium += 1;
			} else {
				counts.low += 1;
			}

			return counts;
		},
		{
			high: 0,
			medium: 0,
			low: 0,
		},
	);
}

export function getPrioritizedStartupBlockingReasons(
	startupBlockingReasons: StartupBlockingReasonView[],
): StartupBlockingReasonWithPriority[] {
	return startupBlockingReasons
		.map((reason, index) => ({
			...reason,
			priority: getStartupBlockingReasonPriority(reason.code),
			index,
		}))
		.sort((left, right) => {
			if (right.priority !== left.priority) {
				return right.priority - left.priority;
			}

			return left.index - right.index;
		})
		.map(({ index: _index, ...reason }) => reason);
}

export function getGroupedStartupBlockingReasons(
	startupBlockingReasons: StartupBlockingReasonWithPriority[],
): StartupBlockingReasonGroup[] {
	const groups = new Map<string, StartupBlockingReasonGroup>();

	for (const reason of startupBlockingReasons) {
		const subsystem = getStartupBlockingReasonSubsystem(reason.code);
		const existingGroup = groups.get(subsystem.key);
		if (existingGroup) {
			existingGroup.reasons.push(reason);
			continue;
		}

		groups.set(subsystem.key, {
			key: subsystem.key,
			label: subsystem.label,
			reasons: [reason],
		});
	}

	return Array.from(groups.values()).sort((left, right) => {
		const leftOrder =
			STARTUP_BLOCKING_REASON_GROUP_ORDER[left.key] ?? Number.MAX_SAFE_INTEGER;
		const rightOrder =
			STARTUP_BLOCKING_REASON_GROUP_ORDER[right.key] ?? Number.MAX_SAFE_INTEGER;
		if (leftOrder !== rightOrder) {
			return leftOrder - rightOrder;
		}

		return left.label.localeCompare(right.label);
	});
}

export function getStartupBlockingReasonGroupSeverity(
	reasons: StartupBlockingReasonWithPriority[],
): "High" | "Medium" | "Low" {
	const maxPriority = reasons.reduce(
		(highest, reason) => Math.max(highest, reason.priority),
		0,
	);
	return getStartupBlockingReasonPriorityLabel(maxPriority);
}

export function getStartupBlockingReasonGroupTopAction(
	reasons: StartupBlockingReasonWithPriority[],
): StartupBlockingReasonAction | null {
	if (reasons.length === 0) {
		return null;
	}

	const topReason = reasons.reduce(
		(selected, reason) => {
			if (!selected) {
				return reason;
			}

			return reason.priority > selected.priority ? reason : selected;
		},
		null as StartupBlockingReasonWithPriority | null,
	);

	return topReason ? getStartupBlockingReasonAction(topReason.code) : null;
}

export function getStartupBlockingReasonGroupPrimaryReason(
	reasons: StartupBlockingReasonWithPriority[],
): StartupBlockingReasonWithPriority | null {
	if (reasons.length === 0) {
		return null;
	}

	return reasons.reduce(
		(selected, reason) => {
			if (!selected) {
				return reason;
			}

			return reason.priority > selected.priority ? reason : selected;
		},
		null as StartupBlockingReasonWithPriority | null,
	);
}

export function getStartupBlockingReasonGroupPriorityCounts(
	reasons: StartupBlockingReasonWithPriority[],
): StartupBlockingReasonPriorityCounts {
	return getStartupBlockingReasonPriorityCounts(reasons);
}

export function getStartupBlockingReasonActions(
	startupBlockingReasons: StartupBlockingReasonView[],
): StartupBlockingReasonAction[] {
	const seen = new Set<string>();
	const actions: StartupBlockingReasonAction[] = [];

	for (const reason of startupBlockingReasons) {
		const action = getStartupBlockingReasonAction(reason.code);
		const key = `${action.href}|${action.label}`;
		if (seen.has(key)) {
			continue;
		}

		seen.add(key);
		actions.push(action);
	}

	return actions;
}
