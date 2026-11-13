import { useState } from "react";
import { WorkflowVisualizer } from "@hypernexus/ui";
import { trpc } from "../../utils/trpc";

/**
 * DashboardWorkflowOrchestrationSection encapsulates the multi-agent graph
 * workflow selector, live DAG node visualizer, and active execution controls
 * (Start / Pause / Resume). All workflow tRPC queries and local UI selection
 * state live inside this section so parent re-renders do not poll or re-mount
 * sibling console panels.
 */
export function DashboardWorkflowOrchestrationSection() {
	const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(
		"test-workflow",
	);
	const [activeExecutionId, setActiveExecutionId] = useState<string | null>(
		null,
	);
	const { data: workflowsList } = trpc.workflow.list.useQuery();
	const { data: workflowGraph } = trpc.workflow.getGraph.useQuery(
		{ workflowId: selectedWorkflowId! },
		{ enabled: !!selectedWorkflowId },
	);
	const { data: workflowExecutions, refetch: refetchWorkflowExecutions } =
		trpc.workflow.listExecutions.useQuery(undefined, { refetchInterval: 5000 });
	const startWorkflowMutation = trpc.workflow.start.useMutation();
	const resumeWorkflowMutation = trpc.workflow.resume.useMutation();
	const pauseWorkflowMutation = trpc.workflow.pause.useMutation();

	const triggerRunWorkflow = async () => {
		if (!selectedWorkflowId) return;
		try {
			const res = await startWorkflowMutation.mutateAsync({
				workflowId: selectedWorkflowId,
			});
			if (res && (res as any).id) {
				setActiveExecutionId((res as any).id);
				refetchWorkflowExecutions();
			}
		} catch {}
	};

	return (
		<section
			id="workflow-orchestration"
			aria-label="Autonomous workflow orchestration"
			className="scroll-mt-16 space-y-4 pt-8 pb-8 border-t border-slate-800"
		>
			<div className="flex items-center justify-between border-b border-slate-800 pb-2">
				<h2
					className="text-lg font-bold text-white tracking-wide font-mono"
					title="Multi-step RECALL → DISCOVER → EXECUTE → PERSIST → VERIFY graph workflows executed by the Go control plane."
				>
					Autonomous Workflow Orchestration
				</h2>
				<span
					className="text-[10px] text-cyan-400 font-mono uppercase border border-cyan-500/20 bg-cyan-500/5 px-2 py-0.5 rounded font-semibold"
					title="Live DAG execution engine polling every 5 seconds"
				>
					Workflow Engine
				</span>
			</div>

			<div className="grid gap-6 md:grid-cols-3">
				{/* Workflow Library */}
				<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4 md:col-span-1">
					<div className="flex items-center gap-2">
						<h3 className="text-base font-semibold text-white">
							Workflow Library
						</h3>
						<span
							className="text-cyan-400 cursor-help text-xs"
							title="Lists all configured workflow definition topologies registered in the kernel."
						>
							💡
						</span>
					</div>
					<p className="text-xs text-slate-400">
						Select a workflow topology to inspect its step graph or launch a new
						execution.
					</p>
					<div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 font-mono">
						{workflowsList && workflowsList.length > 0 ? (
							workflowsList.map((wf: any) => (
								<button
									key={wf.id}
									type="button"
									onClick={() => setSelectedWorkflowId(wf.id)}
									title={`Inspect workflow graph for ${wf.name || wf.id}`}
									className={`w-full text-left p-2.5 rounded text-xs transition-colors flex items-center justify-between border ${
										selectedWorkflowId === wf.id
											? "border-cyan-500/40 bg-cyan-500/10 text-white font-bold"
											: "border-slate-800 bg-zinc-950/60 text-slate-400 hover:text-slate-200"
									}`}
								>
									<span>{wf.name || wf.id}</span>
									<span className="text-[9px] text-slate-500 font-mono">
										{wf.id}
									</span>
								</button>
							))
						) : (
							<>
								<button
									type="button"
									onClick={() => setSelectedWorkflowId("test-workflow")}
									title="Select built-in verification workflow topology"
									className={`w-full text-left p-2.5 rounded text-xs transition-colors flex items-center justify-between border ${
										selectedWorkflowId === "test-workflow"
											? "border-cyan-500/40 bg-cyan-500/10 text-white font-bold"
											: "border-slate-800 bg-zinc-950/60 text-slate-400 hover:text-slate-200"
									}`}
								>
									<span>Test Workflow</span>
									<span className="text-[9px] text-slate-500 font-mono">
										default
									</span>
								</button>
								<div className="text-[10px] text-slate-500 italic text-center py-2">
									No other custom workflows saved.
								</div>
							</>
						)}
					</div>
				</div>

				{/* Visualizer & Executions */}
				<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4 md:col-span-2 flex flex-col justify-between font-mono">
					<div>
						<div className="flex items-center justify-between border-b border-slate-800 pb-2">
							<div className="flex items-center gap-2">
								<h3 className="text-base font-semibold text-white">
									Active Node Visualizer
								</h3>
								<span
									className="text-cyan-400 cursor-help text-xs"
									title="Visualizes active step transitions inside the multi-agent graph model."
								>
									💡
								</span>
							</div>
							<button
								type="button"
								onClick={triggerRunWorkflow}
								disabled={
									!selectedWorkflowId || startWorkflowMutation.isPending
								}
								title="Start a new execution instance of the selected workflow topology"
								className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs px-3.5 py-1 rounded transition-colors disabled:opacity-50"
							>
								{startWorkflowMutation.isPending
									? "Starting..."
									: "Run Active Workflow"}
							</button>
						</div>

						<div className="h-48 border border-slate-850 bg-zinc-955 rounded my-3 flex items-center justify-center relative overflow-hidden">
							{workflowGraph ? (
								<WorkflowVisualizer
									data={workflowGraph as any}
									activeNodeId={
										workflowExecutions?.find(
											(x: any) => x.id === activeExecutionId,
										)?.currentNode
									}
									className="h-full w-full border-0 rounded"
								/>
							) : (
								<span className="text-xs text-slate-500 font-mono">
									No Graph Data Loaded for {selectedWorkflowId || "None"}
								</span>
							)}
						</div>

						<div className="pt-2">
							<span className="text-[10px] font-bold text-slate-400 tracking-wider block mb-2">
								RUNNING EXECUTIONS ({workflowExecutions?.length || 0})
							</span>
							<div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
								{!workflowExecutions || workflowExecutions.length === 0 ? (
									<div className="text-xs text-slate-600 italic">
										No executions currently active.
									</div>
								) : (
									workflowExecutions.map((exec: any) => (
										<div
											key={exec.id}
											className="border border-slate-850 bg-zinc-955 p-2.5 rounded flex items-center justify-between text-xs"
										>
											<div className="flex items-center gap-2">
												<span
													className={`px-1.5 py-0.2 rounded text-[9px] font-bold font-mono ${
														exec.status === "running"
															? "bg-cyan-500/10 text-cyan-400"
															: "bg-zinc-800 text-slate-400"
													}`}
												>
													{exec.status}
												</span>
												<span
													className="font-mono text-slate-200 select-all"
													title={`Execution ID: ${exec.id}`}
												>
													{exec.id?.slice(0, 12)}...
												</span>
												<span className="text-slate-500 font-mono">
													Node: {exec.currentNode || "none"}
												</span>
											</div>
											<div className="flex gap-1.5">
												{exec.status === "running" && (
													<button
														type="button"
														onClick={() =>
															pauseWorkflowMutation.mutate({
																executionId: exec.id,
															})
														}
														title="Pause execution after current node completes"
														className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-[10px] rounded"
													>
														Pause
													</button>
												)}
												{exec.status === "paused" && (
													<button
														type="button"
														onClick={() =>
															resumeWorkflowMutation.mutate({
																executionId: exec.id,
															})
														}
														title="Resume paused workflow execution"
														className="px-2 py-0.5 bg-cyan-600 hover:bg-cyan-500 text-[10px] rounded"
													>
														Resume
													</button>
												)}
											</div>
										</div>
									))
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
