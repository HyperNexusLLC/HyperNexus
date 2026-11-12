import {
	type Dispatch,
	type SetStateAction,
} from "react";

export interface DashboardMissionControlHeaderProps {
	routerStatusLabel: string;
	routerStatusTone: string;
	startupLabel: string;
	startupToneClass: string;
	generatedAtLabel: string;
	runningDiagnostics: boolean;
	setRunningDiagnostics: Dispatch<SetStateAction<boolean>>;
	diagnosticsResult: string | null;
	setDiagnosticsResult: Dispatch<SetStateAction<string | null>>;
	runningSchemaSync: boolean;
	setRunningSchemaSync: Dispatch<SetStateAction<boolean>>;
	schemaSyncResult: string | null;
	setSchemaSyncResult: Dispatch<SetStateAction<string | null>>;
	shutdownLoading: boolean;
	triggerShutdown: () => Promise<void> | void;
}

export function DashboardMissionControlHeader({
	routerStatusLabel,
	routerStatusTone,
	startupLabel,
	startupToneClass,
	generatedAtLabel,
	runningDiagnostics,
	setRunningDiagnostics,
	diagnosticsResult,
	setDiagnosticsResult,
	runningSchemaSync,
	setRunningSchemaSync,
	schemaSyncResult,
	setSchemaSyncResult,
	shutdownLoading,
	triggerShutdown,
}: DashboardMissionControlHeaderProps) {
	return (
			<div
				id="mission-control"
				className="scroll-mt-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4"
			>
				<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
					<div>
						<h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
							🌌 TORMENTNEXUS{" "}
							<span className="text-cyan-400 text-xs font-mono font-bold tracking-widest uppercase border border-cyan-500/20 bg-cyan-500/5 px-2 py-0.5 rounded">
								Kernel Console
							</span>
						</h1>
						<p className="text-xs text-slate-400 mt-1">
							Multilingual semantic graph routing, autonomic self-healing, and
							memory dreaming loop control surface.
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						{/* System Status Badges */}
						<div className="flex flex-col items-end gap-1">
							<div className="flex gap-2">
								<div
									className={`px-2 py-0.5 rounded text-[10px] font-mono border font-semibold ${routerStatusTone}`}
									title="The authoritative TN Kernel background router API server status."
								>
									Go Kernel: {routerStatusLabel}
								</div>
								<div
									className={`px-2 py-0.5 rounded text-[10px] font-mono border font-semibold ${startupToneClass}`}
									title="The auto-healer and supervisor startup status checking all required subsystems."
								>
									Startup Check: {startupLabel}
								</div>
							</div>
							<div className="text-[10px] text-slate-500 font-mono">
								Last telemetry frame: {generatedAtLabel}
							</div>
						</div>
					</div>
				</div>

				{/* Quick System Controls & Shutdown */}
				<div className="flex flex-wrap gap-3 pt-2 border-t border-slate-800/60 justify-between items-center">
					<div className="flex flex-wrap gap-2 items-center">
						<span className="text-[10px] uppercase font-semibold text-slate-500 mr-1 tracking-wider">
							Quick Actions:
						</span>
						<button
							onClick={async () => {
								setRunningDiagnostics(true);
								setDiagnosticsResult(null);
								try {
									const res = await fetch("/api/go/api/health");
									const json = await res.json();
									setDiagnosticsResult(JSON.stringify(json, null, 2));
								} catch (e: any) {
									setDiagnosticsResult(`Diagnostics failed: ${e.message}`);
								}
								setRunningDiagnostics(false);
							}}
							disabled={runningDiagnostics}
							className="px-3 py-1 bg-slate-900 border border-slate-800 hover:border-cyan-500/35 hover:bg-slate-800/80 text-xs rounded transition-all text-slate-200 cursor-pointer"
							title="Run self-diagnostic telemetry checks against native server APIs."
						>
							{runningDiagnostics ? "Diagnostics..." : "🩺 Diagnostics"}
						</button>
						<button
							onClick={async () => {
								setRunningSchemaSync(true);
								setSchemaSyncResult(null);
								try {
									const res = await fetch("/api/go/api/config/status");
									const json = await res.json();
									setSchemaSyncResult(JSON.stringify(json, null, 2));
								} catch (e: any) {
									setSchemaSyncResult(`Sync failed: ${e.message}`);
								}
								setRunningSchemaSync(false);
							}}
							disabled={runningSchemaSync}
							className="px-3 py-1 bg-slate-900 border border-slate-800 hover:border-cyan-500/35 hover:bg-slate-800/80 text-xs rounded transition-all text-slate-200 cursor-pointer"
							title="Synchronize local SQLite schema definitions and structural reference sets."
						>
							{runningSchemaSync ? "Syncing..." : "🔄 DB Schema Sync"}
						</button>
					</div>
					<div>
						<button
							onClick={triggerShutdown}
							disabled={shutdownLoading}
							className="px-3 py-1 bg-rose-955/40 hover:bg-rose-900/60 border border-rose-800/50 hover:border-rose-500 text-xs font-semibold rounded text-rose-200 hover:text-white transition-all cursor-pointer"
							title="Gracefully terminate all background processes, including the watchdog agent and Node.js web server."
						>
							{shutdownLoading
								? "Shutting down..."
								: "🛑 Quit Servers & Exit"}
						</button>
					</div>
				</div>

				{diagnosticsResult && (
					<div className="p-3 bg-zinc-950 border border-cyan-900/30 rounded text-[11px] font-mono text-cyan-200 overflow-x-auto relative">
						<button
							onClick={() => setDiagnosticsResult(null)}
							className="absolute top-2 right-2 text-slate-500 hover:text-white"
						>
							✕
						</button>
						<div className="font-bold mb-1">
							Telemetry Diagnostics Output:
						</div>
						<pre>{diagnosticsResult}</pre>
					</div>
				)}
				{schemaSyncResult && (
					<div className="p-3 bg-zinc-950 border border-cyan-900/30 rounded text-[11px] font-mono text-cyan-200 overflow-x-auto relative">
						<button
							onClick={() => setSchemaSyncResult(null)}
							className="absolute top-2 right-2 text-slate-500 hover:text-white"
						>
							✕
						</button>
						<div className="font-bold mb-1">Schema Sync Response:</div>
						<pre>{schemaSyncResult}</pre>
					</div>
				)}
			</div>
	);
}
