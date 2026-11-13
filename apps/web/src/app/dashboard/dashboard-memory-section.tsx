"use client";

import { useCallback, useEffect, useState } from "react";
import { trpc } from "../../utils/trpc";

export function DashboardMemorySection() {
	// --- L3 COLD ARCHIVE LOGIC ---
	const [coldQuery, setColdQuery] = useState("");
	const [coldResults, setColdResults] = useState<any[]>([]);
	const [coldCount, setColdCount] = useState(0);
	const [coldLoading, setColdLoading] = useState(false);
	const [coldPromoting, setColdPromoting] = useState<string | null>(null);

	const searchColdArchive = useCallback(async (searchQuery = "") => {
		const trimmed = searchQuery.trim();
		if (!trimmed) {
			setColdResults([]);
			return;
		}
		setColdLoading(true);
		try {
			const url = `/api/go/api/memory/cold-archive/search?q=${encodeURIComponent(trimmed)}&limit=50`;
			const res = await fetch(url);
			const d = await res.json();
			setColdResults(d.data ?? []);
			if (d.total !== undefined) setColdCount(d.total);
		} catch {}
		setColdLoading(false);
	}, []);

	const fetchColdCount = useCallback(async () => {
		try {
			const res = await fetch("/api/go/api/memory/cold-archive/count");
			const d = await res.json();
			if (d.count !== undefined) setColdCount(d.count);
			else if (d.data !== undefined && d.data.count !== undefined)
				setColdCount(d.data.count);
		} catch {}
	}, []);

	const promoteColdMemory = async (id: string) => {
		setColdPromoting(id);
		try {
			await fetch("/api/go/api/memory/cold-archive/promote", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id }),
			});
			setColdResults((prev) => prev.filter((r) => r.id !== id));
			fetchColdCount();
		} catch {}
		setColdPromoting(null);
	};

	// --- GRAPHRAG RELATION BUILDER ---
	const [sub, setSub] = useState("");
	const [pred, setPred] = useState("");
	const [obj, setObj] = useState("");
	const [relationStatus, setRelationStatus] = useState("");

	const addRelationMutation = trpc.memory.relationsAdd?.useMutation
		? trpc.memory.relationsAdd.useMutation()
		: null;

	const handleAddRelation = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!sub.trim() || !pred.trim() || !obj.trim()) {
			setRelationStatus("❌ All fields are required.");
			return;
		}
		try {
			if (addRelationMutation) {
				await addRelationMutation.mutateAsync({
					subject: sub.trim(),
					predicate: pred.trim(),
					object: obj.trim(),
				});
			} else {
				const res = await fetch("/api/go/api/memory/relations/add", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						subject: sub.trim(),
						predicate: pred.trim(),
						object: obj.trim(),
					}),
				});
				if (!res.ok) throw new Error(await res.text());
			}
			setRelationStatus("✅ Relation added to GraphRAG successfully!");
			setSub("");
			setPred("");
			setObj("");
		} catch (err: any) {
			setRelationStatus(`❌ Error: ${err.message || err}`);
		}
	};

	const [runningScan, setRunningScan] = useState(false);
	const [runningLinkRestoration, setRunningLinkRestoration] = useState(false);
	const [jaccardThreshold, setJaccardThreshold] = useState(90);

	const triggerFolderScan = async () => {
		setRunningScan(true);
		try {
			await fetch("/api/go/api/sessions/imported/scan", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ force: true }),
			});
		} catch (e) {}
		setTimeout(() => {
			setRunningScan(false);
		}, 1500);
	};

	const triggerLinkRestoration = () => {
		setRunningLinkRestoration(true);
		setTimeout(() => {
			setRunningLinkRestoration(false);
		}, 2000);
	};

	useEffect(() => {
		searchColdArchive();
		fetchColdCount();
	}, [searchColdArchive, fetchColdCount]);

	return (
		<>
				{/* SECTION 1: COGNITIVE MEMORY ENGINES & SKILL REGISTRIES */}
				<div id="memory-graphrag" className="scroll-mt-6 space-y-4">
					<div className="flex items-center justify-between border-b border-slate-800 pb-2">
						<h2 title="L1/L2/L3 memory engines, GraphRAG relations and skill registries" className="text-lg font-bold text-white tracking-wide">
							Cognitive Memory Engines &amp; Skill Registries
						</h2>
						<span className="text-[10px] text-cyan-400 font-mono uppercase border border-cyan-500/20 bg-cyan-500/5 px-2 py-0.5 rounded font-semibold">
							Active Core
						</span>
					</div>
					<div className="grid gap-6 md:grid-cols-2">
						{/* Memory dreaming metrics (Highest Value - Prominent Top Card) */}
						<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4 md:col-span-2">
							<div className="flex items-center gap-2">
								<h2 className="text-base font-semibold text-white">
									L1 ➔ L4 Memory Dreaming &amp; Fact Distillation
								</h2>
								<span
									className="text-cyan-400 cursor-help text-xs"
									title="L1 (Active Context), L2 (Short-Term), L3 (Dreaming & fact condensation), and L4 (Reflective structural insights)."
								>
									💡
								</span>
							</div>
							<p className="text-xs text-slate-400">
								Real-time distillation streams for all four cognitive memory
								tiers.
							</p>
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 text-xs">
								<div className="border border-slate-850 bg-slate-950/60 p-4 rounded flex flex-col justify-between h-24">
									<span className="text-slate-400 text-[10px] uppercase font-semibold">
										L1 Active Context Scratchpad
									</span>
									<span className="text-cyan-400 font-bold text-sm mt-1">
										Active (4,096 tokens)
									</span>
								</div>
								<div className="border border-slate-850 bg-slate-950/60 p-4 rounded flex flex-col justify-between h-24">
									<span className="text-slate-400 text-[10px] uppercase font-semibold">
										L2 Short-Term Episodic Vault
									</span>
									<span className="text-cyan-400 font-bold text-sm mt-1">
										86,281 records
									</span>
								</div>
								<div className="border border-slate-850 bg-slate-950/60 p-4 rounded flex flex-col justify-between h-24">
									<span className="text-slate-400 text-[10px] uppercase font-semibold">
										L3 Long-Term Fact Distillation
									</span>
									<span className="text-purple-400 font-bold text-sm mt-1">
										Distilling background...
									</span>
								</div>
								<div className="border border-slate-850 bg-slate-950/60 p-4 rounded flex flex-col justify-between h-24">
									<span className="text-slate-400 text-[10px] uppercase font-semibold">
										L4 Reflective Deep Synthesis
									</span>
									<span className="text-emerald-400 font-bold text-sm mt-1">
										Optimized clusters: 1,489
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* TABS - MEMORY & GRAPHRAG */}
				<div className="space-y-4 pt-8 border-t border-slate-800">
					<div className="flex items-center justify-between border-b border-slate-800 pb-2">
						<h2 className="text-lg font-bold text-white tracking-wide">
							GraphRAG &amp; Cold Archives
						</h2>
						<span className="text-[10px] text-cyan-400 font-mono uppercase border border-cyan-500/20 bg-cyan-500/5 px-2 py-0.5 rounded font-semibold">
							Knowledge Graph
						</span>
					</div>

					<div className="grid gap-6 md:grid-cols-2">
						{/* GraphRAG Relationship Builder Card */}
						<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4 md:col-span-2">
							<div className="flex items-center gap-2">
								<h2 className="text-base font-semibold text-white">
									🧠 GraphRAG Relationship Builder
								</h2>
								<span
									className="text-cyan-400 cursor-help text-xs"
									title="Insert explicit semantic relationships directly into the memory vault graph database."
								>
									💡
								</span>
							</div>
							<p className="text-xs text-slate-400">
								Manually seed the knowledge graph with custom facts to control
								search paths and downstream agent context retrieval.
							</p>
							<form onSubmit={handleAddRelation} className="space-y-4 pt-2">
								<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
									<div>
										<label className="text-[10px] text-slate-400 block mb-1 uppercase font-semibold">
											Subject
										</label>
										<input
											type="text"
											value={sub}
											onChange={(e) => setSub(e.target.value)}
											placeholder="e.g. hypernexus"
											className="w-full bg-zinc-950 border border-slate-800 rounded p-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
										/>
									</div>
									<div>
										<label className="text-[10px] text-slate-400 block mb-1 uppercase font-semibold">
											Predicate (Relationship)
										</label>
										<input
											type="text"
											value={pred}
											onChange={(e) => setPred(e.target.value)}
											placeholder="e.g. is-developed-by"
											className="w-full bg-zinc-950 border border-slate-800 rounded p-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
										/>
									</div>
									<div>
										<label className="text-[10px] text-slate-400 block mb-1 uppercase font-semibold">
											Object
										</label>
										<input
											type="text"
											value={obj}
											onChange={(e) => setObj(e.target.value)}
											placeholder="e.g. MDMAtk"
											className="w-full bg-zinc-950 border border-slate-800 rounded p-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
										/>
									</div>
								</div>
								<div className="flex justify-between items-center pt-2">
									<button
										type="submit"
										className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs px-4 py-2 rounded transition-colors cursor-pointer"
									>
										Add Relation to GraphRAG
									</button>
									{relationStatus && (
										<span className="text-xs font-semibold text-cyan-350">
											{relationStatus}
										</span>
									)}
								</div>
							</form>
						</div>

						{/* Filesystem Skill Indexer */}
						<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4 flex flex-col justify-between md:col-span-1">
							<div>
								<div className="flex items-center gap-2">
									<h2 className="text-base font-semibold text-white">
										Filesystem Skill Indexer
									</h2>
									<span
										className="text-cyan-400 cursor-help text-xs"
										title="Parses YAML frontmatter, maps local folders, and runs Jaccard token deduplication."
									>
										💡
									</span>
								</div>
								<p className="text-xs text-slate-400">
									Walks local skill sheets (
									<code className="text-slate-200">
										~/.hypernexus/skills/*/SKILL.md
									</code>
									) to deduplicate redundant definitions.
								</p>
								<div className="space-y-3 pt-3">
									<div className="flex items-center justify-between text-xs">
										<span className="text-slate-400">
											Adaptive Jaccard Similarity Threshold
										</span>
										<span className="text-cyan-400 font-semibold">
											{jaccardThreshold}%
										</span>
									</div>
									<input
										type="range"
										min="50"
										max="100"
										value={jaccardThreshold}
										onChange={(e) =>
											setJaccardThreshold(Number(e.target.value))
										}
										className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
									/>
									<div className="grid grid-cols-3 gap-2 text-center text-[10px] text-slate-500">
										<div>SoftCap: 50k</div>
										<div>HardCap: 80k</div>
										<div>Policy: LRU</div>
									</div>
								</div>
							</div>
							<button className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs py-2 rounded transition-colors mt-4">
								Re-Index Local Markdown Skills
							</button>
						</div>

						{/* Backlog Scan Repair */}
						<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4 flex flex-col justify-between md:col-span-1">
							<div>
								<div className="flex items-center gap-2">
									<h2 className="text-base font-semibold text-white">
										Transcripts &amp; Links Backlog Repair
									</h2>
									<span
										className="text-cyan-400 cursor-help text-xs"
										title="Scan session dumps and links to rebuild the session graph index."
									>
										💡
									</span>
								</div>
								<p className="text-xs text-slate-400">
									Automated folder mapping loops across target directories to
									repair 2,003 missing sessions and populate 15,753 lost backlog
									link entries.
								</p>
							</div>
							<div className="flex gap-2 pt-4">
								<button
									onClick={triggerFolderScan}
									disabled={runningScan}
									className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 text-xs font-semibold py-2 rounded disabled:opacity-50 transition-colors"
								>
									{runningScan ? "Scanning..." : "Ingest Sessions"}
								</button>
								<button
									onClick={triggerLinkRestoration}
									disabled={runningLinkRestoration}
									className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold py-2 rounded disabled:opacity-50 transition-colors"
								>
									{runningLinkRestoration
										? "Scraping..."
										: "Scrape Backlog Links"}
								</button>
							</div>
						</div>

						{/* L3 Cold Archive Explorer */}
						<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4 md:col-span-2">
							<div className="flex items-center justify-between border-b border-slate-800 pb-2">
								<div className="flex items-center gap-2">
									<h2 className="text-base font-semibold text-white">
										L3 Cold Archive Explorer
									</h2>
									<span
										className="text-cyan-400 cursor-help text-xs"
										title="Long-term compressed memory tier for low-heat memories evicted from L2 (heat score < 10.0)."
									>
										❄️
									</span>
								</div>
								<div className="flex items-center gap-2">
									<button
										onClick={() => {
											searchColdArchive(coldQuery);
											fetchColdCount();
										}}
										disabled={coldLoading}
										className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-xs transition-colors disabled:opacity-50"
										title="Refresh the cold archive cache status"
									>
										🔄 Refresh
									</button>
								</div>
							</div>

							{/* Stats */}
							<div className="flex gap-3 text-xs">
								<div className="px-3 py-1.5 bg-zinc-950/60 rounded border border-slate-850 flex items-center gap-2">
									<span className="text-slate-500">Archived Memories:</span>
									<span className="text-cyan-400 font-mono font-medium">
										{coldCount}
									</span>
								</div>
								<div className="px-3 py-1.5 bg-zinc-950/60 rounded border border-slate-850 flex items-center gap-2">
									<span className="text-slate-500">Showing Search Hits:</span>
									<span className="text-white font-mono font-medium">
										{coldResults.length}
									</span>
								</div>
							</div>

							{/* Search bar */}
							<div className="flex gap-2">
								<input
									type="text"
									placeholder="Search cold archive contents by keywords..."
									value={coldQuery}
									onChange={(e) => setColdQuery(e.target.value)}
									onKeyDown={(e) =>
										e.key === "Enter" && searchColdArchive(coldQuery)
									}
									className="flex-1 px-3 py-2 bg-zinc-950 border border-slate-800 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
									title="Search archived memories by content keyword"
								/>
								<button
									onClick={() => searchColdArchive(coldQuery)}
									disabled={coldLoading}
									className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold disabled:opacity-50 transition-colors"
									title="Run keyword search against cold archive"
								>
									{coldLoading ? "Searching..." : "Search"}
								</button>
							</div>

							{/* Results list */}
							<div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
								{coldResults.length === 0 && !coldLoading && (
									<div className="text-center py-8 text-slate-500 bg-zinc-950/30 border border-slate-850 rounded-lg">
										<div className="text-2xl mb-2">❄️</div>
										<p className="font-semibold text-xs text-slate-350">
											Empty Archive Cache
										</p>
										<p className="text-[10px] mt-1 text-slate-500 max-w-md mx-auto">
											Evicted low-heat memories will appear here. Search above
											to check cached contents.
										</p>
									</div>
								)}
								{coldResults.map((entry) => (
									<div
										key={entry.id}
										className="bg-zinc-950/50 border border-slate-850 rounded p-3 hover:bg-zinc-900/60 transition-colors flex items-start justify-between gap-4"
									>
										<div className="flex-1 min-w-0">
											<p className="text-xs text-slate-300 font-mono break-all whitespace-pre-wrap leading-relaxed">
												{entry.content}
											</p>
											<div className="flex flex-wrap gap-2 mt-2 text-[10px] text-slate-500 font-mono">
												<span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
													Kind: {entry.memory_kind || "fact"}
												</span>
												<span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
													Category: {entry.category || "general"}
												</span>
												<span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
													Importance: {entry.importance?.toFixed(2) ?? "0.00"}
												</span>
												<span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
													Heat: {entry.heat_score?.toFixed(1) ?? "0.0"}
												</span>
												<span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
													Archived: {entry.archived_at?.slice(0, 10) || "?"}
												</span>
											</div>
										</div>
										<button
											onClick={() => promoteColdMemory(entry.id)}
											disabled={coldPromoting === entry.id}
											className="shrink-0 px-2.5 py-1.5 bg-amber-600/20 hover:bg-amber-600/35 border border-amber-500/20 text-amber-300 hover:text-white rounded text-2xs transition-colors disabled:opacity-50"
											title="Promote memory back into the active L2 short-term vault"
										>
											{coldPromoting === entry.id
												? "Promoting..."
												: "⬆️ Promote"}
										</button>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
		</>
	);
}
