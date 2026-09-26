"use client";

import { useState, useEffect } from "react";

interface McpServer {
	name: string;
	url: string;
	status: string;
	toolCount: number;
	lastSeen: string;
}

interface McpTool {
	name: string;
	description: string;
	source: string;
	alwaysOn: boolean;
}

interface McpTraffic {
	id: string;
	timestamp: string;
	method: string;
	server: string;
	tool?: string;
	status: "success" | "error" | "pending";
	duration: number;
	request?: string;
	response?: string;
}

export default function McpDashboard() {
	const [servers, setServers] = useState<McpServer[]>([]);
	const [tools, setTools] = useState<McpTool[]>([]);
	const [traffic, setTraffic] = useState<McpTraffic[]>([]);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState<"overview" | "tools" | "traffic">(
		"overview",
	);

	useEffect(() => {
		loadMcpData();
		const interval = setInterval(loadMcpData, 30000); // Refresh every 30s
		return () => clearInterval(interval);
	}, []);

	async function loadMcpData() {
		try {
			// Load MCP status
			const statusRes = await fetch("/api/go/api/mcp/status");
			if (statusRes.ok) {
				const statusData = await statusRes.json();
				// Parse status data
			}

			// Load servers
			const serversRes = await fetch("/api/go/api/mcp/servers/runtime");
			if (serversRes.ok) {
				const serversData = await serversRes.json();
				setServers(serversData.data || []);
			}

			// Load tools
			const toolsRes = await fetch("/api/go/api/mcp/tools");
			if (toolsRes.ok) {
				const toolsData = await toolsRes.json();
				setTools(toolsData.data || []);
			}

			// Load traffic (from local storage or API)
			const savedTraffic = localStorage.getItem("mcp_traffic");
			if (savedTraffic) {
				setTraffic(JSON.parse(savedTraffic));
			}
		} catch (err) {
			console.error("Failed to load MCP data:", err);
		} finally {
			setLoading(false);
		}
	}

	function addTrafficEntry(entry: Omit<McpTraffic, "id" | "timestamp">) {
		const newEntry: McpTraffic = {
			...entry,
			id: crypto.randomUUID(),
			timestamp: new Date().toISOString(),
		};
		const updated = [newEntry, ...traffic].slice(0, 100); // Keep last 100
		setTraffic(updated);
		localStorage.setItem("mcp_traffic", JSON.stringify(updated));
	}

	if (loading) {
		return (
			<div style={{ padding: "2rem", textAlign: "center", color: "#a1a1aa" }}>
				Loading MCP dashboard...
			</div>
		);
	}

	return (
		<div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem" }}>
			<h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
				MCP Observability
			</h1>
			<p style={{ color: "#a1a1aa", marginBottom: "2rem" }}>
				Monitor MCP server connections, tool usage, and traffic
			</p>

			{/* Tabs */}
			<div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
				{(["overview", "tools", "traffic"] as const).map((tab) => (
					<button
						key={tab}
						onClick={() => setActiveTab(tab)}
						style={{
							padding: "0.5rem 1rem",
							background: activeTab === tab ? "#22c55e" : "#27272a",
							color: activeTab === tab ? "#000" : "#e4e4e7",
							border: "none",
							borderRadius: 6,
							cursor: "pointer",
							fontWeight: 600,
							textTransform: "capitalize",
						}}
					>
						{tab}
					</button>
				))}
			</div>

			{/* Overview Tab */}
			{activeTab === "overview" && (
				<div>
					{/* Stats */}
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(4, 1fr)",
							gap: "1rem",
							marginBottom: "2rem",
						}}
					>
						<StatCard
							label="MCP Servers"
							value={servers.length.toString()}
							color="#22c55e"
						/>
						<StatCard
							label="Available Tools"
							value={tools.length.toString()}
							color="#3b82f6"
						/>
						<StatCard
							label="Total Requests"
							value={traffic.length.toString()}
							color="#f59e0b"
						/>
						<StatCard
							label="Success Rate"
							value={
								traffic.length > 0
									? `${Math.round((traffic.filter((t) => t.status === "success").length / traffic.length) * 100)}%`
									: "N/A"
							}
							color="#22c55e"
						/>
					</div>

					{/* Servers */}
					<section
						style={{
							background: "#18181b",
							borderRadius: 12,
							padding: "1.5rem",
							marginBottom: "1.5rem",
						}}
					>
						<h2 style={{ marginBottom: "1rem" }}>Connected Servers</h2>
						{servers.length === 0 ? (
							<p style={{ color: "#a1a1aa" }}>No MCP servers connected</p>
						) : (
							<div style={{ display: "grid", gap: "0.75rem" }}>
								{servers.map((server) => (
									<div
										key={server.name}
										style={{
											display: "flex",
											justifyContent: "space-between",
											alignItems: "center",
											padding: "0.75rem",
											background: "#27272a",
											borderRadius: 8,
										}}
									>
										<div>
											<div style={{ fontWeight: 600 }}>{server.name}</div>
											<div style={{ color: "#71717a", fontSize: "0.875rem" }}>
												{server.url}
											</div>
										</div>
										<div
											style={{
												padding: "0.25rem 0.75rem",
												borderRadius: 9999,
												background:
													server.status === "connected"
														? "#22c55e20"
														: "#ef444420",
												color:
													server.status === "connected" ? "#22c55e" : "#ef4444",
												fontSize: "0.75rem",
												fontWeight: 600,
											}}
										>
											{server.status}
										</div>
									</div>
								))}
							</div>
						)}
					</section>

					{/* Recent Traffic */}
					<section
						style={{
							background: "#18181b",
							borderRadius: 12,
							padding: "1.5rem",
						}}
					>
						<h2 style={{ marginBottom: "1rem" }}>Recent Traffic</h2>
						{traffic.length === 0 ? (
							<p style={{ color: "#a1a1aa" }}>No traffic recorded yet</p>
						) : (
							<div style={{ overflowX: "auto" }}>
								<table style={{ width: "100%", borderCollapse: "collapse" }}>
									<thead>
										<tr style={{ borderBottom: "1px solid #27272a" }}>
											<th
												style={{
													padding: "0.75rem",
													textAlign: "left",
													color: "#a1a1aa",
												}}
											>
												Time
											</th>
											<th
												style={{
													padding: "0.75rem",
													textAlign: "left",
													color: "#a1a1aa",
												}}
											>
												Method
											</th>
											<th
												style={{
													padding: "0.75rem",
													textAlign: "left",
													color: "#a1a1aa",
												}}
											>
												Tool
											</th>
											<th
												style={{
													padding: "0.75rem",
													textAlign: "left",
													color: "#a1a1aa",
												}}
											>
												Status
											</th>
											<th
												style={{
													padding: "0.75rem",
													textAlign: "left",
													color: "#a1a1aa",
												}}
											>
												Duration
											</th>
										</tr>
									</thead>
									<tbody>
										{traffic.slice(0, 10).map((entry) => (
											<tr
												key={entry.id}
												style={{ borderBottom: "1px solid #27272a" }}
											>
												<td style={{ padding: "0.75rem", color: "#71717a" }}>
													{new Date(entry.timestamp).toLocaleTimeString()}
												</td>
												<td style={{ padding: "0.75rem" }}>{entry.method}</td>
												<td style={{ padding: "0.75rem" }}>
													{entry.tool || "-"}
												</td>
												<td style={{ padding: "0.75rem" }}>
													<span
														style={{
															color:
																entry.status === "success"
																	? "#22c55e"
																	: entry.status === "error"
																		? "#ef4444"
																		: "#f59e0b",
														}}
													>
														{entry.status}
													</span>
												</td>
												<td style={{ padding: "0.75rem", color: "#71717a" }}>
													{entry.duration}ms
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</section>
				</div>
			)}

			{/* Tools Tab */}
			{activeTab === "tools" && (
				<div>
					<section
						style={{
							background: "#18181b",
							borderRadius: 12,
							padding: "1.5rem",
						}}
					>
						<h2 style={{ marginBottom: "1rem" }}>
							Available MCP Tools ({tools.length})
						</h2>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
								gap: "1rem",
							}}
						>
							{tools.map((tool) => (
								<div
									key={tool.name}
									style={{
										background: "#27272a",
										borderRadius: 8,
										padding: "1rem",
									}}
								>
									<div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
										{tool.name}
									</div>
									<div
										style={{
											color: "#a1a1aa",
											fontSize: "0.875rem",
											marginBottom: "0.5rem",
										}}
									>
										{tool.description}
									</div>
									<div style={{ display: "flex", gap: "0.5rem" }}>
										<span
											style={{
												padding: "0.125rem 0.5rem",
												borderRadius: 4,
												background: "#3b82f620",
												color: "#3b82f6",
												fontSize: "0.75rem",
											}}
										>
											{tool.source}
										</span>
										{tool.alwaysOn && (
											<span
												style={{
													padding: "0.125rem 0.5rem",
													borderRadius: 4,
													background: "#22c55e20",
													color: "#22c55e",
													fontSize: "0.75rem",
												}}
											>
												always-on
											</span>
										)}
									</div>
								</div>
							))}
						</div>
					</section>
				</div>
			)}

			{/* Traffic Tab */}
			{activeTab === "traffic" && (
				<div>
					<section
						style={{
							background: "#18181b",
							borderRadius: 12,
							padding: "1.5rem",
						}}
					>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								marginBottom: "1rem",
							}}
						>
							<h2>MCP Traffic Log</h2>
							<button
								onClick={() => {
									setTraffic([]);
									localStorage.removeItem("mcp_traffic");
								}}
								style={{
									padding: "0.5rem 1rem",
									background: "#27272a",
									border: "1px solid #3f3f46",
									borderRadius: 6,
									color: "#a1a1aa",
									cursor: "pointer",
								}}
							>
								Clear Log
							</button>
						</div>

						{traffic.length === 0 ? (
							<p style={{ color: "#a1a1aa" }}>
								No traffic recorded yet. MCP requests will appear here.
							</p>
						) : (
							<div style={{ overflowX: "auto" }}>
								<table style={{ width: "100%", borderCollapse: "collapse" }}>
									<thead>
										<tr style={{ borderBottom: "1px solid #27272a" }}>
											<th
												style={{
													padding: "0.75rem",
													textAlign: "left",
													color: "#a1a1aa",
												}}
											>
												Time
											</th>
											<th
												style={{
													padding: "0.75rem",
													textAlign: "left",
													color: "#a1a1aa",
												}}
											>
												Method
											</th>
											<th
												style={{
													padding: "0.75rem",
													textAlign: "left",
													color: "#a1a1aa",
												}}
											>
												Server
											</th>
											<th
												style={{
													padding: "0.75rem",
													textAlign: "left",
													color: "#a1a1aa",
												}}
											>
												Tool
											</th>
											<th
												style={{
													padding: "0.75rem",
													textAlign: "left",
													color: "#a1a1aa",
												}}
											>
												Status
											</th>
											<th
												style={{
													padding: "0.75rem",
													textAlign: "left",
													color: "#a1a1aa",
												}}
											>
												Duration
											</th>
										</tr>
									</thead>
									<tbody>
										{traffic.map((entry) => (
											<tr
												key={entry.id}
												style={{ borderBottom: "1px solid #27272a" }}
											>
												<td style={{ padding: "0.75rem", color: "#71717a" }}>
													{new Date(entry.timestamp).toLocaleTimeString()}
												</td>
												<td style={{ padding: "0.75rem" }}>{entry.method}</td>
												<td style={{ padding: "0.75rem" }}>{entry.server}</td>
												<td style={{ padding: "0.75rem" }}>
													{entry.tool || "-"}
												</td>
												<td style={{ padding: "0.75rem" }}>
													<span
														style={{
															color:
																entry.status === "success"
																	? "#22c55e"
																	: entry.status === "error"
																		? "#ef4444"
																		: "#f59e0b",
														}}
													>
														{entry.status}
													</span>
												</td>
												<td style={{ padding: "0.75rem", color: "#71717a" }}>
													{entry.duration}ms
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</section>
				</div>
			)}
		</div>
	);
}

function StatCard({
	label,
	value,
	color,
}: {
	label: string;
	value: string;
	color: string;
}) {
	return (
		<div
			style={{
				background: "#18181b",
				border: "1px solid #27272a",
				borderRadius: 12,
				padding: "1.5rem",
				textAlign: "center",
			}}
		>
			<div style={{ fontSize: "2rem", fontWeight: 700, color }}>{value}</div>
			<div
				style={{ color: "#a1a1aa", fontSize: "0.875rem", marginTop: "0.25rem" }}
			>
				{label}
			</div>
		</div>
	);
}
