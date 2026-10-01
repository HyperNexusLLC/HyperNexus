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
} as const;

// ── High-Value Core (most prominent, first) ──

export const CORE_NAV: NavItem[] = [
	{
		title: "Dashboard Home",
		href: "/dashboard",
		icon: LayoutDashboard,
		variant: "default",
		tooltip:
			"Full system overview: active sessions, MCP servers, health status, recent activity",
	},
	{
		title: "Mission Control",
		href: A.mission,
		icon: Cpu,
		variant: "ghost",
		tooltip:
			"Live runtime status: services, locks, startup readiness, session management, healer",
	},
	{
		title: "MCP & Tools",
		href: A.mcp,
		icon: Server,
		variant: "ghost",
		tooltip:
			"MCP server registry, tool catalog, inspector, always-on tools, tool chains",
	},
	{
		title: "Memory & GraphRAG",
		href: A.memory,
		icon: Brain,
		variant: "ghost",
		tooltip:
			"L2 vault, spaced repetition, sleep cycle, FTS5 search, knowledge graph, cold archive",
	},
];

// ── Agents & Automation ──

export const AGENTS_NAV: NavItem[] = [
	{
		title: "Swarm & Agents",
		href: A.workflows,
		icon: Users,
		variant: "ghost",
		tooltip:
			"Multi-agent orchestration: missions, debates, consensus, agent management",
	},
	{
		title: "Workflows",
		href: A.workflows,
		icon: Workflow,
		variant: "ghost",
		tooltip: "Workflow engine: definitions, executions, canvases, approvals",
	},
	{
		title: "Council & Governance",
		href: A.settings,
		icon: Shield,
		variant: "ghost",
		tooltip:
			"AI governance: council debates, approval workflow, autonomy levels, policies",
	},
	{
		title: "Healer & Auto-Repair",
		href: A.mission,
		icon: Bug,
		variant: "ghost",
		tooltip: "Self-healing: diagnose errors, auto-repair, repair history",
	},
];

// ── Tools & Code ──

export const TOOLS_NAV: NavItem[] = [
	{
		title: "Tool Catalog",
		href: A.mcp,
		icon: Search,
		variant: "ghost",
		tooltip: "Browse and search the full MCP tool catalog from all registered servers",
	},
	{
		title: "Tools Inspector",
		href: A.mcp,
		icon: Wrench,
		variant: "ghost",
		tooltip: "Inspect tool definitions, parameters, and schemas in detail",
	},
	{
		title: "Tool Console",
		href: A.mcp,
		icon: Terminal,
		variant: "ghost",
		tooltip: "Browse, inspect, and execute native Go tools interactively",
	},
	{
		title: "Tool Karma",
		href: A.mcp,
		icon: Wrench,
		variant: "ghost",
		tooltip: "Native Go tool registry, handler health, and usage tracking",
	},
	{
		title: "Code Platform",
		href: A.workflows,
		icon: FileCode2,
		variant: "ghost",
		tooltip:
			"AutoDev loops, code execution sandbox, LSP diagnostics, symbol search",
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
		title: "Memory Explorer",
		href: A.memory,
		icon: Database,
		variant: "ghost",
		tooltip: "Full-text search across 86K+ memories with L4 limbo management",
	},
	{
		title: "Memory Analytics",
		href: A.memory,
		icon: TrendingUp,
		variant: "ghost",
		tooltip:
			"Tier stats, heat distribution, kind breakdown, lifecycle pipeline",
	},
	{
		title: "Cold Archive",
		href: A.memory,
		icon: Snowflake,
		variant: "ghost",
		tooltip: "L3 cold storage for low-heat memories: browse, search, promote",
	},
	{
		title: "Knowledge & Skills",
		href: A.memory,
		icon: Library,
		variant: "ghost",
		tooltip:
			"Skill registry, knowledge graph, RAG ingestion, and directory browser",
	},
	{
		title: "Context & Sessions",
		href: A.memory,
		icon: Scroll,
		variant: "ghost",
		tooltip: "Imported sessions, context management, session export/import",
	},
	{
		title: "Session Imports",
		href: A.integrations,
		icon: DownloadCloud,
		variant: "ghost",
		tooltip:
			"Import external sessions from Claude, Gemini, Aider, and other tools",
	},
];

// ── Infrastructure & Operations ──

export const INFRA_NAV: NavItem[] = [
	{
		title: "Providers & Billing",
		href: A.settings,
		icon: Key,
		variant: "ghost",
		tooltip:
			"LLM provider routing, fallback chains, quotas, cost history, model pricing",
	},
	{
		title: "Observability",
		href: A.mission,
		icon: Eye,
		variant: "ghost",
		tooltip:
			"System pulse: event streams, provider status, real-time monitoring",
	},
	{
		title: "Logs & Metrics",
		href: A.mission,
		icon: BarChart3,
		variant: "ghost",
		tooltip:
			"System logs, provider breakdown, routing history, system snapshots",
	},
	{
		title: "Mesh Network",
		href: A.integrations,
		icon: Network,
		variant: "ghost",
		tooltip:
			"P2P memory sync mesh: peers, capabilities, broadcasts across machines",
	},
	{
		title: "Browser Automation",
		href: A.integrations,
		icon: Globe,
		variant: "ghost",
		tooltip:
			"Browser controls: pages, history, console logs, scraping, screenshots",
	},
	{
		title: "Diagnostics & Research",
		href: A.workflows,
		icon: FlaskRound,
		variant: "ghost",
		tooltip:
			"Deep research, recursive web crawling, URL ingestion, research queue",
	},
];

// ── Integrations & Data ──

export const DATA_NAV: NavItem[] = [
	{
		title: "Integrations Hub",
		href: A.integrations,
		icon: Globe,
		variant: "ghost",
		tooltip:
			"External integrations: Open WebUI, Ollama, and third-party bridges",
	},
	{
		title: "CLI Harnesses",
		href: A.integrations,
		icon: Command,
		variant: "ghost",
		tooltip: "Detected CLI harnesses: versions, capabilities, install surfaces",
	},
	{
		title: "Browser Extension",
		href: A.integrations,
		icon: Bot,
		variant: "ghost",
		tooltip: "Browser extension bridge: memories, DOM parsing, stats",
	},
	{
		title: "Cloud Development",
		href: A.integrations,
		icon: Cloud,
		variant: "ghost",
		tooltip: "Cloud dev sessions: providers, messages, plans, logs",
	},
	{
		title: "Git Chronicle",
		href: A.integrations,
		icon: GitBranch,
		variant: "ghost",
		tooltip: "Git history, commit log, repository change tracking",
	},
	{
		title: "DeerFlow",
		href: A.integrations,
		icon: Radio,
		variant: "ghost",
		tooltip: "DeerFlow bridge: models, skills, memory status",
	},
];

// ── Admin & Settings ──

export const ADMIN_NAV: NavItem[] = [
	{
		title: "Global Settings",
		href: A.settings,
		icon: Settings,
		variant: "default",
		tooltip: "System settings: environment, providers, config files",
	},
	{
		title: "API Keys & Auth",
		href: A.settings,
		icon: Key,
		variant: "ghost",
		tooltip: "Manage API keys, OAuth clients, authentication providers",
	},
	{
		title: "Security & Audits",
		href: A.settings,
		icon: Shield,
		variant: "ghost",
		tooltip: "Audit logs, security policies, access control, compliance",
	},
	{
		title: "User Manual",
		href: A.settings,
		icon: BookOpen,
		variant: "ghost",
		tooltip: "Built-in documentation for all HyperNexus features",
	},
];

export const SIDEBAR_SECTIONS: NavSection[] = [
	{
		title: "Overview",
		items: CORE_NAV,
	},
	{
		title: "Agents & Automation",
		items: AGENTS_NAV,
	},
	{
		title: "Tools & Code",
		items: TOOLS_NAV,
	},
	{
		title: "Memory & Knowledge",
		items: KNOWLEDGE_NAV,
	},
	{
		title: "Infrastructure",
		items: INFRA_NAV,
	},
	{
		title: "Integrations",
		items: DATA_NAV,
	},
	{
		title: "Admin",
		items: ADMIN_NAV,
	},
];
