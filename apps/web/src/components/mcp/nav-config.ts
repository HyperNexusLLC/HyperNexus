import {
	Server,
	LayoutDashboard,
	Database,
	Globe,
	Key,
	Shield,
	Terminal,
	Settings,
	Search,
	Users,
	Brain,
	Scroll,
	Library,
	FileCode2,
	Workflow,
	Power,
	FlaskRound,
	Wrench,
	Download,
	GitBranch,
	BookOpen,
	Network,
	Radio,
	Eye,
	BarChart3,
	Cloud,
	Bug,
	Webhook,
	Bot,
	Cpu,
	DownloadCloud,
	Command,
	Snowflake,
	FileUp,
	TrendingUp,
} from "lucide-react";

export interface NavItem {
	title: string;
	href: string;
	icon: any;
	variant: "default" | "ghost";
	tooltip?: string;
}

export interface NavSection {
	title: string;
	items: NavItem[];
}

// ── Anchor sections within the single dashboard page ──
// These map to <section id="..."> anchors in dashboard-home-view.tsx
const A = {
	mission: "/dashboard#mission-control",
	memory: "/dashboard#memory-graphrag",
	mcp: "/dashboard#mcp-registry",
	workflows: "/dashboard#research-workflows",
	integrations: "/dashboard#integrations",
	settings: "/dashboard#governance-billing",
	healer: "/dashboard#healer-cognition",
	coordination: "/dashboard#cross-session-coordination",
} as const;

export const META_MCP_NAV: NavItem[] = [
	{
		title: "MCP Dashboard",
		href: "/dashboard?tab=page-b",
		icon: Server,
		variant: "default",
		tooltip:
			"MCP server overview: connected servers, tool counts, lifecycle status",
	},
	{
		title: "Always-On Tools",
		href: "/dashboard?tab=page-b",
		icon: Power,
		variant: "ghost",
		tooltip:
			"Toggle which built-in tools are always available to the MCP client",
	},
	{
		title: "Sessions & Coordination",
		href: A.coordination,
		icon: Users,
		variant: "ghost",
		tooltip:
			"Cross-session registry, unanswered bus messages, replies, supervised sessions, and web delivery receipts",
	},
	{
		title: "MCP & Tools",
		href: A.mcp,
		icon: Server,
		variant: "ghost",
		tooltip:
			"Browse and search the full MCP tool catalog from all registered servers",
	},
	{
		title: "Tools Inspector",
		href: "/dashboard?tab=page-b",
		icon: Wrench,
		variant: "ghost",
		tooltip: "Inspect tool definitions, parameters, and schemas in detail",
	},
	{
		title: "MCP Registry",
		href: "/dashboard?tab=page-b",
		icon: Download,
		variant: "ghost",
		tooltip:
			"Discover and install new MCP servers from public registries (Glama, Smithery)",
	},
	{
		title: "Tool Chains",
		href: "/dashboard?tab=page-b",
		icon: Webhook,
		variant: "ghost",
		tooltip: "Chain multiple tools together into reusable automated workflows",
	},
	{
		title: "MCP Settings",
		href: "/dashboard?tab=page-b",
		icon: Settings,
		variant: "ghost",
		tooltip: "Configure MCP server connections, endpoints, and preferences",
	},
];

// ── Core System ──

export const MAIN_DASHBOARD_NAV: NavItem[] = [
	{
		title: "Dashboard Home",
		href: "/dashboard?tab=page-a",
		icon: LayoutDashboard,
		variant: "ghost",
		tooltip: "System overview: active sessions, recent activity, health status",
	},
	{
		title: "Swarm, Workflows & Agents",
		href: A.workflows,
		icon: Users,
		variant: "ghost",
		tooltip:
			"Multi-agent orchestration and workflow engine: missions, debates, consensus, definitions, executions, and approvals",
	},
	{
		title: "Council & Governance",
		href: "/dashboard?tab=page-b",
		icon: Shield,
		variant: "ghost",
		tooltip:
			"AI governance: council debates, approval workflow, autonomy levels, policies",
	},
	{
		title: "Healer & Auto-Repair",
		href: A.healer,
		icon: Bug,
		variant: "ghost",
		tooltip: "Self-healing: diagnose errors, auto-repair, repair history",
	},
];

// ── Tools & Code ──

export const TOOLS_NAV: NavItem[] = [
	{
		title: "Tool Catalog, Inspector, Console & Karma",
		href: A.mcp,
		icon: Search,
		variant: "ghost",
		tooltip:
			"Browse, inspect, and execute MCP and native Go tools; inspect schemas, handler health, and usage in one registry section",
	},
	{
		title: "Code Platform",
		href: A.workflows,
		icon: FileCode2,
		variant: "ghost",
		tooltip:
			"Memory system: L2 vault, spaced repetition, sleep cycle, FTS5 search",
	},
	{
		title: "Command Console",
		href: A.mission,
		icon: Command,
		variant: "ghost",
		tooltip: "CLI harness detection, command registry, shell history",
	},
];

// ── Memory & Knowledge ──

export const KNOWLEDGE_NAV: NavItem[] = [
	{
		title: "Memory Explorer & Analytics",
		href: A.memory,
		icon: Database,
		variant: "ghost",
		tooltip:
			"Full-text memory search plus tier stats, heat distribution, kind breakdown, and lifecycle analytics",
	},
	{
		title: "Cold Archive, Knowledge & Skills",
		href: A.memory,
		icon: Library,
		variant: "ghost",
		tooltip:
			"L3 cold storage, skill registry, knowledge graph, RAG ingestion, and directory browser",
	},
	{
		title: "Context & Sessions",
		href: A.coordination,
		icon: Scroll,
		variant: "ghost",
		tooltip: "Imported sessions, cross-session context, coordination activity, session export/import",
	},
	{
		title: "Session Imports",
		href: A.integrations,
		icon: DownloadCloud,
		variant: "ghost",
		tooltip:
			"AutoDev loops, code execution sandbox, LSP diagnostics, symbol search",
	},
];

// ── Infrastructure & Operations ──

export const OPERATIONS_NAV: NavItem[] = [
	{
		title: "Runtime Status",
		href: "/dashboard?tab=page-a",
		icon: Cpu,
		variant: "ghost",
		tooltip:
			"Live runtime overview: services, locks, startup readiness, imports",
	},
	{
		title: "Mesh Network",
		href: "/dashboard?tab=page-a",
		icon: Network,
		variant: "ghost",
		tooltip:
			"P2P memory sync mesh: peers, capabilities, broadcasts across machines",
	},
	{
		title: "Providers & Billing",
		href: "/dashboard?tab=page-a",
		icon: Key,
		variant: "ghost",
		tooltip:
			"LLM provider routing, fallback chains, quotas, cost history, model pricing",
	},
	{
		title: "Observability, Logs & Metrics",
		href: A.mission,
		icon: Eye,
		variant: "ghost",
		tooltip:
			"System pulse, event streams, logs, provider breakdown, routing history, and snapshots",
	},
	{
		title: "Browser Automation",
		href: "/dashboard?tab=page-a",
		icon: Globe,
		variant: "ghost",
		tooltip:
			"Browser controls: pages, history, console logs, scraping, screenshots",
	},
	{
		title: "Workflows",
		href: "/dashboard?tab=page-d",
		icon: Workflow,
		variant: "ghost",
		tooltip: "Workflow engine: definitions, executions, canvases, approvals",
	},
	{
		title: "Diagnostics & Research",
		href: "/dashboard?tab=page-c",
		icon: FlaskRound,
		variant: "ghost",
		tooltip:
			"Deep research, recursive web crawling, URL ingestion, research queue",
	},
	{
		title: "Command Console",
		href: "/dashboard?tab=page-b",
		icon: Terminal,
		variant: "ghost",
		tooltip: "CLI harness detection, command registry, shell history",
	},
	{
		title: "Healer & Auto-Repair",
		href: "/dashboard?tab=page-a",
		icon: Bug,
		variant: "ghost",
		tooltip: "Self-healing: diagnose errors, auto-repair, repair history",
	},
];

// ── Data & Integrations ──

export const DATA_NAV: NavItem[] = [
	{
		title: "Integrations, Harnesses & Cloud Dev",
		href: A.integrations,
		icon: Globe,
		variant: "ghost",
		tooltip:
			"External integrations, detected CLI harnesses, cloud dev sessions, Open WebUI, Ollama, and third-party bridges",
	},
	{
		title: "Browser Extension & DeerFlow",
		href: A.integrations,
		icon: Bot,
		variant: "ghost",
		tooltip: "Browser extension bridge, DOM parsing, DeerFlow models, skills, and memory status",
	},
	{
		title: "DeerFlow",
		href: "/dashboard?tab=page-a",
		icon: Radio,
		variant: "ghost",
		tooltip: "DeerFlow bridge: models, skills, memory status",
	},
	{
		title: "Integrations Hub",
		href: "/dashboard?tab=page-a",
		icon: Globe,
		variant: "ghost",
		tooltip:
			"External integrations: Open WebUI, Ollama, and third-party bridges",
	},
	{
		title: "Git Chronicle",
		href: "/dashboard?tab=page-a",
		icon: GitBranch,
		variant: "ghost",
		tooltip: "Git history, commit log, repository change tracking",
	},
];

// ── Security, Settings & Admin ──

export const ADMIN_NAV: NavItem[] = [
	{
		title: "API Keys & Auth",
		href: "/dashboard?tab=page-a",
		icon: Key,
		variant: "ghost",
		tooltip: "Manage API keys, OAuth clients, authentication providers",
	},
	{
		title: "Security & Audits",
		href: "/dashboard?tab=page-a",
		icon: Shield,
		variant: "ghost",
		tooltip: "Audit logs, security policies, access control, compliance",
	},
	{
		title: "User Manual",
		href: "/dashboard?tab=page-a",
		icon: BookOpen,
		variant: "ghost",
		tooltip: "Built-in documentation for all TormentNexus features",
	},
	{
		title: "Global Settings",
		href: "/dashboard?tab=page-a",
		icon: Settings,
		variant: "ghost",
		tooltip: "System settings: environment, providers, config files",
	},
];

export const SIDEBAR_SECTIONS: NavSection[] = [
	{
		title: "Agent Core",
		items: MAIN_DASHBOARD_NAV,
	},
	{
		title: "MCP Control",
		items: META_MCP_NAV,
	},
	{
		title: "Infrastructure",
		items: OPERATIONS_NAV,
	},
	{
		title: "Data & Integrations",
		items: DATA_NAV,
	},
	{
		title: "Admin",
		items: ADMIN_NAV,
	},
];
