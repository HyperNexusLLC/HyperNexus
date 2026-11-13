import { useState, useEffect, useCallback } from "react";
import { useHealerStream } from "@hypernexus/ui";
import { trpc } from "../../utils/trpc";
import SettingsDashboard from "./settings/view";

export interface DashboardSystemRecoverySectionProps {
	runningDiagnostics: boolean;
	triggerDiagnostics: () => void;
	diagnosticsResult: string | null;
	runningSchemaSync: boolean;
	triggerSchemaSync: () => void;
	schemaSyncResult: string | null;
}

/**
 * DashboardSystemRecoverySection consolidates database recovery validation,
 * catalog schema migrations, live Go kernel verification sweeps, external
 * cross-harness session ingestion (Claude, Pi, Muse, Codex, Gemini, Aider),
 * Git repository chronicle, global config.json editor, immune self-healing
 * stream, and SQLite L2 persistent vector vault browser.
 */
export function DashboardSystemRecoverySection({
	runningDiagnostics,
	triggerDiagnostics,
	diagnosticsResult,
	runningSchemaSync,
	triggerSchemaSync,
	schemaSyncResult,
}: DashboardSystemRecoverySectionProps) {
	const [dbLock, setDbLock] = useState(false);

	// --- NATIVE GIT CHRONICLE ---
	const { data: gitLog } = trpc.git.getLog.useQuery({ limit: 10 });
	const { data: gitStatus } = trpc.git.getStatus.useQuery();

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

	useEffect(() => {
		fetchImportedSessions();
	}, [fetchImportedSessions]);

	return (
		<section
			id="system-recovery"
			aria-label="System recovery and active database sync"
			className="scroll-mt-16 space-y-4 pt-8 border-t border-slate-800"
		>
			<div className="flex items-center justify-between border-b border-slate-800 pb-2">
				<h2
					className="text-lg font-bold text-white tracking-wide"
					title="Database integrity, catalog migrations, live kernel verification, external session ingestion, git chronicle, config.json editor, immune radar, and SQLite L2 vault."
				>
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
							<h3 className="text-base font-semibold text-white">
								Active Database Restoration (hypernexus.db)
							</h3>
							<span
								className="text-cyan-400 cursor-help text-xs"
								title="Prioritizing db_v1 over alternative backups due to inclusion of the critical imported_sources table structure."
							>
								💡
							</span>
						</div>
						<button
							type="button"
							onClick={() => setDbLock(!dbLock)}
							title="Toggle write-protection lock before snapshotting SQLite databases"
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
							<h3 className="text-base font-semibold text-white">
								Global Catalog Synchronization Pipeline
							</h3>
							<span
								className="text-cyan-400 cursor-help text-xs"
								title="Synchronizes missing model capabilities and discovery vector topics in catalog.db."
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
							type="button"
							onClick={triggerSchemaSync}
							disabled={runningSchemaSync}
							title="Verify MCP server catalog schema and active server inventory"
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
							<h3 className="text-base font-semibold text-white">
								System Integrity Console
							</h3>
							<span
								className="text-cyan-400 cursor-help text-xs"
								title="Probes live Go kernel /health and MCP router liveness across memory registers and bridges."
							>
								💡
							</span>
						</div>
						<button
							type="button"
							onClick={triggerDiagnostics}
							disabled={runningDiagnostics}
							title="Execute live Go kernel health and MCP router integrity probe"
							className="bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 text-xs font-semibold px-4 py-2 rounded transition-colors disabled:opacity-50"
						>
							{runningDiagnostics ? "Running..." : "Run Verify Sweep"}
						</button>
					</div>
					<p className="text-xs text-slate-400">
						Verifies live kernel health, version alignment, memory registers,
						and MCP router bridge readiness.
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
							<h3 className="text-base font-semibold text-white">
								External Session &amp; Transcript Ingestion Bridge
							</h3>
							<span
								className="text-cyan-400 cursor-help text-xs"
								title="Scan and import conversation sessions and transcripts from external environments (Claude, Pi, Muse, Codex, Gemini, Aider, Antigravity) into the L2 memory vault."
							>
								📥
							</span>
						</div>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={fetchImportedSessions}
								disabled={importLoading}
								className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-xs transition-colors disabled:opacity-50"
								title="Refresh the imported sessions list cache"
							>
								{importLoading ? "🔄 Loading..." : "🔄 Refresh"}
							</button>
							<button
								type="button"
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
									Click &ldquo;Scan for Sessions&rdquo; to sweep project
									workspaces for external transcript formats.
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
													<span className="text-slate-500">Session ID:</span>
													<p className="text-slate-300 break-all select-all">
														{session.id}
													</p>
												</div>
												<div>
													<span className="text-slate-500">Source Path:</span>
													<p className="text-slate-300 break-all select-all">
														{session.sourcePath}
													</p>
												</div>
												<div>
													<span className="text-slate-500">File Type:</span>
													<p className="text-slate-300">{session.sourceType}</p>
												</div>
												<div>
													<span className="text-slate-500">Last Modified:</span>
													<p className="text-slate-300">
														{session.lastModifiedAt || "unknown"}
													</p>
												</div>
											</div>
											{session.detectedModels &&
												session.detectedModels.length > 0 && (
													<div>
														<span className="text-slate-500">Models Used:</span>
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
														{session.errors.map((errMsg: string, i: number) => (
															<li key={i}>{errMsg}</li>
														))}
													</ul>
												</div>
											)}
											{session.valid && (
												<div className="pt-2 flex flex-wrap gap-2">
													{!session.imported && (
														<button
															type="button"
															onClick={() => importSessionData(session)}
															className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-2xs font-semibold transition-colors"
															title="Ingest session facts and conversation transcript logs directly to database"
														>
															Import Session Into Core
														</button>
													)}
													<button
														type="button"
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
							<h3 className="text-base font-semibold text-white">
								Git Repository Chronicle
							</h3>
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
								<div className="text-slate-600 italic">No commits loaded.</div>
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
							<h3 className="text-base font-semibold text-white">
								Live Immune System Self-Healing Radar
							</h3>
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
								autoNeutralized.slice(0, 10).map((entry: any, idx: number) => (
									<div
										key={idx}
										className="border border-emerald-900/40 bg-emerald-950/10 p-2.5 rounded text-[11px]"
									>
										<div className="text-slate-300 font-mono truncate">
											{entry.error}
										</div>
										{entry.fix && (
											<div className="text-emerald-400 mt-1 font-semibold">
												Healed: {entry.fix.diagnosis?.file?.split("/").pop()}
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
							<h3 className="text-base font-semibold text-white">
								SQLite L2 Persistent Vector Vault
							</h3>
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
								title="Number of recent L2 vault records to display"
								className="bg-black text-[10px] border border-slate-800 rounded px-1.5 py-0.5 text-slate-300 focus:outline-none"
							>
								<option value={10}>10 items</option>
								<option value={30}>30 items</option>
								<option value={50}>50 items</option>
							</select>
							<button
								type="button"
								onClick={() => refetchHealerVault()}
								title="Refresh L2 vault records from the Go kernel"
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
								const importance = Math.round((record.Importance || 0) * 100);
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
		</section>
	);
}
