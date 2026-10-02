"use client";

import { useState } from "react";

interface Plan {
	id: string;
	name: string;
	description: string;
	price: number;
	interval: string;
	features: string[];
}

const PLANS: Plan[] = [
	{
		id: "basic",
		name: "Basic",
		description: "For individuals and small teams",
		price: 29,
		interval: "month",
		features: ["1 user", "100K tokens/month", "Basic support", "Community access"],
	},
	{
		id: "pro",
		name: "Pro",
		description: "For professional developers",
		price: 99,
		interval: "month",
		features: ["5 users", "1M tokens/month", "Priority support", "API access", "Custom models"],
	},
	{
		id: "commercial",
		name: "Commercial",
		description: "For organizations with advanced needs",
		price: 499,
		interval: "month",
		features: ["Unlimited users", "Unlimited tokens", "24/7 support", "SSO/SAML", "Dedicated infrastructure", "SLA guarantees"],
	},
];

export default function PricingPage() {
	const [loading, setLoading] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	async function handleCheckout(planId: string) {
		setLoading(planId);
		setError(null);
		try {
			const res = await fetch("/api/go/api/billing/stripe/checkout", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					plan: planId,
					successUrl: `${window.location.origin}/dashboard?billing=success`,
					cancelUrl: `${window.location.origin}/pricing?billing=cancelled`,
				}),
			});
			const data = await res.json();
			if (data.url || data.sessionUrl) {
				window.location.href = data.url || data.sessionUrl;
			} else if (data.error) {
				setError(data.error);
			} else {
				// Local dev simulation
				alert(`Checkout simulated for plan: ${planId}\n${JSON.stringify(data, null, 2)}`);
			}
		} catch (e: any) {
			setError(e.message || "Checkout failed");
		} finally {
			setLoading(null);
		}
	}

	return (
		<main className="min-h-screen bg-gray-950 text-white">
			<div className="max-w-6xl mx-auto px-6 py-20">
				<div className="text-center mb-16">
					<h1 className="text-5xl font-bold mb-4">Simple, Transparent Pricing</h1>
					<p className="text-xl text-gray-400 max-w-2xl mx-auto">
						Powerful AI control plane with persistent memory, MCP orchestration, and multi-agent coordination.
					</p>
				</div>

				{error && (
					<div className="mb-8 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-center">
						{error}
					</div>
				)}

				<div className="grid md:grid-cols-3 gap-8">
					{PLANS.map((plan) => (
						<div
							key={plan.id}
							className={`rounded-2xl border p-8 ${
								plan.id === "pro"
									? "border-blue-500 bg-gray-900 relative scale-105 shadow-xl shadow-blue-500/20"
									: "border-gray-800 bg-gray-900"
							}`}
						>
							{plan.id === "pro" && (
								<div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-sm font-semibold px-4 py-1 rounded-full">
									Most Popular
								</div>
							)}
							<h2 className="text-2xl font-bold mb-2">{plan.name}</h2>
							<p className="text-gray-400 mb-6">{plan.description}</p>
							<div className="mb-8">
								<span className="text-5xl font-bold">${plan.price}</span>
								<span className="text-gray-400">/{plan.interval}</span>
							</div>
							<ul className="space-y-3 mb-8">
								{plan.features.map((f) => (
									<li key={f} className="flex items-center gap-3">
										<svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
										</svg>
										<span className="text-gray-300">{f}</span>
									</li>
								))}
							</ul>
							<button
								onClick={() => handleCheckout(plan.id)}
								disabled={loading === plan.id}
								className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
									plan.id === "pro"
										? "bg-blue-500 hover:bg-blue-600 text-white"
										: "bg-gray-800 hover:bg-gray-700 text-white"
								} disabled:opacity-50`}
							>
								{loading === plan.id ? "Redirecting..." : `Get ${plan.name}`}
							</button>
						</div>
					))}
				</div>

				<div className="mt-16 text-center text-gray-500">
					<p>All plans include a 14-day free trial. No credit card required.</p>
					<p className="mt-2">
						<a href="/dashboard" className="text-blue-400 hover:underline">← Back to Dashboard</a>
					</p>
				</div>
			</div>
		</main>
	);
}
