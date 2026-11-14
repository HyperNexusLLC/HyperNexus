"use client";

import { useState } from "react";
import { trpc } from "../../utils/trpc";

export function DashboardMcpSection({
	swarmRunning,
	triggerSwarmGen,
}: {
	swarmRunning: boolean;
	triggerSwarmGen: () => void;
}) {
	// --- PUBLIC MCP REGISTRY ---
	const [registryFilter, setRegistryFilter] = useState("");
	const { data: installedMcpServers } = trpc.mcpServers.list.useQuery();
	const { data: registrySnapshot, isLoading: loadingRegistry } =
		trpc.mcpServers.registrySnapshot.useQuery();
	const installMcpMutation = trpc.mcpServers.create.useMutation();

	const handleInstallMcpServer = (
		name: string,
		command: string,
		args: string[],
		env: any,
	) => {
		installMcpMutation.mutate({
			name,
			type: "STDIO",
			command,
			args,
			env: env || {},
		});
	};

	const [alwaysOnTools, setAlwaysOnTools] = useState<Record<string, boolean>>({
		read_file: true,
		write_file: true,
		run_command: true,
		grep_search: true,
		view_file: true,
		list_dir: true,
		search_web: true,
	});

	const toggleAlwaysOn = (toolName: string) => {
		setAlwaysOnTools((prev) => ({
			...prev,
			[toolName]: !prev[toolName],
		}));
	};


	return (
		<>
			{/* SECTION 2: NATIVE GO MCP ORCHESTRATION & TOOL CONTROL */}
			<div
				id="mcp-registry"
				className="scroll-mt-6 space-y-4 pt-8 border-t border-slate-800"
			>
				<div className="flex items-center justify-between border-b border-slate-800 pb-2">
					<h2 title="MCP servers, tool registry, swarm execution and tool-call control" className="text-lg font-bold text-white tracking-wide">
						Native Go MCP Orchestration &amp; Tool Control
					</h2>
					<span className="text-[10px] text-cyan-400 font-mono uppercase border border-cyan-500/20 bg-cyan-500/5 px-2 py-0.5 rounded font-semibold">
						Execution Layer
					</span>
				</div>
				<div className="grid gap-6 md:grid-cols-2">
					{/* Competitor Parity & Evidence Lock Gate */}
					<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4 md:col-span-2">
						<div className="flex items-center justify-between border-b border-slate-800 pb-2">
							<div className="flex items-center gap-2">
								<h2 className="text-base font-semibold text-white">
									AI Agent Competitor Parity &amp; Evidence Lock Gate
								</h2>
								<span
									className="text-cyan-400 cursor-help text-xs"
									title="Maintains 1:1 byte-for-byte schema and execution compatibility with competitor tool frameworks."
								>
									🔒
								</span>
							</div>
							<span className="text-[10px] text-yellow-400 border border-yellow-500/20 bg-yellow-500/5 px-2 py-0.5 rounded font-semibold font-mono">
								Phase 1: Foundation
							</span>
						</div>
						<p className="text-xs text-slate-400">
							Ensures HyperNexus acts as a drop-in replacement by matching
							tool signatures for Claude Code, Cursor, Aider, and Copilot.
						</p>

						<div className="grid gap-4 md:grid-cols-2">
							{/* First-Party Verification Queue */}
							<div className="border border-slate-850 bg-zinc-950/40 p-4 rounded space-y-3 font-mono text-[11px]">
								<span className="font-bold text-slate-200 block border-b border-slate-850 pb-1 uppercase tracking-wider text-[10px]">
									Verification Queue
								</span>
								<div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
									{[
										{
											name: "OpenCode",
											level: "L3 (Locked)",
											status: "text-emerald-400",
										},
										{
											name: "Gemini CLI",
											level: "L2 (Partial)",
											status: "text-yellow-400",
										},
										{
											name: "Claude Code",
											level: "L2 (Partial)",
											status: "text-yellow-400",
										},
										{
											name: "Cursor",
											level: "L2 (Partial)",
											status: "text-yellow-400",
										},
										{
											name: "GitHub Copilot",
											level: "L2 (Partial)",
											status: "text-yellow-400",
										},
										{
											name: "OpenAI Codex",
											level: "L2 (Partial)",
											status: "text-yellow-400",
										},
										{
											name: "Kiro",
											level: "L2 (Partial)",
											status: "text-yellow-400",
										},
										{
											name: "Windsurf",
											level: "L1 (Partial)",
											status: "text-slate-450",
										},
										{
											name: "Antigravity",
											level: "L1 (Partial)",
											status: "text-slate-450",
										},
										{
											name: "VS Code Agent",
											level: "L0 (Unlocked)",
											status: "text-red-400",
										},
									].map((item) => (
										<div
											key={item.name}
											className="flex justify-between items-center border-b border-slate-850/60 pb-1 last:border-0"
										>
											<span className="text-slate-300 font-semibold">
												{item.name}
											</span>
											<span className={`${item.status} font-bold`}>
												{item.level}
											</span>
										</div>
									))}
								</div>
							</div>

							{/* Readiness Gate Checklists */}
							<div className="border border-slate-850 bg-zinc-950/40 p-4 rounded space-y-3 text-xs">
								<span className="font-bold text-slate-200 block border-b border-slate-850 pb-1 uppercase tracking-wider text-[10px] font-mono">
									Readiness Gate
								</span>
								<div className="space-y-2.5">
									<label className="flex items-start gap-2.5 cursor-pointer text-slate-300 hover:text-white transition-colors">
										<input
											type="checkbox"
											defaultChecked
											className="mt-0.5 rounded border-slate-800 bg-slate-950 text-cyan-600 focus:ring-0 focus:ring-offset-0"
										/>
										<span>
											Golden fixtures populated for tool schema signatures
										</span>
									</label>
									<label className="flex items-start gap-2.5 cursor-pointer text-slate-300 hover:text-white transition-colors">
										<input
											type="checkbox"
											defaultChecked
											className="mt-0.5 rounded border-slate-800 bg-slate-950 text-cyan-600 focus:ring-0 focus:ring-offset-0"
										/>
										<span>Router alias profile matches pass CI testing</span>
									</label>
									<label className="flex items-start gap-2.5 cursor-pointer text-slate-300 hover:text-white transition-colors">
										<input
											type="checkbox"
											className="mt-0.5 rounded border-slate-800 bg-slate-950 text-cyan-600 focus:ring-0 focus:ring-offset-0"
										/>
										<span>
											All target platforms upgraded to L3/Locked status
										</span>
									</label>
									<label className="flex items-start gap-2.5 cursor-pointer text-slate-300 hover:text-white transition-colors">
										<input
											type="checkbox"
											className="mt-0.5 rounded border-slate-800 bg-slate-950 text-cyan-600 focus:ring-0 focus:ring-offset-0"
										/>
										<span>
											Permission model equivalence tests verify security
											boundaries
										</span>
									</label>
								</div>
							</div>
						</div>
					</div>
					{/* Swarm Code Gen Panel (Highest Value - Prominent Top Card) */}
					<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4 md:col-span-2 flex flex-col justify-between">
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
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
								<div className="border border-slate-800 bg-slate-950 p-4 rounded flex items-center justify-between">
									<div>
										<div className="text-xs text-slate-500">
											Implemented Go Tools
										</div>
										<div className="text-lg font-bold text-emerald-400 mt-0.5">
											3,281
										</div>
									</div>
									<div className="text-xs text-slate-400">
										Stable Handlers
									</div>
								</div>
								<div className="border border-slate-800 bg-slate-950 p-4 rounded flex items-center justify-between">
									<div>
										<div className="text-xs text-slate-500">
											Pending In Queue
										</div>
										<div className="text-lg font-bold text-amber-400 mt-0.5">
											19,266
										</div>
									</div>
									<div className="text-xs text-slate-400">
										Target Envelope
									</div>
								</div>
							</div>
						</div>
						<button
							onClick={triggerSwarmGen}
							disabled={swarmRunning}
							className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs py-2.5 rounded transition-colors disabled:opacity-50 mt-4"
						>
							{swarmRunning
								? "Generating (swarm_v7.py --skip-existing)..."
								: "Trigger Swarm Generation (swarm_v7.py)"}
						</button>
					</div>

					{/* Always-On Tools Panel */}
					<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4 md:col-span-1">
						<div className="flex items-center gap-2">
							<h2 className="text-base font-semibold text-white">
								Native Harness Parity Accessories
							</h2>
							<span
								className="text-cyan-400 cursor-help text-xs"
								title="Activating Always-On status injects the tool metadata directly into the foundational context loop of the connected pi-agent client harness."
							>
								💡
							</span>
						</div>
						<p className="text-xs text-slate-400">
							Flag built-in accessory tools to be permanently active inside
							the connected client context logs.
						</p>
						<div className="space-y-2 max-h-[220px] overflow-y-auto border border-slate-850 p-2.5 rounded bg-slate-950/60 font-mono text-xs">
							{Object.keys(alwaysOnTools).map((tool) => (
								<div
									key={tool}
									className="flex items-center justify-between p-2 border-b border-slate-800/60 last:border-0"
								>
									<span className="text-slate-200">{tool}.go</span>
									{tool === "read_file" ||
									tool === "write_file" ||
									tool === "run_command" ||
									tool === "grep_search" ||
									tool === "view_file" ||
									tool === "list_dir" ||
									tool === "search_web" ? (
										<span className="text-[10px] text-amber-400 border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 rounded">
											Locked Always-On
										</span>
									) : (
										<button
											onClick={() => toggleAlwaysOn(tool)}
											className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
												alwaysOnTools[tool]
													? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200 font-semibold"
													: "border-slate-700 bg-slate-800 text-slate-400"
											}`}
										>
											{alwaysOnTools[tool] ? "Always-On" : "Disabled"}
										</button>
									)}
								</div>
							))}
						</div>
					</div>

					{/* JSON-RPC Client Access Bridge */}
					<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 md:col-span-1 space-y-3">
						<div className="flex items-center gap-2">
							<h2 className="text-base font-semibold text-white">
								JSON-RPC Client Access Bridge
							</h2>
							<span
								className="text-cyan-400 cursor-help text-xs"
								title="Exposes native client endpoints over standardized tRPC and HTTP interfaces."
							>
								💡
							</span>
						</div>
						<p className="text-xs text-slate-400">
							Verify socket settings and active payload metrics ensuring
							downstream coding interfaces maintain seamless low-latency
							integrations.
						</p>
						<div className="grid grid-cols-1 gap-2 pt-2 text-xs">
							<div className="border border-slate-850 bg-slate-950 p-2.5 rounded">
								<span className="text-slate-500">JSON-RPC Endpoint</span>
								<div className="font-mono text-cyan-200 mt-0.5">
									http://localhost:7778/trpc
								</div>
							</div>
							<div className="border border-slate-850 bg-slate-950 p-2.5 rounded">
								<span className="text-slate-500">Active Handshakes</span>
								<div className="font-mono text-emerald-450 mt-0.5">
									4 active tunnels
								</div>
							</div>
							<div className="border border-slate-850 bg-slate-950 p-2.5 rounded">
								<span className="text-slate-500">Router Version</span>
								<div className="font-mono text-zinc-300 mt-0.5">
									v1.0.0-alpha.207 (Go)
								</div>
							</div>
						</div>
					</div>

					{/* Public MCP Server Registry & Discovery */}
					<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4 md:col-span-2">
						<div className="flex items-center justify-between border-b border-slate-800 pb-2">
							<div className="flex items-center gap-2">
								<h2 className="text-base font-semibold text-white">
									Public MCP Server Registry &amp; Discovery
								</h2>
								<span
									className="text-cyan-400 cursor-help text-xs"
									title="Discover and install public community MCP servers directly into your active configuration registry."
								>
									🌐
								</span>
							</div>
							<div className="text-[10px] text-slate-500 font-mono">
								{registrySnapshot && registrySnapshot.length > 0
									? `Live Index (${registrySnapshot.length} servers)`
									: "Fallback Templates Loaded"}
							</div>
						</div>

						{/* Search filter */}
						<div className="relative">
							<input
								value={registryFilter}
								onChange={(e) => setRegistryFilter(e.target.value)}
								placeholder="Search public registry by name or capability..."
								className="w-full bg-zinc-950 border border-slate-800 rounded p-2 text-xs text-white placeholder-slate-550 focus:outline-none focus:border-cyan-500 transition-colors"
							/>
						</div>

						{/* Cards list */}
						<div className="grid gap-4 sm:grid-cols-2 max-h-[350px] overflow-y-auto pr-1">
							{loadingRegistry ? (
								<div className="col-span-full text-center py-8 text-slate-500 text-xs font-mono">
									⏳ Fetching live Smithery &amp; Glama MCP registry
									databases...
								</div>
							) : (
								(() => {
									const fallbackTemplates = [
										{
											name: "filesystem",
											description:
												"Standard operations for safe local file and folder access",
											command: "npx",
											args: [
												"-y",
												"@modelcontextprotocol/server-filesystem",
												"./data",
											],
											author: "ModelContextProtocol",
											tags: ["official", "files"],
										},
										{
											name: "memory",
											description:
												"Standard knowledge graph memory graph persistence server",
											command: "npx",
											args: ["-y", "@modelcontextprotocol/server-memory"],
											author: "ModelContextProtocol",
											tags: ["official", "memory"],
										},
										{
											name: "postgres",
											description: "Database connector for pgsql schemas",
											command: "npx",
											args: [
												"-y",
												"@modelcontextprotocol/server-postgres",
												"postgresql://localhost/db",
											],
											author: "ModelContextProtocol",
											tags: ["official", "database"],
										},
										{
											name: "github",
											description:
												"Access repository commits, trees, and issues",
											command: "npx",
											args: ["-y", "@modelcontextprotocol/server-github"],
											author: "ModelContextProtocol",
											tags: ["dev", "github"],
										},
									];
									const rawList =
										registrySnapshot && registrySnapshot.length > 0
											? registrySnapshot
											: fallbackTemplates;
									const filteredList = rawList.filter(
										(item: any) =>
											item.name
												.toLowerCase()
												.includes(registryFilter.toLowerCase()) ||
											item.description
												.toLowerCase()
												.includes(registryFilter.toLowerCase()),
									);

									if (filteredList.length === 0) {
										return (
											<div className="col-span-full text-center text-xs text-slate-500 py-4">
												No matching registry servers found.
											</div>
										);
									}

									return filteredList.map((item: any) => {
										const isInstalled = !!installedMcpServers?.some(
											(s: any) => s.name === item.name,
										);
										return (
											<div
												key={item.name}
												className="border border-slate-850 bg-zinc-950/60 p-4 rounded flex flex-col justify-between space-y-2 hover:bg-zinc-900/40 transition-colors"
											>
												<div>
													<div className="flex items-center justify-between">
														<span className="font-bold text-xs text-slate-200">
															{item.name}
														</span>
														{isInstalled && (
															<span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono font-semibold">
																INSTALLED
															</span>
														)}
													</div>
													<span className="text-[10px] text-slate-500 block mt-0.5">
														by {item.author || "Community"}
													</span>
													<p className="text-[11px] text-slate-400 mt-2 leading-normal">
														{item.description}
													</p>
												</div>

												<div className="pt-2">
													<button
														onClick={() =>
															handleInstallMcpServer(
																item.name,
																item.command || "npx",
																item.args || [],
																item.env || {},
															)
														}
														disabled={
															isInstalled ||
															installMcpMutation.isPending ||
															!item.command ||
															!item.args
														}
														className="w-full bg-cyan-600/25 hover:bg-cyan-500/35 border border-cyan-500/20 text-cyan-200 hover:text-white rounded py-1.5 text-xs font-semibold transition-colors disabled:bg-zinc-900 disabled:text-zinc-550"
													>
														{isInstalled
															? "Already Active ✓"
															: installMcpMutation.isPending
																? "Configuring..."
																: "Download & Auto-Install"}
													</button>
												</div>
											</div>
										);
									});
								})()
							)}
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
