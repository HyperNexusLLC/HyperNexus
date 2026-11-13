"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

export interface BusRegistration {
	id: string;
	harness?: string;
	thread?: string;
	transport?: string;
	ts?: number;
}

export interface BusMessage {
	msg: string;
	from: string;
	to: string;
	text: string;
	ts?: number;
}

export interface BusReply {
	out: string;
	from: string;
	to: string;
	inReplyTo?: string;
	status?: string;
	text: string;
	ts?: number;
}

export type BusActivity =
	| { kind: "message"; ts: number; label: string; detail: string }
	| { kind: "reply"; ts: number; label: string; detail: string }
	| { kind: "delivery"; ts: number; label: string; detail: string };

export interface BusSummary {
	registered: BusRegistration[];
	pending: BusMessage[];
	replies: BusReply[];
	deliveryReceipts: number;
	activity: BusActivity[];
}

function parseRecord<T>(value: unknown): T | null {
	try {
		const parsed = typeof value === "string" ? JSON.parse(value) : value;
		return parsed && typeof parsed === "object" ? (parsed as T) : null;
	} catch {
		return null;
	}
}

function timestamp(value?: number) {
	return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function summarizeBusScratchpad(
	scratchpad: Record<string, unknown>,
): BusSummary {
	const registered: BusRegistration[] = [];
	const messages: BusMessage[] = [];
	const replies: BusReply[] = [];
	const activity: BusActivity[] = [];
	let deliveryReceipts = 0;

	for (const [key, value] of Object.entries(scratchpad)) {
		if (key.startsWith("bus:reg:")) {
			const record = parseRecord<BusRegistration>(value);
			if (record?.id) registered.push(record);
		} else if (key.startsWith("bus:msg:")) {
			const record = parseRecord<BusMessage>(value);
			if (record?.msg && record.from && record.to) {
				messages.push(record);
				activity.push({
					kind: "message",
					ts: timestamp(record.ts),
					label: `${record.from} -> ${record.to}`,
					detail: record.text,
				});
			}
		} else if (key.startsWith("bus:out:")) {
			const record = parseRecord<BusReply>(value);
			if (record?.out && record.from && record.to) {
				replies.push(record);
				activity.push({
					kind: "reply",
					ts: timestamp(record.ts),
					label: `${record.from} -> ${record.to}${record.status ? ` (${record.status})` : ""}`,
					detail: record.text,
				});
			}
		} else if (key.startsWith("bus:acked:")) {
			deliveryReceipts += 1;
			const record = parseRecord<{ target?: string; chars?: number; ts?: number }>(value);
			activity.push({
				kind: "delivery",
				ts: timestamp(record?.ts),
				label: `Delivered to ${record?.target || "web thread"}`,
				detail: `${record?.chars ?? 0} characters recorded by the CDP ack guard`,
			});
		}
	}

	const repliedIds = new Set(replies.map((reply) => reply.inReplyTo).filter(Boolean));
	registered.sort((a, b) => timestamp(b.ts) - timestamp(a.ts));
	messages.sort((a, b) => timestamp(b.ts) - timestamp(a.ts));
	replies.sort((a, b) => timestamp(b.ts) - timestamp(a.ts));
	activity.sort((a, b) => b.ts - a.ts);

	return {
		registered,
		pending: messages.filter(
			(message) => message.to === "*" || !repliedIds.has(message.msg),
		),
		replies,
		deliveryReceipts,
		activity,
	};
}

type LoadState =
	| { status: "loading" }
	| { status: "error"; message: string }
	| { status: "ready"; summary: BusSummary; fetchedAt: number };

export function CrossSessionBusPanel() {
	const [state, setState] = useState<LoadState>({ status: "loading" });

	const load = useCallback(async (signal?: AbortSignal) => {
		try {
			const response = await fetch("/api/go/api/memory/scratchpad/get", {
				signal,
				headers: { accept: "application/json" },
			});
			if (!response.ok) throw new Error(`Kernel returned HTTP ${response.status}`);
			const payload = (await response.json()) as {
				scratchpad?: Record<string, unknown>;
			};
			setState({
				status: "ready",
				summary: summarizeBusScratchpad(payload.scratchpad ?? {}),
				fetchedAt: Date.now(),
			});
		} catch (error) {
			if ((error as Error).name === "AbortError") return;
			setState({
				status: "error",
				message:
					error instanceof Error ? error.message : "Kernel scratchpad unavailable",
			});
		}
	}, []);

	useEffect(() => {
		const controller = new AbortController();
		void load(controller.signal);
		const interval = window.setInterval(() => void load(), 10_000);
		return () => {
			controller.abort();
			window.clearInterval(interval);
		};
	}, [load]);

	const summary = state.status === "ready" ? state.summary : null;
	const metrics = useMemo(
		() => [
			{
				label: "Registered sessions",
				value: summary?.registered.length ?? "-",
				title: "Sessions registered with bus:reg keys in the kernel scratchpad",
			},
			{
				label: "Unanswered messages",
				value: summary?.pending.length ?? "-",
				title: "Direct messages without a bus:out reply; broadcasts remain visible by design",
			},
			{
				label: "Replies recorded",
				value: summary?.replies.length ?? "-",
				title: "Outputs written as bus:out records, threaded by inReplyTo",
			},
			{
				label: "Web deliveries",
				value: summary?.deliveryReceipts ?? "-",
				title: "CDP bridge delivery receipts recorded by the dedupe ack guard",
			},
		],
		[summary],
	);

	return (
		<section
			id="cross-session-coordination"
			className="scroll-mt-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-5"
			aria-label="Cross-session coordination"
			data-testid="cross-session-bus-panel"
		>
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h2 className="text-base font-semibold text-white" title="Live input and output exchanged by terminal and web sessions through the kernel scratchpad bus">
						Cross-Session Coordination
					</h2>
					<p className="text-xs text-slate-400 mt-1" title="Read-only view. Sending and replies happen through session-bus.mjs, supervised session controls, or the CDP bridge">
						Registered sessions, unanswered work, replies, and web-thread delivery receipts.
					</p>
				</div>
				<div className="flex gap-2">
					<button
						type="button"
						onClick={() => void load()}
						className="px-3 py-1.5 text-xs rounded border border-slate-700 text-slate-200 hover:bg-slate-800"
						title="Reload the bus registry and latest messages from the kernel"
					>
						Refresh
					</button>
					<Link
						href="/dashboard/session"
						className="px-3 py-1.5 text-xs rounded border border-slate-700 text-slate-200 hover:bg-slate-800"
						title="Open supervised kernel sessions where start, stop, and restart controls live"
					>
						Supervised sessions
					</Link>
				</div>
			</div>

			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-live="polite">
				{metrics.map((metric) => (
					<div key={metric.label} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3" title={metric.title}>
						<div className="text-[10px] uppercase tracking-wider text-slate-500">{metric.label}</div>
						<div className="text-xl font-semibold text-white mt-1">{metric.value}</div>
					</div>
				))}
			</div>

			{state.status === "loading" && (
				<p className="text-xs text-slate-400" title="The panel is reading bus:reg, bus:msg, bus:out, and bus:acked records">
					Loading cross-session bus…
				</p>
			)}
			{state.status === "error" && (
				<div className="rounded-lg border border-rose-900 bg-rose-950/30 p-3 text-xs text-rose-200" role="alert" title="The kernel scratchpad could not be reached; no bus state was invented">
					Cross-session bus unavailable: {state.message}. Check kernel health, then Refresh.
				</div>
			)}
			{state.status === "ready" && summary?.registered.length === 0 && (
				<p className="text-xs text-slate-400" title="No bus:reg records exist yet; a session appears after session-bus register succeeds">
					No sessions are registered yet. Register one with <code>session-bus register</code> to populate this panel.
				</p>
			)}

			{summary && summary.registered.length > 0 && (
				<div className="grid gap-5 lg:grid-cols-2">
					<div>
						<h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400" title="Most recently registered sessions first">
							Session registry
						</h3>
						<ul className="mt-2 space-y-2">
							{summary.registered.slice(0, 8).map((entry) => (
								<li key={entry.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3" title={`Thread ${entry.thread || entry.id}; transport ${entry.transport || "bus"}`}>
									<div className="text-sm text-slate-100">{entry.id}</div>
									<div className="text-[11px] text-slate-500">
										{entry.harness || "unknown harness"} · {entry.transport || "bus"}
									</div>
								</li>
							))}
						</ul>
					</div>
					<div>
						<h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400" title="Latest bus inputs, outputs, and delivery receipts first">
							Recent activity
						</h3>
						<ul className="mt-2 space-y-2">
							{summary.activity.slice(0, 8).map((entry, index) => (
								<li key={`${entry.kind}-${entry.ts}-${index}`} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3" title={`${entry.kind} recorded on the cross-session bus`}>
									<div className="text-[11px] font-medium text-slate-300">{entry.label}</div>
									<div className="text-xs text-slate-500 break-words">{entry.detail}</div>
								</li>
							))}
						</ul>
					</div>
				</div>
			)}
		</section>
	);
}

