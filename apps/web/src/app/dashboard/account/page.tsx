"use client";

import { useState, useEffect } from "react";

interface UsageStats {
	memoryCount: number;
	versionedIds: number;
	scratchpadKeys: number;
	uptimeSec: number;
}

interface AccountStatus {
	authenticated: boolean;
	plan: string;
	email: string;
}

export default function AccountPage() {
	const [usage, setUsage] = useState<UsageStats | null>(null);
	const [account, setAccount] = useState<AccountStatus | null>(null);
	const [billing, setBilling] = useState<any>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function load() {
			try {
				const [usageRes, acctRes, billRes] = await Promise.allSettled([
					fetch("/api/go/api/usage/metering").then((r) => r.json()),
					fetch("/api/go/api/account/status").then((r) => r.json()),
					fetch("/api/go/api/billing/status").then((r) => r.json()),
				]);
				if (usageRes.status === "fulfilled" && usageRes.value?.usage) {
					setUsage(usageRes.value.usage);
				}
				if (acctRes.status === "fulfilled" && acctRes.value?.data) {
					setAccount(acctRes.value.data);
				}
				if (billRes.status === "fulfilled" && billRes.value?.data) {
					setBilling(billRes.value.data);
				}
			} catch (e) {
				console.error("Failed to load account data", e);
			} finally {
				setLoading(false);
			}
		}
		load();
	}, []);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
			</div>
		);
	}

	return (
		<div className="max-w-4xl mx-auto space-y-8">
			<div>
				<h1 className="text-3xl font-bold text-white">Account</h1>
				<p className="text-gray-400 mt-2">Manage your account, usage, and billing.</p>
			</div>

			{/* Account Info */}
			<div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
				<h2 className="text-xl font-semibold text-white mb-4">Account Info</h2>
				<div className="grid grid-cols-2 gap-4">
					<div>
						<div className="text-gray-500 text-sm">Email</div>
						<div className="text-white">{account?.email || "Not set"}</div>
					</div>
					<div>
						<div className="text-gray-500 text-sm">Plan</div>
						<div className="text-white">{account?.plan || billing?.plan || "Free"}</div>
					</div>
					<div>
						<div className="text-gray-500 text-sm">Status</div>
						<div className="text-green-400">{account?.authenticated ? "Authenticated" : "Local mode"}</div>
					</div>
					<div>
						<div className="text-gray-500 text-sm">License</div>
						<div className="text-yellow-400">Free mode (no license file)</div>
					</div>
				</div>
			</div>

			{/* Usage Stats */}
			<div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
				<h2 className="text-xl font-semibold text-white mb-4">Usage</h2>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					<div className="bg-gray-800 rounded-lg p-4 text-center">
						<div className="text-3xl font-bold text-blue-400">{usage?.memoryCount ?? 0}</div>
						<div className="text-gray-500 text-sm mt-1">Memories</div>
					</div>
					<div className="bg-gray-800 rounded-lg p-4 text-center">
						<div className="text-3xl font-bold text-purple-400">{usage?.versionedIds ?? 0}</div>
						<div className="text-gray-500 text-sm mt-1">Versioned IDs</div>
					</div>
					<div className="bg-gray-800 rounded-lg p-4 text-center">
						<div className="text-3xl font-bold text-green-400">{usage?.scratchpadKeys ?? 0}</div>
						<div className="text-gray-500 text-sm mt-1">Scratchpad Keys</div>
					</div>
					<div className="bg-gray-800 rounded-lg p-4 text-center">
						<div className="text-3xl font-bold text-yellow-400">{Math.round((usage?.uptimeSec ?? 0) / 60)}</div>
						<div className="text-gray-500 text-sm mt-1">Uptime (min)</div>
					</div>
				</div>
			</div>

			{/* Billing */}
			<div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
				<h2 className="text-xl font-semibold text-white mb-4">Billing</h2>
				{billing ? (
					<div className="grid grid-cols-2 gap-4">
						<div>
							<div className="text-gray-500 text-sm">Plan</div>
							<div className="text-white">{billing.plan || "Free"}</div>
						</div>
						<div>
							<div className="text-gray-500 text-sm">Status</div>
							<div className="text-white">{billing.status || "active"}</div>
						</div>
					</div>
				) : (
					<p className="text-gray-400">No billing information available.</p>
				)}
				<div className="mt-6">
					<a
						href="/pricing"
						className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
					>
						Upgrade Plan
					</a>
				</div>
			</div>
		</div>
	);
}
