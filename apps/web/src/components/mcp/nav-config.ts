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
		title: "Swarm, Workflows & Agents",
		href: A.workflows,
		icon: Users,
		variant: "ghost",
		tooltip:
			"Multi-agent orchestration and workflow engine: missions, debates, consensus, definitions, executions, and approvals",
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
		title: "Observability, Logs & Metrics",
		href: A.mission,
		icon: Eye,
		variant: "ghost",
		tooltip:
			"System pulse, event streams, logs, provider breakdown, routing history, and snapshots",
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
		title: "Git Chronicle",
		href: A.integrations,
		icon: GitBranch,
		variant: "ghost",
		tooltip: "Git history, commit log, repository change tracking",
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
