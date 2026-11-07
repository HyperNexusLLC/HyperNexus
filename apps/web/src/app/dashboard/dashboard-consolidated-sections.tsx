import HealthDashboard from "./health/view";
import MetricsPage from "./metrics/view";
import SkillsPage from "./skills/view";
import WorkflowsPage from "./workflows/view";
import HealerDashboard from "./healer/view";
import AuditDashboard from "./audit/view";
import SecurityPage from "./security/view";
import CognitiveBrainDashboard from "./brain/view";
import PulsePage from "./pulse/view";

export function DashboardConsolidatedSections() {
	return (
		<>
			{/* ── Consolidated high-value views ── */}
			<section id="health-metrics" className="scroll-mt-6 space-y-4" data-testid="section-health-metrics" aria-label="Health and metrics">
				<h2 className="text-lg font-bold text-white tracking-wide" title="Live kernel, MCP, and pipeline health. Red = backend down, never mocked.">
					📊 Health &amp; Metrics
				</h2>
				<p className="text-xs text-slate-400" title="HealthDashboard/MetricsPage/PulsePage stream from the Go kernel via /api/go/. Unreachable backends render an error state.">
					System health monitoring, performance metrics, and pulse observability. Live from the Go kernel — shows loading, error, and empty states, never reassuring fiction.
				</p>
				<div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4" title="Kernel + service liveness, latency, and uptime" data-testid="health-dashboard-wrap">
					<HealthDashboard />
				</div>
				<div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4" title="Time-series performance metrics (p50/p95, throughput, errors)" data-testid="metrics-page-wrap">
					<MetricsPage />
				</div>
				<div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4" title="Pulse observability: recent activity heartbeat and stall detection" data-testid="pulse-page-wrap">
					<PulsePage />
				</div>
			</section>

			<section id="skills-workflows" className="scroll-mt-6 space-y-4" data-testid="section-skills-workflows" aria-label="Skills and workflows">
				<h2 className="text-lg font-bold text-white tracking-wide" title="Registered agent skills and runnable workflows. Empty registry renders an empty state, not a spinner.">
					⚡ Skills &amp; Workflows
				</h2>
				<p className="text-xs text-slate-400" title="SkillsPage lists the skill registry; WorkflowsPage runs RECALL→DISCOVER→EXECUTE→PERSIST→VERIFY chains.">
					Agent skills registry, workflow engine, and autonomous orchestration. Each card handles loading, error (kernel down), and empty (no skills yet) states.
				</p>
				<div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4" title="Skill registry: name, description, version, and enablement" data-testid="skills-page-wrap">
					<SkillsPage />
				</div>
				<div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4" title="Workflow engine: multi-step orchestration runs with persist + verify" data-testid="workflows-page-wrap">
					<WorkflowsPage />
				</div>
			</section>

			<section id="security-audit" className="scroll-mt-6 space-y-4" data-testid="section-security-audit" aria-label="Security and audit">
				<h2 className="text-lg font-bold text-white tracking-wide" title="RBAC policy, audit trail, and compliance. Denied actions log here.">
					🔒 Security &amp; Audit
				</h2>
				<p className="text-xs text-slate-400" title="SecurityPage shows policy + RBAC; AuditDashboard streams the append-only audit log.">
					Security policies, audit logging, and compliance tracking. Policy denials and key rotations appear here first.
				</p>
				<div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4" title="Security posture: policies, RBAC gates, and key hygiene" data-testid="security-page-wrap">
					<SecurityPage />
				</div>
				<div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4" title="Audit trail: who did what, when — filterable, exportable" data-testid="audit-dashboard-wrap">
					<AuditDashboard />
				</div>
			</section>

			<section id="healer-cognition" className="scroll-mt-6 space-y-4">
				<h2 className="text-lg font-bold text-white tracking-wide">
					🧠 Cognition &amp; Self-Healing
				</h2>
				<p className="text-xs text-slate-400">
					Cognitive brain dashboard and autonomous self-healing system.
				</p>
				<div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
					<CognitiveBrainDashboard />
				</div>
				<div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
					<HealerDashboard />
				</div>
			</section>
		</>
	);
}
