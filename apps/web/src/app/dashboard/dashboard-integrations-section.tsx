import type { ReactNode } from "react";
import CloudOrchestratorDashboardPage from "./cloud-orchestrator/view";
import { DashboardConsolidatedSections } from "./dashboard-consolidated-sections";
import ManualPage from "./manual/view";

export interface DashboardIntegrationsSectionProps {
	installArtifacts: unknown;
	browserStatus: unknown;
	children?: ReactNode;
}

export function DashboardIntegrationsSection({
	installArtifacts,
	browserStatus,
	children,
}: DashboardIntegrationsSectionProps) {
	return (
			<div
				id="integrations"
				className="scroll-mt-6 space-y-4 pt-8 pb-8 border-t border-slate-800"
			>
				<div className="flex items-center justify-between border-b border-slate-800 pb-2">
					<h2 title="External services, target surfaces and consolidated integration panels" className="text-lg font-bold text-white tracking-wide font-mono">
						Integration Hub &amp; Target Surfaces
					</h2>
					<span className="text-[10px] text-cyan-400 font-mono uppercase border border-cyan-500/20 bg-cyan-500/5 px-2 py-0.5 rounded font-semibold">
						Integrations
					</span>
				</div>

				{/* CLOUD ORCHESTRATOR & AUTOPILOT */}
				<div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
					<details className="group">
						<summary className="list-none flex items-center justify-between cursor-pointer select-none">
							<div className="flex items-center gap-2">
								<h2 className="text-base font-semibold text-white">
									☁️ Cloud Orchestrator &amp; Autopilot
								</h2>
								<span
									className="text-cyan-400 cursor-help text-xs"
									title="Manage Jules Autopilot connection, sync status, and third-party cloud LLM credentials."
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
							<CloudOrchestratorDashboardPage />
						</div>
					</details>
				</div>

				<div className="grid gap-6 md:grid-cols-3">
					{/* Browser & Editor Surfaces */}
					<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4 md:col-span-2 font-mono">
						<div className="flex items-center gap-2 border-b border-slate-800 pb-2">
							<h2 className="text-base font-semibold text-white">
								Supported Coding Surfaces
							</h2>
							<span
								className="text-cyan-400 cursor-help text-xs"
								title="Auto-detects IDE extensions and command line adapters in this project structure."
							>
								💡
							</span>
						</div>

						<div className="space-y-3">
							{installArtifacts &&
							(installArtifacts as any[]).length > 0 ? (
								(installArtifacts as any[]).map((surface: any) => (
									<div
										key={surface.id}
										className="border border-slate-850 bg-zinc-955 p-3 rounded-lg flex flex-col justify-between text-xs space-y-1.5"
									>
										<div className="flex items-center justify-between">
											<span className="font-bold text-slate-200">
												{surface.title}
											</span>
											<span className="px-1.5 py-0.2 rounded font-mono text-[9px] uppercase bg-zinc-800 text-slate-400">
												{surface.platforms}
											</span>
										</div>
										<div className="text-[10px] text-slate-500 font-mono truncate">
											{surface.repoPath}
										</div>
										<div className="text-[11px] text-slate-400">
											{surface.installHint}
										</div>
										<div className="pt-1.5 flex items-center justify-between text-[10px] border-t border-slate-850/60">
											<span className="text-slate-500">
												Action:{" "}
												<code className="text-cyan-400">
													{surface.operatorActionLabel}
												</code>
											</span>
											<span className="font-semibold text-slate-350">
												{surface.statusLabel}
											</span>
										</div>
									</div>
								))
							) : (
								<div className="space-y-3 text-xs">
									<div className="border border-slate-850 bg-zinc-955 p-3 rounded-lg flex flex-col justify-between space-y-1.5">
										<div className="flex items-center justify-between font-bold text-slate-200">
											<span>Browser Telemetry Extension</span>
											<span className="px-1.5 py-0.2 rounded font-mono text-[9px] bg-zinc-800 text-slate-400">
												CHROME/EDGE
											</span>
										</div>
										<p className="text-[11px] text-slate-400">
											Captures web search context logs, screenshots, and live
											CDP channels.
										</p>
										<div className="text-[10px] text-slate-500 font-mono">
											Path: apps/tormentnexus-extension
										</div>
									</div>
									<div className="border border-slate-850 bg-zinc-955 p-3 rounded-lg flex flex-col justify-between space-y-1.5">
										<div className="flex items-center justify-between font-bold text-slate-200">
											<span>VS Code Kernel Extension</span>
											<span className="px-1.5 py-0.2 rounded font-mono text-[9px] bg-zinc-800 text-slate-400">
												VSCODE
											</span>
										</div>
										<p className="text-[11px] text-slate-400">
											Directly syncs file buffer saves and command execution
											terminals.
										</p>
										<div className="text-[10px] text-slate-500 font-mono">
											Path: apps/vscode
										</div>
									</div>
								</div>
							)}
						</div>
					</div>

					{/* Connected Bridges */}
					<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4 md:col-span-1 flex flex-col justify-between font-mono">
						<div>
							<div className="flex items-center gap-2 border-b border-slate-800 pb-2">
								<h2 className="text-base font-semibold text-white">
									Live Clients Connected
								</h2>
								<span
									className="text-cyan-400 cursor-help text-xs"
									title="Lists active extension connections currently linked to the Go Kernel tRPC loop."
								>
									💡
								</span>
							</div>
							<div className="space-y-2 mt-3 max-h-[250px] overflow-y-auto pr-1">
								{browserStatus &&
								(browserStatus as any).activePages?.length > 0 ? (
									(browserStatus as any).activePages.map(
										(page: any, idx: number) => (
											<div
												key={idx}
												className="border border-slate-850 bg-zinc-955 p-2.5 rounded text-xs flex flex-col"
											>
												<span className="font-semibold text-slate-350 truncate">
													{page.title}
												</span>
												<span className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
													{page.url}
												</span>
											</div>
										),
									)
								) : (
									<div className="border border-slate-850 bg-zinc-955 p-3 rounded text-center text-xs text-slate-550">
										📡 No extension clients or browser telemetry pipes
										currently registered.
									</div>
								)}
							</div>
						</div>
					</div>
					{/* USER MANUAL & HELP ACCORDION */}
					<div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
						<details className="group">
							<summary className="list-none flex items-center justify-between cursor-pointer select-none">
								<div className="flex items-center gap-2">
									<h2 className="text-base font-semibold text-white">
										📖 System User Manual &amp; Knowledge Base
									</h2>
									<span
										className="text-cyan-400 cursor-help text-xs"
										title="Access deep documentation on Getting Started, Core Agents, Swarm Workflows, and Advanced CLI ops."
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
								<ManualPage />
							</div>
						</details>
					</div>
				</div>
			{/* Telemetry fallback children widgets */}
			{children && (
				<div className="mt-6 border-t border-slate-800 pt-6">
					{children}
				</div>
			)}

			<DashboardConsolidatedSections />
		</div>

	);
}