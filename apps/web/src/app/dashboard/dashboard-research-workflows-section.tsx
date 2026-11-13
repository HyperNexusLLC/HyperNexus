"use client";

import ResearchPage from "./research/view";

export function DashboardResearchWorkflowsSection({
	swarmRunning,
	triggerSwarmGen,
}: {
	swarmRunning: boolean;
	triggerSwarmGen: () => void;
}) {
	return (
		<>
				{/* SECTION: SWARM & WORKFLOWS PIPELINES */}
				<div
					id="research-workflows"
					className="scroll-mt-6 space-y-4 pt-8 border-t border-slate-800"
				>
					<div className="flex items-center justify-between border-b border-slate-800 pb-2">
						<h2 title="Topic research center, swarm code-generation queue and topology" className="text-lg font-bold text-white tracking-wide">
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
		</>
	);
}
