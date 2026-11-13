import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
	resolveGoApiBase,
	resolveUpstreamBases,
} from "../../../../lib/trpc-upstream";
import { clearCache } from "../cache";
import { GET, POST } from "./route";

describe("resolveUpstreamBases & resolveGoApiBase", () => {
	const originalHnUpstream = process.env.HYPERNEXUS_TRPC_UPSTREAM;
	const originalTnUpstream = process.env.TORMENTNEXUS_TRPC_UPSTREAM;
	const originalHnGoBase = process.env.HYPERNEXUS_GO_API_BASE;
	const originalTnGoBase = process.env.TORMENTNEXUS_GO_API_BASE;

	afterEach(() => {
		if (originalHnUpstream === undefined) {
			delete process.env.HYPERNEXUS_TRPC_UPSTREAM;
		} else {
			process.env.HYPERNEXUS_TRPC_UPSTREAM = originalHnUpstream;
		}

		if (originalTnUpstream === undefined) {
			delete process.env.TORMENTNEXUS_TRPC_UPSTREAM;
		} else {
			process.env.TORMENTNEXUS_TRPC_UPSTREAM = originalTnUpstream;
		}

		if (originalHnGoBase === undefined) {
			delete process.env.HYPERNEXUS_GO_API_BASE;
		} else {
			process.env.HYPERNEXUS_GO_API_BASE = originalHnGoBase;
		}

		if (originalTnGoBase === undefined) {
			delete process.env.TORMENTNEXUS_GO_API_BASE;
		} else {
			process.env.TORMENTNEXUS_GO_API_BASE = originalTnGoBase;
		}
	});

	it("prioritizes the Go-native kernel (:7778) before legacy TS fallbacks", () => {
		delete process.env.HYPERNEXUS_TRPC_UPSTREAM;
		delete process.env.TORMENTNEXUS_TRPC_UPSTREAM;

		expect(resolveUpstreamBases()).toEqual([
			"http://127.0.0.1:7778/trpc",
			"http://127.0.0.1:3100/trpc",
			"http://127.0.0.1:4000/trpc",
			"http://127.0.0.1:3001/trpc",
		]);
	});

	it("prepends configured upstream while normalizing trailing slashes and deduplicating", () => {
		delete process.env.HYPERNEXUS_TRPC_UPSTREAM;
		process.env.TORMENTNEXUS_TRPC_UPSTREAM = "http://127.0.0.1:4000/trpc/";

		expect(resolveUpstreamBases()).toEqual([
			"http://127.0.0.1:4000/trpc",
			"http://127.0.0.1:7778/trpc",
			"http://127.0.0.1:3100/trpc",
			"http://127.0.0.1:3001/trpc",
		]);
	});

	it("prefers HYPERNEXUS_TRPC_UPSTREAM and HYPERNEXUS_GO_API_BASE over legacy aliases", () => {
		process.env.HYPERNEXUS_TRPC_UPSTREAM = "http://127.0.0.1:17778/trpc/";
		process.env.TORMENTNEXUS_TRPC_UPSTREAM = "http://127.0.0.1:3100/trpc";
		process.env.HYPERNEXUS_GO_API_BASE = "http://127.0.0.1:17778/";
		process.env.TORMENTNEXUS_GO_API_BASE = "http://127.0.0.1:9999";

		expect(resolveUpstreamBases()[0]).toBe("http://127.0.0.1:17778/trpc");
		expect(resolveGoApiBase()).toBe("http://127.0.0.1:17778");
	});
});

describe("Go-native tRPC route proxy & fast-path bridge", () => {
	const originalFetch = global.fetch;
	const originalHnUpstream = process.env.HYPERNEXUS_TRPC_UPSTREAM;
	const originalTnUpstream = process.env.TORMENTNEXUS_TRPC_UPSTREAM;
	const originalHnGoBase = process.env.HYPERNEXUS_GO_API_BASE;
	const originalTnGoBase = process.env.TORMENTNEXUS_GO_API_BASE;

	beforeEach(() => {
		clearCache();
		delete process.env.HYPERNEXUS_TRPC_UPSTREAM;
		delete process.env.TORMENTNEXUS_TRPC_UPSTREAM;
		delete process.env.HYPERNEXUS_GO_API_BASE;
		delete process.env.TORMENTNEXUS_GO_API_BASE;
	});

	afterEach(() => {
		global.fetch = originalFetch;
		clearCache();

		if (originalHnUpstream === undefined) {
			delete process.env.HYPERNEXUS_TRPC_UPSTREAM;
		} else {
			process.env.HYPERNEXUS_TRPC_UPSTREAM = originalHnUpstream;
		}
		if (originalTnUpstream === undefined) {
			delete process.env.TORMENTNEXUS_TRPC_UPSTREAM;
		} else {
			process.env.TORMENTNEXUS_TRPC_UPSTREAM = originalTnUpstream;
		}
		if (originalHnGoBase === undefined) {
			delete process.env.HYPERNEXUS_GO_API_BASE;
		} else {
			process.env.HYPERNEXUS_GO_API_BASE = originalHnGoBase;
		}
		if (originalTnGoBase === undefined) {
			delete process.env.TORMENTNEXUS_GO_API_BASE;
		} else {
			process.env.TORMENTNEXUS_GO_API_BASE = originalTnGoBase;
		}
	});

	it("serves single Go-native fast-path procedures directly from the Go REST API", async () => {
		process.env.HYPERNEXUS_GO_API_BASE = "http://127.0.0.1:7778";
		global.fetch = vi.fn(async (input) => {
			const url = String(input);
			if (url === "http://127.0.0.1:7778/api/mcp/status") {
				return new Response(
					JSON.stringify({
						data: {
							initialized: true,
							serverCount: 64,
							toolCount: 412,
							connectedCount: 18,
						},
					}),
					{ status: 200, headers: { "content-type": "application/json" } },
				);
			}
			throw new Error(`Unexpected fetch: ${url}`);
		}) as typeof fetch;

		const response = await GET(
			new Request("http://localhost:7779/api/trpc/mcp.getStatus?batch=1"),
		);
		const payload = await response.json();

		expect(response.status).toBe(200);
		expect(payload).toEqual([
			{
				result: {
					data: {
						initialized: true,
						serverCount: 64,
						toolCount: 412,
						connectedCount: 18,
					},
				},
			},
		]);
		expect(global.fetch).toHaveBeenCalledTimes(1);
	});

	it("serves batched Go-native procedures in order and normalizes query parameters", async () => {
		process.env.HYPERNEXUS_GO_API_BASE = "http://127.0.0.1:7778";
		global.fetch = vi.fn(async (input) => {
			const url = String(input);
			if (url === "http://127.0.0.1:7778/api/mcp/servers") {
				return new Response(
					JSON.stringify([{ name: "hypernexus", status: "connected", toolCount: 28 }]),
					{ status: 200, headers: { "content-type": "application/json" } },
				);
			}
			if (url === "http://127.0.0.1:7778/api/billing/cost-history?days=90") {
				return new Response(
					JSON.stringify({ data: [{ date: "2026-11-12", costUsd: 1.25 }] }),
					{ status: 200, headers: { "content-type": "application/json" } },
				);
			}
			throw new Error(`Unexpected fetch: ${url}`);
		}) as typeof fetch;

		const batchInput = encodeURIComponent(
			JSON.stringify({ 0: {}, 1: { days: 365 } }),
		);
		const response = await GET(
			new Request(
				`http://localhost:7779/api/trpc/mcp.listServers,billing.getCostHistory?batch=1&input=${batchInput}`,
			),
		);
		const payload = await response.json();

		expect(response.status).toBe(200);
		expect(payload).toHaveLength(2);
		expect(payload[0]?.result?.data).toEqual([
			{ name: "hypernexus", status: "connected", toolCount: 28 },
		]);
		expect(payload[1]?.result?.data).toEqual([
			{ date: "2026-11-12", costUsd: 1.25 },
		]);
	});

	it("dispatches Go-native mutation procedures with POST JSON body", async () => {
		process.env.HYPERNEXUS_GO_API_BASE = "http://127.0.0.1:7778";
		global.fetch = vi.fn(async (input, init) => {
			expect(String(input)).toBe(
				"http://127.0.0.1:7778/api/config/corporate-settings/set",
			);
			expect(init?.method).toBe("POST");
			expect(JSON.parse(String(init?.body))).toEqual({
				enforceSso: true,
				seatCap: 25,
			});
			return new Response(JSON.stringify({ ok: true, seatCap: 25 }), {
				status: 200,
				headers: { "content-type": "application/json" },
			});
		}) as typeof fetch;

		const response = await POST(
			new Request(
				"http://localhost:7779/api/trpc/billing.setCorporateSettings?batch=1",
				{
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ 0: { enforceSso: true, seatCap: 25 } }),
				},
			),
		);
		const payload = await response.json();

		expect(response.status).toBe(200);
		expect(payload).toEqual([{ result: { data: { ok: true, seatCap: 25 } } }]);
	});

	it("proxies non-native procedures upstream and caches cacheable GET responses", async () => {
		process.env.TORMENTNEXUS_TRPC_UPSTREAM = "http://127.0.0.1:7778/trpc";
		const workingSetPayload = [
			{
				result: {
					data: {
						tools: ["search_memory", "add_memory"],
						limits: { maxLoadedTools: 24, maxHydratedSchemas: 8 },
					},
				},
			},
		];

		global.fetch = vi.fn(async (input) => {
			expect(String(input)).toBe(
				"http://127.0.0.1:7778/trpc/mcp.getWorkingSet?batch=1&input=%7B%7D",
			);
			return new Response(JSON.stringify(workingSetPayload), {
				status: 200,
				headers: { "content-type": "application/json" },
			});
		}) as typeof fetch;

		const url =
			"http://localhost:7779/api/trpc/mcp.getWorkingSet?batch=1&input=%7B%7D";
		const first = await GET(new Request(url));
		const second = await GET(new Request(url));

		expect(first.status).toBe(200);
		expect(await first.json()).toEqual(workingSetPayload);
		expect(second.status).toBe(200);
		expect(await second.json()).toEqual(workingSetPayload);
		// Second GET is served from short-TTL in-memory cache without re-hitting upstream
		expect(global.fetch).toHaveBeenCalledTimes(1);
	});

	it("proxies POST payloads cleanly to configured tRPC upstream", async () => {
		process.env.TORMENTNEXUS_TRPC_UPSTREAM = "http://127.0.0.1:3100/trpc";
		const upstreamResponse = [
			{ result: { data: { imported: 1, errors: [] } } },
		];
		const requestBody = JSON.stringify({
			0: {
				json: [
					{
						name: "test_stdio_import",
						type: "STDIO",
						command: "npx",
						args: ["-y", "@modelcontextprotocol/server-memory"],
					},
				],
			},
		});

		global.fetch = vi.fn(async (input, init) => {
			expect(String(input)).toBe(
				"http://127.0.0.1:3100/trpc/mcpServers.bulkImport?batch=1",
			);
			expect(init?.method).toBe("POST");
			expect(init?.body).toBe(requestBody);
			return new Response(JSON.stringify(upstreamResponse), {
				status: 200,
				headers: { "content-type": "application/json" },
			});
		}) as typeof fetch;

		const response = await POST(
			new Request(
				"http://localhost:7779/api/trpc/mcpServers.bulkImport?batch=1",
				{
					method: "POST",
					headers: { "content-type": "application/json" },
					body: requestBody,
				},
			),
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual(upstreamResponse);
		expect(global.fetch).toHaveBeenCalledTimes(1);
	});

	it("returns honest 502 TRPC_UPSTREAM_UNAVAILABLE when upstream and Go kernel refuse connection", async () => {
		process.env.HYPERNEXUS_TRPC_UPSTREAM = "http://127.0.0.1:59999/trpc";
		process.env.HYPERNEXUS_GO_API_BASE = "http://127.0.0.1:59999";
		global.fetch = vi.fn(async () => {
			throw new Error("connect ECONNREFUSED 127.0.0.1:59999");
		}) as typeof fetch;

		const response = await POST(
			new Request("http://localhost:7779/api/trpc/mcp.listTools?batch=1", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ 0: { json: null } }),
			}),
		);
		const payload = await response.json();

		expect(response.status).toBe(502);
		expect(payload).toEqual({
			error: "TRPC_UPSTREAM_UNAVAILABLE",
			message: "connect ECONNREFUSED 127.0.0.1:59999",
			upstream: "http://127.0.0.1:59999/trpc/mcp.listTools?batch=1",
		});
	});

	it("returns honest 504 TRPC_UPSTREAM_TIMEOUT when upstream aborts on timeout", async () => {
		process.env.HYPERNEXUS_TRPC_UPSTREAM = "http://127.0.0.1:59999/trpc";
		global.fetch = vi.fn(async () => {
			const abortError = new Error("The operation was aborted.");
			abortError.name = "AbortError";
			throw abortError;
		}) as typeof fetch;

		const response = await GET(
			new Request("http://localhost:7779/api/trpc/custom.slowQuery?batch=1"),
		);
		const payload = await response.json();

		expect(response.status).toBe(504);
		expect(payload).toEqual({
			error: "TRPC_UPSTREAM_TIMEOUT",
			message: "The TN Kernel upstream timed out.",
			upstream: "http://127.0.0.1:59999/trpc/custom.slowQuery?batch=1",
		});
	});
});
