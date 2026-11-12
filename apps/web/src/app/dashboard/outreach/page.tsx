"use client";

import { useState, useEffect } from "react";

interface Contact {
	id: number;
	email: string;
	company: string;
	category: string;
	tier: number;
	status: string;
	last_contacted: string;
	follow_up_count: number;
	response_received: boolean;
	notes: string;
}

interface Stats {
	total: number;
	contacted: number;
	pending: number;
	responses: number;
	response_rate: number;
	by_category: Record<string, number>;
	by_status: Record<string, number>;
}

export default function OutreachDashboard() {
	const [contacts, setContacts] = useState<Contact[]>([]);
	const [stats, setStats] = useState<Stats | null>(null);
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState("all");

	useEffect(() => {
		loadOutreachData();
	}, []);

	async function loadOutreachData() {
		try {
			// Load from localStorage (in production, this would be an API)
			const savedContacts = localStorage.getItem("outreach_contacts");
			if (savedContacts) {
				const parsed = JSON.parse(savedContacts);
				setContacts(parsed);
				calculateStats(parsed);
			}
		} catch (err) {
			console.error("Failed to load outreach data:", err);
		} finally {
			setLoading(false);
		}
	}

	function calculateStats(data: Contact[]) {
		const total = data.length;
		const contacted = data.filter((c) => c.status === "contacted").length;
		const pending = data.filter((c) => c.status === "pending").length;
		const responses = data.filter((c) => c.response_received).length;
		const response_rate = contacted > 0 ? (responses / contacted) * 100 : 0;

		const by_category: Record<string, number> = {};
		const by_status: Record<string, number> = {};

		data.forEach((c) => {
			by_category[c.category] = (by_category[c.category] || 0) + 1;
			by_status[c.status] = (by_status[c.status] || 0) + 1;
		});

		setStats({
			total,
			contacted,
			pending,
			responses,
			response_rate,
			by_category,
			by_status,
		});
	}

	const filteredContacts =
		filter === "all"
			? contacts
			: contacts.filter((c) => c.category === filter || c.status === filter);

	if (loading) {
		return (
			<div style={{ padding: "2rem", textAlign: "center", color: "#a1a1aa" }}>
				Loading outreach dashboard...
			</div>
		);
	}

	return (
		<div style={{ maxWidth: 1400, margin: "0 auto", padding: "2rem" }}>
			<h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
				Acquisition Outreach
			</h1>
			<p style={{ color: "#a1a1aa", marginBottom: "2rem" }}>
				Track outreach to 100+ AI companies
			</p>

			{/* Stats Cards */}
			{stats && (
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(5, 1fr)",
						gap: "1rem",
						marginBottom: "2rem",
					}}
				>
					<StatCard
						label="Total Contacts"
						value={stats.total.toString()}
						color="#3b82f6"
					/>
					<StatCard
						label="Contacted"
						value={stats.contacted.toString()}
						color="#22c55e"
					/>
					<StatCard
						label="Pending"
						value={stats.pending.toString()}
						color="#f59e0b"
					/>
					<StatCard
						label="Responses"
						value={stats.responses.toString()}
						color="#22c55e"
					/>
					<StatCard
						label="Response Rate"
						value={`${stats.response_rate.toFixed(1)}%`}
						color="#8b5cf6"
					/>
				</div>
			)}

			{/* Category Breakdown */}
			{stats && (
				<section
					style={{
						background: "#18181b",
						borderRadius: 12,
						padding: "1.5rem",
						marginBottom: "2rem",
					}}
				>
					<h2 style={{ marginBottom: "1rem" }}>By Category</h2>
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
							gap: "0.75rem",
						}}
					>
						{Object.entries(stats.by_category).map(([cat, count]) => (
							<div
								key={cat}
								style={{
									display: "flex",
									justifyContent: "space-between",
									padding: "0.5rem 0.75rem",
									background: "#27272a",
									borderRadius: 6,
								}}
							>
								<span style={{ textTransform: "capitalize" }}>
									{cat.replace("_", " ")}
								</span>
								<span style={{ color: "#22c55e", fontWeight: 600 }}>
									{count}
								</span>
							</div>
						))}
					</div>
				</section>
			)}

			{/* Filters */}
			<div
				style={{
					display: "flex",
					gap: "0.5rem",
					marginBottom: "1.5rem",
					flexWrap: "wrap",
				}}
			>
				{[
					"all",
					"contacted",
					"pending",
					"responded",
					"ai_coding",
					"local_ai",
					"frameworks",
					"model_providers",
					"infrastructure",
				].map((f) => (
					<button
						key={f}
						onClick={() => setFilter(f)}
						style={{
							padding: "0.5rem 1rem",
							background: filter === f ? "#22c55e" : "#27272a",
							color: filter === f ? "#000" : "#e4e4e7",
							border: "none",
							borderRadius: 6,
							cursor: "pointer",
							fontWeight: 600,
							textTransform: "capitalize",
							fontSize: "0.875rem",
						}}
					>
						{f.replace("_", " ")}
					</button>
				))}
			</div>

			{/* Contacts Table */}
			<section
				style={{ background: "#18181b", borderRadius: 12, padding: "1.5rem" }}
			>
				<h2 style={{ marginBottom: "1rem" }}>
					Contacts ({filteredContacts.length})
				</h2>
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
									Company
								</th>
								<th
									style={{
										padding: "0.75rem",
										textAlign: "left",
										color: "#a1a1aa",
									}}
								>
									Email
								</th>
								<th
									style={{
										padding: "0.75rem",
										textAlign: "left",
										color: "#a1a1aa",
									}}
								>
									Category
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
									Follow-ups
								</th>
								<th
									style={{
										padding: "0.75rem",
										textAlign: "left",
										color: "#a1a1aa",
									}}
								>
									Last Contacted
								</th>
							</tr>
						</thead>
						<tbody>
							{filteredContacts.slice(0, 50).map((contact) => (
								<tr
									key={contact.id}
									style={{ borderBottom: "1px solid #27272a" }}
								>
									<td style={{ padding: "0.75rem", fontWeight: 600 }}>
										{contact.company}
									</td>
									<td
										style={{
											padding: "0.75rem",
											color: "#a1a1aa",
											fontSize: "0.875rem",
										}}
									>
										{contact.email}
									</td>
									<td style={{ padding: "0.75rem" }}>
										<span
											style={{
												padding: "0.125rem 0.5rem",
												borderRadius: 4,
												background: "#3b82f620",
												color: "#3b82f6",
												fontSize: "0.75rem",
												textTransform: "capitalize",
											}}
										>
											{contact.category?.replace("_", " ") || "general"}
										</span>
									</td>
									<td style={{ padding: "0.75rem" }}>
										<span
											style={{
												padding: "0.125rem 0.5rem",
												borderRadius: 4,
												background:
													contact.status === "contacted"
														? "#22c55e20"
														: "#f59e0b20",
												color:
													contact.status === "contacted"
														? "#22c55e"
														: "#f59e0b",
												fontSize: "0.75rem",
											}}
										>
											{contact.status}
										</span>
									</td>
									<td style={{ padding: "0.75rem", color: "#a1a1aa" }}>
										{contact.follow_up_count}
									</td>
									<td
										style={{
											padding: "0.75rem",
											color: "#71717a",
											fontSize: "0.875rem",
										}}
									>
										{contact.last_contacted || "Never"}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>

			{/* Actions */}
			<div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
				<button
					onClick={() => window.open("/api/go/api/mcp/status", "_blank")}
					style={{
						padding: "0.75rem 1.5rem",
						background: "#22c55e",
						color: "#000",
						border: "none",
						borderRadius: 8,
						fontWeight: 600,
						cursor: "pointer",
					}}
				>
					Export CSV
				</button>
				<button
					onClick={() => window.location.reload()}
					style={{
						padding: "0.75rem 1.5rem",
						background: "#27272a",
						color: "#e4e4e7",
						border: "1px solid #3f3f46",
						borderRadius: 8,
						fontWeight: 600,
						cursor: "pointer",
					}}
				>
					Refresh Data
				</button>
			</div>
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
