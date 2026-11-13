import { describe, expect, it } from "vitest";

import { summarizeBusScratchpad } from "./cross-session-bus-panel";

describe("summarizeBusScratchpad", () => {
	it("groups registrations, unanswered messages, replies, and delivery receipts", () => {
		const summary = summarizeBusScratchpad({
			"bus:reg:leader": JSON.stringify({
				id: "leader",
				harness: "muse",
				thread: "main",
				transport: "bus",
				ts: 100,
			}),
			"bus:reg:worker": JSON.stringify({
				id: "worker",
				harness: "codex",
				thread: "lane",
				transport: "scratch",
				ts: 200,
			}),
			"bus:msg:bm-1": JSON.stringify({
				msg: "bm-1",
				from: "leader",
				to: "worker",
				text: "Run the audit",
				ts: 300,
			}),
			"bus:msg:bm-2": JSON.stringify({
				msg: "bm-2",
				from: "leader",
				to: "*",
				text: "Status please",
				ts: 400,
			}),
			"bus:out:bo-1": JSON.stringify({
				out: "bo-1",
				from: "worker",
				to: "leader",
				inReplyTo: "bm-1",
				status: "DONE",
				text: "Audit complete",
				ts: 500,
			}),
			"bus:acked:abc": JSON.stringify({ target: "muse", chars: 42, ts: 600 }),
			"goal": "not bus data",
		});

		expect(summary.registered.map((entry) => entry.id)).toEqual(["worker", "leader"]);
		expect(summary.pending.map((entry) => entry.msg)).toEqual(["bm-2"]);
		expect(summary.replies).toHaveLength(1);
		expect(summary.deliveryReceipts).toBe(1);
		expect(summary.activity.map((entry) => entry.kind)).toEqual([
			"delivery",
			"reply",
			"message",
			"message",
		]);
	});

	it("ignores malformed and unrelated scratchpad values", () => {
		const summary = summarizeBusScratchpad({
			"bus:msg:broken": "{not-json",
			"bus:reg:missing-id": JSON.stringify({ harness: "unknown" }),
			persona: "operator",
		});

		expect(summary.registered).toEqual([]);
		expect(summary.pending).toEqual([]);
		expect(summary.replies).toEqual([]);
		expect(summary.deliveryReceipts).toBe(0);
	});
});
