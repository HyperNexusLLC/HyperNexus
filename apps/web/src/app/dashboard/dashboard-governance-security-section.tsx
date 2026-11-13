"use client";

import { useCallback, useEffect, useState } from "react";

export function DashboardGovernanceSecuritySection() {
	// --- ENTERPRISE SECURITY LOGIC ---
	const [license, setLicense] = useState<any | null>(null);
	const [auditLogs, setAuditLogs] = useState<any[]>([]);
	const [roles, setRoles] = useState<any[]>([]);
	const [commercialLoading, setCommercialLoading] = useState(false);
	const [providerUrl, setProviderUrl] = useState("");
	const [clientId, setClientId] = useState("");
	const [clientSecret, setClientSecret] = useState("");
	const [ssoSaving, setSsoSaving] = useState(false);
	const [ssoStatus, setSsoStatus] = useState<string | null>(null);
	const [editingRoles, setEditingRoles] = useState<any[]>([]);
	const [rolesSaving, setRolesSaving] = useState(false);
	const [rolesStatus, setRolesStatus] = useState<string | null>(null);

	const fetchCommercial = useCallback(async () => {
		setCommercialLoading(true);
		try {
			const [licenseRes, auditRes, rolesRes] = await Promise.all([
				fetch("/api/go/api/commercial/license").catch(() => null),
				fetch("/api/go/api/commercial/audit?limit=20").catch(() => null),
				fetch("/api/go/api/commercial/roles").catch(() => null),
			]);
			if (licenseRes?.ok) {
				const d = await licenseRes.json();
				const licData = d.data ?? d;
				setLicense(licData);
				if (licData.ssoSettings) {
					setProviderUrl(licData.ssoSettings.providerUrl || "");
					setClientId(licData.ssoSettings.clientId || "");
					setClientSecret(licData.ssoSettings.clientSecret || "");
				}
			}
			if (auditRes?.ok) {
				const d = await auditRes.json();
				setAuditLogs(d.data ?? []);
			}
			if (rolesRes?.ok) {
				const d = await rolesRes.json();
				const rList = d.data ?? [];
				setRoles(rList);
				setEditingRoles(JSON.parse(JSON.stringify(rList)));
			}
		} catch {}
		setCommercialLoading(false);
	}, []);

	const saveSSO = async () => {
		setSsoSaving(true);
		setSsoStatus(null);
		try {
			const res = await fetch("/api/go/api/commercial/sso/update", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ providerUrl, clientId, clientSecret }),
			});
			if (res.ok) {
				setSsoStatus("SSO configuration saved successfully!");
			} else {
				setSsoStatus("Failed to save SSO configuration.");
			}
		} catch (e: any) {
			setSsoStatus(`Error: ${e.message}`);
		}
		setSsoSaving(false);
	};

	const handleRoleDescChange = (index: number, val: string) => {
		const updated = [...editingRoles];
		updated[index].description = val;
		setEditingRoles(updated);
	};

	const handleRolePermsChange = (index: number, val: string) => {
		const updated = [...editingRoles];
		updated[index].permissions = val
			.split(",")
			.map((p: string) => p.trim())
			.filter(Boolean);
		setEditingRoles(updated);
	};

	const saveRoles = async () => {
		setRolesSaving(true);
		setRolesStatus(null);
		try {
			const res = await fetch("/api/go/api/commercial/roles/update", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(editingRoles),
			});
			if (res.ok) {
				setRolesStatus("RBAC roles saved successfully!");
			} else {
				setRolesStatus("Failed to save RBAC roles.");
			}
		} catch (e: any) {
			setRolesStatus(`Error: ${e.message}`);
		}
		setRolesSaving(false);
	};

	useEffect(() => {
		fetchCommercial();
	}, [fetchCommercial]);

	return (
		<>
				{/* SECTION 5: ENTERPRISE SECURITY & AUDITING */}
				<div className="space-y-4 pt-8 pb-8 border-t border-slate-800">
					<div className="flex items-center justify-between border-b border-slate-800 pb-2">
						<h2 className="text-lg font-bold text-white tracking-wide">
							Commercial Security &amp; Auditing
						</h2>
						<span className="text-[10px] text-cyan-400 font-mono uppercase border border-cyan-500/20 bg-cyan-500/5 px-2 py-0.5 rounded font-semibold">
							Governance &amp; SSO
						</span>
					</div>
					<div className="grid gap-6 md:grid-cols-2">
						{/* License Status */}
						<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<h2 className="text-base font-semibold text-white">
										License Authority Status
									</h2>
									<span
										className="text-cyan-400 cursor-help text-xs"
										title="Cryptographically verified node authority lease."
									>
										🔑
									</span>
								</div>
								<button
									onClick={fetchCommercial}
									disabled={commercialLoading}
									className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-xs transition-colors"
									title="Reload license authority cache"
								>
									🔄 Refresh
								</button>
							</div>

							{license ? (
								<div className="space-y-2 text-xs font-mono text-slate-300">
									<div className="flex items-center gap-2">
										<span
											className={
												license.valid ? "text-emerald-400" : "text-rose-400"
											}
										>
											{license.valid
												? "✅ VALID ENTERPRISE LEASE"
												: "❌ EXPIRED / INVALID LEASE"}
										</span>
									</div>
									{license.licensedTo && (
										<div>
											<span className="text-slate-500">Licensed To:</span>{" "}
											{license.licensedTo}
										</div>
									)}
									{license.tier && (
										<div>
											<span className="text-slate-500">Service Tier:</span>{" "}
											{license.tier}
										</div>
									)}
									{license.expiresAt && (
										<div>
											<span className="text-slate-500">Expiration:</span>{" "}
											{license.expiresAt}
										</div>
									)}
									{license.maxNodes && (
										<div>
											<span className="text-slate-500">Max Nodes Limit:</span>{" "}
											{license.maxNodes}
										</div>
									)}
									{license.features && license.features.length > 0 && (
										<div className="pt-1">
											<span className="text-slate-500 text-[10px] block mb-1">
												ENABLED CAPABILITIES:
											</span>
											<div className="flex flex-wrap gap-1">
												{license.features.map((f: string) => (
													<span
														key={f}
														className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-400 text-[9px]"
													>
														{f}
													</span>
												))}
											</div>
										</div>
									)}
								</div>
							) : (
								<div className="text-slate-500 text-xs italic">
									{commercialLoading
										? "Retrieving license authority leases..."
										: "No license lease validated."}
								</div>
							)}
						</div>

						{/* SSO authentication Settings */}
						<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4">
							<div className="flex items-center gap-2 border-b border-slate-850 pb-2">
								<h2 className="text-base font-semibold text-white">
									SSO Single Sign-On Identity Setup
								</h2>
								<span
									className="text-cyan-400 cursor-help text-xs"
									title="Configures OIDC/OAuth2 endpoints for upstream organization control."
								>
									🛡️
								</span>
							</div>

							<div className="space-y-3">
								<div>
									<label className="text-[10px] text-slate-500 block mb-1">
										PROVIDER METADATA DISCOVERY URL
									</label>
									<input
										value={providerUrl}
										onChange={(e) => setProviderUrl(e.target.value)}
										placeholder="e.g., https://id.nexus.auth/oauth2"
										className="w-full bg-zinc-950 border border-slate-800 rounded p-2 text-xs text-white placeholder-slate-600 focus:border-cyan-500 outline-none transition-colors"
									/>
								</div>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
									<div>
										<label className="text-[10px] text-slate-500 block mb-1">
											CLIENT APPLICATION ID
										</label>
										<input
											value={clientId}
											onChange={(e) => setClientId(e.target.value)}
											placeholder="OAuth client identifier"
											className="w-full bg-zinc-950 border border-slate-800 rounded p-2 text-xs text-white placeholder-slate-600 focus:border-cyan-500 outline-none transition-colors"
										/>
									</div>
									<div>
										<label className="text-[10px] text-slate-500 block mb-1">
											CLIENT ID SYMMETRIC SECRET
										</label>
										<input
											type="password"
											value={clientSecret}
											onChange={(e) => setClientSecret(e.target.value)}
											placeholder="••••••••••••••••"
											className="w-full bg-zinc-950 border border-slate-800 rounded p-2 text-xs text-white placeholder-slate-600 focus:border-cyan-500 outline-none transition-colors"
										/>
									</div>
								</div>
							</div>

							<div className="flex items-center justify-between pt-2">
								<span className="text-2xs text-amber-500 font-mono">
									{ssoStatus}
								</span>
								<button
									onClick={saveSSO}
									disabled={ssoSaving}
									className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold disabled:opacity-50 transition-colors"
									title="Commit OIDC configurations to core config register"
								>
									{ssoSaving ? "Saving..." : "Save SSO Details"}
								</button>
							</div>
						</div>

						{/* RBAC Configurator */}
						<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4 md:col-span-2">
							<div className="flex items-center justify-between border-b border-slate-800 pb-2">
								<div className="flex items-center gap-2">
									<h2 className="text-base font-semibold text-white">
										RBAC Role-Based Governance Matrix
									</h2>
									<span
										className="text-cyan-400 cursor-help text-xs"
										title="Explicit security policy overrides for downstream client agents."
									>
										👥
									</span>
								</div>
								<button
									onClick={saveRoles}
									disabled={rolesSaving}
									className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold transition-colors"
									title="Submit modified security matrix"
								>
									{rolesSaving ? "Saving Matrix..." : "Save Role Matrix"}
								</button>
							</div>

							{rolesStatus && (
								<div className="text-2xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded font-mono text-center">
									{rolesStatus}
								</div>
							)}

							<div className="space-y-3">
								{editingRoles.map((role, idx) => (
									<div
										key={role.name}
										className="bg-zinc-950/60 rounded p-3 border border-slate-850 space-y-2"
									>
										<div className="flex items-center justify-between text-xs font-bold text-slate-350 tracking-wider">
											<span>ROLE: {role.name?.toUpperCase()}</span>
										</div>
										<div className="grid gap-2 md:grid-cols-2">
											<div>
												<label className="text-[10px] text-slate-500 block mb-1">
													CAPABILITY OVERVIEW / PURPOSE
												</label>
												<input
													value={role.description || ""}
													onChange={(e) =>
														handleRoleDescChange(idx, e.target.value)
													}
													className="w-full bg-zinc-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-zinc-300 focus:border-cyan-500 outline-none"
												/>
											</div>
											<div>
												<label className="text-[10px] text-slate-500 block mb-1">
													ALLOWED KEYWORD ACTIONS (COMMA-SEPARATED)
												</label>
												<input
													value={role.permissions.join(", ")}
													onChange={(e) =>
														handleRolePermsChange(idx, e.target.value)
													}
													className="w-full bg-zinc-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-zinc-300 focus:border-cyan-500 outline-none font-mono"
												/>
											</div>
										</div>
									</div>
								))}
							</div>
						</div>

						{/* Audit Logs */}
						<div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4 md:col-span-2">
							<div className="flex items-center gap-2 border-b border-slate-850 pb-2">
								<h2 className="text-base font-semibold text-white">
									Cryptographic Node Security Audit Logs
								</h2>
								<span
									className="text-cyan-400 cursor-help text-xs"
									title="Immutable event sequence tracking critical actions on keys and database tables."
								>
									📄
								</span>
							</div>

							<div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
								{auditLogs.length === 0 ? (
									<div className="text-zinc-650 text-xs italic font-mono text-center py-4 bg-zinc-950/20 border border-slate-850 rounded">
										No recent audit records tracked in the kernel.
									</div>
								) : (
									auditLogs.map((log: any, i: number) => (
										<div
											key={i}
											className="text-[11px] font-mono flex items-start gap-4 py-1.5 border-b border-slate-850 last:border-0 text-slate-400"
										>
											<span className="text-slate-600 shrink-0 select-none">
												[
												{log.timestamp?.slice(11, 19) ||
													log.timestamp?.slice(0, 10) ||
													"00:00:00"}
												]
											</span>
											<span className="text-purple-400 font-semibold uppercase tracking-wider shrink-0 w-24">
												{log.action?.slice(0, 18) || "UNKNOWN"}
											</span>
											<span className="text-slate-300 break-all select-all flex-1">
												{log.detail || JSON.stringify(log)}
											</span>
										</div>
									))
								)}
							</div>
						</div>
					</div>
				</div>
		</>
	);
}
