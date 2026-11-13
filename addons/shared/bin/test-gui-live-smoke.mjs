#!/usr/bin/env node
// HyperNexus GUI live smoke (kernel path): for every GUI addon with a
// connection.json, verify its pinned model answers on BOTH /v1/chat/completions
// and /v1/responses through the kernel proxy, with the parity tool
// code_interpreter attached (minimal description; shell-named tools would trip
// Meta attestation 403). This proves the wiring each GUI will use; launching
// each GUI app itself is out of scope and still unverified per-harness.
// Run: node addons/shared/bin/test-gui-live-smoke.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ADDONS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const TOKEN = "HN_GUI_SMOKE_7Q2X";
const TIMEOUT_MS = 90_000;

async function post(url, body) {
	const ctrl = new AbortController();
	const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
	try {
		const res = await fetch(url, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(body),
			signal: ctrl.signal,
		});
		return { status: res.status, json: await res.json().catch(() => null) };
	} finally {
		clearTimeout(timer);
	}
}

const guis = fs.readdirSync(ADDONS).filter((d) => fs.existsSync(path.join(ADDONS, d, "connection.json"))).sort();
let passed = 0;
let failed = 0;
for (const gui of guis) {
	const cfg = JSON.parse(fs.readFileSync(path.join(ADDONS, gui, "connection.json"), "utf8"));
	const base = String(cfg.baseUrl || "http://127.0.0.1:7778/v1").replace(/\/$/, "");
	const model = cfg.model;
	for (const wire of ["chat", "responses"]) {
		try {
			let out = "";
			if (wire === "chat") {
				const r = await post(`${base}/chat/completions`, {
					model,
					messages: [{ role: "user", content: `Reply with exactly ${TOKEN} and nothing else.` }],
					max_tokens: 32,
				});
				if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
				out = r.json?.choices?.[0]?.message?.content ?? "";
			} else {
				const r = await post(`${base}/responses`, {
					model,
					input: `Reply with exactly ${TOKEN} and nothing else. Do not call any tool.`,
					tools: [{ type: "function", name: "code_interpreter", description: "run code", parameters: { type: "object", properties: { code: { type: "string" } } } }],
				});
				if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
				out = r.json?.output_text ?? r.json?.output?.flatMap((o) => o.content ?? []).map((c) => c.text ?? "").join("") ?? "";
			}
			if (!String(out).includes(TOKEN)) throw new Error(`token missing in: ${String(out).slice(0, 80)}`);
			passed += 1;
			process.stdout.write(`PASS ${gui} ${wire} ${model}\n`);
		} catch (err) {
			failed += 1;
			process.stdout.write(`FAIL ${gui} ${wire} ${model}: ${err.message}\n`);
		}
	}
}
process.stdout.write(`\n${passed} passed, ${failed} failed (${guis.length} GUIs x chat+responses, kernel path)\n`);
process.exit(failed ? 1 : 0);
