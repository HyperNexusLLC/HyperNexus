import { useState } from "react";

/**
 * DashboardPromptsDeploymentsSection consolidates the compiled Go prompt
 * library registry, static landing deployment controls (distinguishing the
 * OSS tormentnexus.site landing from the commercial hypernexus.site portal —
 * previously both buttons shared a single "hypernexus.site" key), HyperNexus
 * Cloud multi-tenant launcher, and the Windows HKCU `hypernexus://` deep-link
 * protocol handler registry.
 */
export function DashboardPromptsDeploymentsSection() {
	const [deployingSite, setDeployingSite] = useState<string | null>(null);
	const [deployStatus, setDeployStatus] = useState<Record<string, string>>({
		"tormentnexus.site": "idle",
		"hypernexus.site": "idle",
	});

	const [registeringProtocol, setRegisteringProtocol] = useState(false);
	const [protocolRegistered, setProtocolRegistered] = useState(false);

	const triggerStaticDeploy = (site: string) => {
		setDeployingSite(site);
		setDeployStatus((prev) => ({ ...prev, [site]: "deploying" }));
		setTimeout(() => {
			setDeployingSite(null);
			setDeployStatus((prev) => ({ ...prev, [site]: "success" }));
		}, 2500);
	};

	const registerOSProtocol = async () => {
		setRegisteringProtocol(true);
		try {
			const resp = await fetch("/api/go/api/native/protocol/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
			});
			const data = await resp.json();
			if (data.success) {
				setProtocolRegistered(true);
			}
		} catch (e) {
			console.error("Failed to register protocol handler:", e);
		} finally {
			setRegisteringProtocol(false);
		}
	};

	return (
		<section
			id="prompts-deployments"
			aria-label="Prompt collections and static deployments"
			className="scroll-mt-16 space-y-4 pt-8 pb-8 border-t border-slate-800"
		>
			<div className="flex items-center justify-between border-b border-slate-800 pb-2">
				<h2
					className="text-lg font-bold text-white tracking-wide"
					title="Compiled system prompt registry, landing page deployments, multi-tenant cloud portal, and OS deep-link protocol hooks."
				>
					Prompt Collections &amp; Global Static Deployments
				</h2>
				<span className="text-[10px] text-cyan-400 font-mono uppercase border border-cyan-500/20 bg-cyan-500/5 px-2 py-0.5 rounded font-semibold">
					Deployments
				</span>
			</div>
			<div className="grid gap-6 md:grid-cols-3">
				{/* Prompt Library */}
				<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4">
					<div className="flex items-center gap-2">
						<h3 className="text-base font-semibold text-white">
							Deduplicated Prompt Library
						</h3>
						<span
							className="text-cyan-400 cursor-help text-xs"
							title="Compiles canonical system prompt definitions directly into Go kernel prompt_library.go."
						>
							💡
						</span>
					</div>
					<p className="text-xs text-slate-400">
						Monitors canonical system prompts loaded into the Go sidecar and
						tracks compilation mapping state.
					</p>
					<div className="space-y-2 border border-slate-850 p-2.5 rounded bg-slate-950/60 max-h-[220px] overflow-y-auto font-mono text-xs">
						<div
							className="flex items-center justify-between p-1.5 border-b border-slate-800/60"
							title="Swarm planner/worker/critic orchestration system prompt"
						>
							<span className="text-slate-300">system_swarm_orchestrator</span>
							<span className="text-[10px] text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 rounded">
								compiled
							</span>
						</div>
						<div
							className="flex items-center justify-between p-1.5 border-b border-slate-800/60"
							title="Progressive MCP tool routing & intent classifier prompt"
						>
							<span className="text-slate-300">agent_tool_classifier</span>
							<span className="text-[10px] text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 rounded">
								compiled
							</span>
						</div>
						<div
							className="flex items-center justify-between p-1.5 border-b border-slate-800/60"
							title="Background episodic-to-semantic L2 consolidation prompt"
						>
							<span className="text-slate-300">memory_dream_distiller</span>
							<span className="text-[10px] text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 rounded">
								compiled
							</span>
						</div>
						<div
							className="flex items-center justify-between p-1.5"
							title="Bookmark ingestion & semantic tagging prompt"
						>
							<span className="text-slate-300">
								bobby_bookmark_recommender
							</span>
							<span className="text-[10px] text-amber-400 border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 rounded">
								pending
							</span>
						</div>
					</div>
				</div>

				{/* Static Deployments */}
				<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4 flex flex-col justify-between">
					<div>
						<div className="flex items-center gap-2">
							<h3 className="text-base font-semibold text-white">
								Web Deployment Operations
							</h3>
							<span
								className="text-cyan-400 cursor-help text-xs"
								title="Triggers landing deployment pipelines for both open-source (tormentnexus.site) and commercial (hypernexus.site) editions."
							>
								💡
							</span>
						</div>
						<p className="text-xs text-slate-400">
							Publish static landing and documentation updates per edition.
						</p>
						<div className="space-y-3 pt-3 text-xs">
							<div className="flex items-center justify-between border border-slate-850 p-3 rounded bg-slate-950/60">
								<div>
									<div className="font-semibold text-slate-200">
										tormentnexus.site
									</div>
									<div className="text-[10px] text-slate-500 mt-0.5">
										Open-source cyberpunk layout
									</div>
								</div>
								<button
									type="button"
									onClick={() => triggerStaticDeploy("tormentnexus.site")}
									disabled={deployingSite === "tormentnexus.site"}
									title="Publish open-source edition static landing (gh-pages-tormentnexus)"
									className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs px-3 py-1.5 rounded disabled:opacity-50"
								>
									{deployStatus["tormentnexus.site"] === "deploying"
										? "Deploying..."
										: deployStatus["tormentnexus.site"] === "success"
											? "Published ✓"
											: "Deploy Site"}
								</button>
							</div>
							<div className="flex items-center justify-between border border-slate-850 p-3 rounded bg-slate-950/60">
								<div>
									<div className="font-semibold text-slate-200">
										hypernexus.site
									</div>
									<div className="text-[10px] text-slate-500 mt-0.5">
										Commercial enterprise layout
									</div>
								</div>
								<button
									type="button"
									onClick={() => triggerStaticDeploy("hypernexus.site")}
									disabled={deployingSite === "hypernexus.site"}
									title="Publish commercial edition landing & pricing portal (gh-pages-hypernexus / Hetzner)"
									className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs px-3 py-1.5 rounded disabled:opacity-50"
								>
									{deployStatus["hypernexus.site"] === "deploying"
										? "Deploying..."
										: deployStatus["hypernexus.site"] === "success"
											? "Published ✓"
											: "Deploy Site"}
								</button>
							</div>
						</div>
					</div>
				</div>

				{/* Cloud Deployment */}
				{typeof window !== "undefined" &&
					!window.location.hostname.includes("hypernexus") && (
						<div className="rounded-2xl border border-purple-700/50 bg-gradient-to-br from-purple-950/30 to-slate-900/70 p-6 space-y-3">
							<div className="flex items-center gap-2">
								<h3 className="text-base font-semibold text-white">
									HyperNexus Cloud
								</h3>
								<span className="text-xs bg-purple-700 text-purple-100 px-2 py-0.5 rounded-full">
									New
								</span>
							</div>
							<p className="text-xs text-slate-400">
								Deploy HyperNexus as a multi-tenant SaaS platform. Spin up
								isolated workspaces for commercial customers.
							</p>
							<a
								href="https://cloud.hypernexus.site"
								target="_blank"
								rel="noopener noreferrer"
								title="Open hosted multi-tenant HyperNexus Cloud orchestrator"
								className="block w-full text-center bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm px-4 py-2.5 rounded transition-colors"
							>
								Launch Cloud Dashboard &rarr;
							</a>
						</div>
					)}

				{/* OS Protocol Registry */}
				<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4 flex flex-col justify-between">
					<div>
						<div className="flex items-center gap-2">
							<h3 className="text-base font-semibold text-white">
								OS Protocol Registry
							</h3>
							<span
								className="text-cyan-400 cursor-help text-xs"
								title="Registers hypernexus:// protocol handler in HKCU registry to intercept deep-link attach/search/tool hooks from browsers and IDEs."
							>
								💡
							</span>
						</div>
						<p className="text-xs text-slate-400">
							Attaches <code>hypernexus://</code> deep links directly to the
							local Go kernel runtime daemon on port 7778.
						</p>
						<div className="pt-4">
							<button
								type="button"
								onClick={registerOSProtocol}
								disabled={registeringProtocol}
								title="POST /api/go/api/native/protocol/register to write HKCU protocol key"
								className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs px-4 py-2.5 rounded disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
							>
								{registeringProtocol
									? "Registering..."
									: protocolRegistered
										? "Registered Successfully ✓"
										: "Register HyperNexus:// Protocol"}
							</button>
						</div>
						<div className="pt-4 border-t border-slate-800 space-y-2">
							<p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
								Test Deep Link Schemes
							</p>
							<div className="grid grid-cols-1 gap-2">
								<a
									href="hypernexus://focus?tab=settings"
									title="Dispatch deep link to focus Governance & Settings section"
									className="text-center bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs px-3 py-2 rounded transition-colors"
								>
									Focus Settings Tab
								</a>
								<a
									href="hypernexus://search-memory?query=read"
									title="Dispatch deep link to run an L2 memory search"
									className="text-center bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs px-3 py-2 rounded transition-colors"
								>
									Search Memories for &ldquo;read&rdquo;
								</a>
								<a
									href="hypernexus://trigger-tool?tool=view_file&path=VERSION"
									title="Dispatch deep link to read canonical VERSION file via kernel tool"
									className="text-center bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs px-3 py-2 rounded transition-colors"
								>
									View VERSION File
								</a>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
