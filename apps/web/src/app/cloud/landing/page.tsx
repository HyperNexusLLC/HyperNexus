"use client";

import Link from "next/link";

const FEATURES = [
	{
		icon: "🧠",
		title: "Persistent L2 Memory",
		description: "Vector-based semantic memory that survives across sessions. Facts, decisions, and context — never lost.",
	},
	{
		icon: "🔌",
		title: "MCP Orchestration",
		description: "56+ MCP servers auto-connected. Progressive tool injection with BM25-ranked search across 26K+ tools.",
	},
	{
		icon: "🤝",
		title: "Multi-Agent Coordination",
		description: "A2A protocol, shared memory vault with RBAC, gossip P2P mesh, and role-rotating swarms.",
	},
	{
		icon: "🔐",
		title: "Enterprise Security",
		description: "AES-256-GCM encryption at rest, audit logging, RBAC (admin/writer/reader/guest), SSO/SAML.",
	},
	{
		icon: "⚡",
		title: "Provider Waterfall",
		description: "Auto-failover across GPT, Claude, Gemini, and local models. Cost-aware routing with budget controls.",
	},
	{
		icon: "📊",
		title: "Full Observability",
		description: "Usage metering, tool selection telemetry, memory versioning, and real-time health monitoring.",
	},
];

export default function CloudLandingPage() {
	return (
		<main className="min-h-screen bg-gray-950 text-white">
			{/* Hero */}
			<section className="relative overflow-hidden">
				<div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 via-gray-950 to-purple-900/30" />
				<div className="relative max-w-6xl mx-auto px-6 pt-32 pb-24 text-center">
					<h1 className="text-6xl font-bold mb-6 leading-tight">
						Your AI Control Plane
						<span className="block text-blue-400">for Everything</span>
					</h1>
					<p className="text-2xl text-gray-300 max-w-3xl mx-auto mb-10">
						HyperNexus connects Claude, GPT, Gemini, and local models through a unified interface with
						persistent memory, MCP tool orchestration, and multi-agent coordination.
					</p>
					<div className="flex justify-center gap-4">
						<Link
							href="/pricing"
							className="px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white text-lg font-semibold rounded-lg transition-colors"
						>
							Start Free Trial
						</Link>
						<Link
							href="/dashboard"
							className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white text-lg font-semibold rounded-lg transition-colors"
						>
							Open Dashboard
						</Link>
					</div>
				</div>
			</section>

			{/* Features */}
			<section className="max-w-6xl mx-auto px-6 py-24">
				<h2 className="text-4xl font-bold text-center mb-16">Everything You Need</h2>
				<div className="grid md:grid-cols-3 gap-8">
					{FEATURES.map((f) => (
						<div key={f.title} className="bg-gray-900 rounded-2xl border border-gray-800 p-8 hover:border-blue-500/50 transition-colors">
							<div className="text-4xl mb-4">{f.icon}</div>
							<h3 className="text-xl font-semibold mb-3">{f.title}</h3>
							<p className="text-gray-400">{f.description}</p>
						</div>
					))}
				</div>
			</section>

			{/* Stats */}
			<section className="bg-gray-900 border-y border-gray-800">
				<div className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
					<div>
						<div className="text-4xl font-bold text-blue-400">56+</div>
						<div className="text-gray-400 mt-2">MCP Servers</div>
					</div>
					<div>
						<div className="text-4xl font-bold text-blue-400">554</div>
						<div className="text-gray-400 mt-2">API Endpoints</div>
					</div>
					<div>
						<div className="text-4xl font-bold text-blue-400">26K+</div>
						<div className="text-gray-400 mt-2">Indexed Tools</div>
					</div>
					<div>
						<div className="text-4xl font-bold text-blue-400">99.9%</div>
						<div className="text-gray-400 mt-2">Uptime SLA</div>
					</div>
				</div>
			</section>

			{/* CTA */}
			<section className="max-w-4xl mx-auto px-6 py-24 text-center">
				<h2 className="text-4xl font-bold mb-6">Ready to Take Control?</h2>
				<p className="text-xl text-gray-400 mb-10">
					Deploy in minutes. Scale to thousands of agents. Own your data.
				</p>
				<div className="flex justify-center gap-4">
					<Link
						href="/pricing"
						className="px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white text-lg font-semibold rounded-lg transition-colors"
					>
						View Pricing
					</Link>
					<a
						href="https://github.com/HyperNexusLLC/HyperNexus"
						target="_blank"
						rel="noopener noreferrer"
						className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white text-lg font-semibold rounded-lg transition-colors"
					>
						GitHub
					</a>
				</div>
			</section>

			{/* Footer */}
			<footer className="border-t border-gray-800 py-12">
				<div className="max-w-6xl mx-auto px-6 text-center text-gray-500">
					<p>© 2026 HyperNexus LLC. All rights reserved.</p>
					<div className="mt-4 flex justify-center gap-6">
						<Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
						<Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
						<a href="https://github.com/HyperNexusLLC/HyperNexus" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
					</div>
				</div>
			</footer>
		</main>
	);
}
