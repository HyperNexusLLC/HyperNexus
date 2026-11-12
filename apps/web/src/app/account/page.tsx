"use client";

import { useState, useEffect } from "react";

interface User {
	id: string;
	email: string;
	name: string;
	apiKey: string;
}

interface License {
	key: string;
	type: string;
	status: string;
	expiresAt: string | null;
	maxSeats: number;
	usedSeats: number;
}

interface Subscription {
	id: string;
	planId: string;
	status: string;
	currentPeriodEnd: string;
	cancelAtPeriodEnd: boolean;
}

export default function AccountPage() {
	const [user, setUser] = useState<User | null>(null);
	const [license, setLicense] = useState<License | null>(null);
	const [subscription, setSubscription] = useState<Subscription | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		loadAccountData();
	}, []);

	async function loadAccountData() {
		try {
			const token = localStorage.getItem("token");
			if (!token) {
				window.location.href = "/auth/login";
				return;
			}

			// Load user data
			const userRes = await fetch("/api/auth/me", {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (userRes.ok) {
				const userData = await userRes.json();
				setUser(userData);

				// Load license
				const licenseRes = await fetch(`/api/license/validate`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ licenseKey: userData.apiKey }),
				});
				if (licenseRes.ok) {
					const licenseData = await licenseRes.json();
					setLicense(licenseData.license);
				}

				// Load subscription
				const subRes = await fetch(`/api/subscription?userId=${userData.id}`);
				if (subRes.ok) {
					const subData = await subRes.json();
					setSubscription(subData.subscription);
				}
			}
		} catch (err) {
			setError("Failed to load account data");
		} finally {
			setLoading(false);
		}
	}

	async function handleCancelSubscription() {
		if (!subscription) return;
		if (
			!confirm(
				"Are you sure you want to cancel? You will retain access until the end of your billing period.",
			)
		)
			return;

		try {
			const res = await fetch("/api/subscription", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					subscriptionId: subscription.id,
					action: "cancel",
				}),
			});

			if (res.ok) {
				const data = await res.json();
				setSubscription(data.subscription);
				alert(
					"Subscription canceled. You retain access until " +
						new Date(data.subscription.currentPeriodEnd).toLocaleDateString(),
				);
			}
		} catch (err) {
			setError("Failed to cancel subscription");
		}
	}

	async function handleReactivateSubscription() {
		if (!subscription) return;

		try {
			const res = await fetch("/api/subscription", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					subscriptionId: subscription.id,
					action: "reactivate",
				}),
			});

			if (res.ok) {
				const data = await res.json();
				setSubscription(data.subscription);
				alert("Subscription reactivated!");
			}
		} catch (err) {
			setError("Failed to reactivate subscription");
		}
	}

	async function copyApiKey() {
		if (user?.apiKey) {
			await navigator.clipboard.writeText(user.apiKey);
			alert("API key copied to clipboard!");
		}
	}

	if (loading) {
		return (
			<div style={{ padding: "2rem", textAlign: "center", color: "#a1a1aa" }}>
				Loading...
			</div>
		);
	}

	if (error) {
		return (
			<div style={{ padding: "2rem", textAlign: "center", color: "#ef4444" }}>
				{error}
			</div>
		);
	}

	return (
		<div style={{ maxWidth: 800, margin: "0 auto", padding: "2rem" }}>
			<h1 style={{ fontSize: "2rem", marginBottom: "2rem" }}>
				Account Settings
			</h1>

			{/* User Info */}
			<section
				style={{
					background: "#18181b",
					borderRadius: 12,
					padding: "1.5rem",
					marginBottom: "1.5rem",
				}}
			>
				<h2 style={{ marginBottom: "1rem" }}>Profile</h2>
				<div style={{ display: "grid", gap: "0.75rem" }}>
					<div>
						<label style={{ color: "#a1a1aa", fontSize: "0.875rem" }}>
							Email
						</label>
						<p>{user?.email}</p>
					</div>
					<div>
						<label style={{ color: "#a1a1aa", fontSize: "0.875rem" }}>
							Name
						</label>
						<p>{user?.name || "Not set"}</p>
					</div>
					<div>
						<label style={{ color: "#a1a1aa", fontSize: "0.875rem" }}>
							API Key
						</label>
						<div
							style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
						>
							<code
								style={{
									background: "#27272a",
									padding: "0.5rem",
									borderRadius: 4,
									flex: 1,
								}}
							>
								{user?.apiKey ? `${user.apiKey.slice(0, 20)}...` : "Not set"}
							</code>
							<button
								onClick={copyApiKey}
								style={{
									padding: "0.5rem 1rem",
									background: "#22c55e",
									color: "#000",
									border: "none",
									borderRadius: 6,
									cursor: "pointer",
								}}
							>
								Copy
							</button>
						</div>
					</div>
				</div>
			</section>

			{/* License Info */}
			<section
				style={{
					background: "#18181b",
					borderRadius: 12,
					padding: "1.5rem",
					marginBottom: "1.5rem",
				}}
			>
				<h2 style={{ marginBottom: "1rem" }}>License</h2>
				{license ? (
					<div style={{ display: "grid", gap: "0.75rem" }}>
						<div>
							<label style={{ color: "#a1a1aa", fontSize: "0.875rem" }}>
								License Key
							</label>
							<code
								style={{
									display: "block",
									background: "#27272a",
									padding: "0.5rem",
									borderRadius: 4,
								}}
							>
								{license.key}
							</code>
						</div>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "1fr 1fr",
								gap: "1rem",
							}}
						>
							<div>
								<label style={{ color: "#a1a1aa", fontSize: "0.875rem" }}>
									Type
								</label>
								<p style={{ textTransform: "capitalize" }}>{license.type}</p>
							</div>
							<div>
								<label style={{ color: "#a1a1aa", fontSize: "0.875rem" }}>
									Status
								</label>
								<p
									style={{
										color: license.status === "active" ? "#22c55e" : "#ef4444",
									}}
								>
									{license.status}
								</p>
							</div>
							<div>
								<label style={{ color: "#a1a1aa", fontSize: "0.875rem" }}>
									Seats
								</label>
								<p>
									{license.usedSeats} / {license.maxSeats}
								</p>
							</div>
							<div>
								<label style={{ color: "#a1a1aa", fontSize: "0.875rem" }}>
									Expires
								</label>
								<p>
									{license.expiresAt
										? new Date(license.expiresAt).toLocaleDateString()
										: "Never"}
								</p>
							</div>
						</div>
					</div>
				) : (
					<p style={{ color: "#a1a1aa" }}>No active license</p>
				)}
			</section>

			{/* Subscription Info */}
			<section
				style={{
					background: "#18181b",
					borderRadius: 12,
					padding: "1.5rem",
					marginBottom: "1.5rem",
				}}
			>
				<h2 style={{ marginBottom: "1rem" }}>Subscription</h2>
				{subscription ? (
					<div style={{ display: "grid", gap: "0.75rem" }}>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "1fr 1fr",
								gap: "1rem",
							}}
						>
							<div>
								<label style={{ color: "#a1a1aa", fontSize: "0.875rem" }}>
									Plan
								</label>
								<p style={{ textTransform: "capitalize" }}>
									{subscription.planId}
								</p>
							</div>
							<div>
								<label style={{ color: "#a1a1aa", fontSize: "0.875rem" }}>
									Status
								</label>
								<p
									style={{
										color:
											subscription.status === "active" ? "#22c55e" : "#f59e0b",
									}}
								>
									{subscription.status}
								</p>
							</div>
							<div>
								<label style={{ color: "#a1a1aa", fontSize: "0.875rem" }}>
									Next Billing
								</label>
								<p>
									{new Date(subscription.currentPeriodEnd).toLocaleDateString()}
								</p>
							</div>
							<div>
								<label style={{ color: "#a1a1aa", fontSize: "0.875rem" }}>
									Auto-Renew
								</label>
								<p>
									{subscription.cancelAtPeriodEnd ? "No (canceling)" : "Yes"}
								</p>
							</div>
						</div>
						<div style={{ marginTop: "1rem" }}>
							{subscription.cancelAtPeriodEnd ? (
								<button
									onClick={handleReactivateSubscription}
									style={{
										padding: "0.75rem 1.5rem",
										background: "#22c55e",
										color: "#000",
										border: "none",
										borderRadius: 8,
										cursor: "pointer",
										fontWeight: 600,
									}}
								>
									Reactivate Subscription
								</button>
							) : (
								<button
									onClick={handleCancelSubscription}
									style={{
										padding: "0.75rem 1.5rem",
										background: "transparent",
										border: "1px solid #ef4444",
										color: "#ef4444",
										borderRadius: 8,
										cursor: "pointer",
									}}
								>
									Cancel Subscription
								</button>
							)}
						</div>
					</div>
				) : (
					<div>
						<p style={{ color: "#a1a1aa", marginBottom: "1rem" }}>
							No active subscription
						</p>
						<a
							href="/get-started"
							style={{
								display: "inline-block",
								padding: "0.75rem 1.5rem",
								background: "#22c55e",
								color: "#000",
								borderRadius: 8,
								textDecoration: "none",
								fontWeight: 600,
							}}
						>
							Get Started
						</a>
					</div>
				)}
			</section>

			{/* Danger Zone */}
			<section
				style={{
					background: "#18181b",
					borderRadius: 12,
					padding: "1.5rem",
					border: "1px solid #ef4444",
				}}
			>
				<h2 style={{ marginBottom: "1rem", color: "#ef4444" }}>Danger Zone</h2>
				<p style={{ color: "#a1a1aa", marginBottom: "1rem" }}>
					These actions are irreversible. Please be certain.
				</p>
				<button
					style={{
						padding: "0.75rem 1.5rem",
						background: "transparent",
						border: "1px solid #ef4444",
						color: "#ef4444",
						borderRadius: 8,
						cursor: "pointer",
					}}
				>
					Delete Account
				</button>
			</section>
		</div>
	);
}
