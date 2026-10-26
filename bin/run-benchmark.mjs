#!/usr/bin/env node
// run-benchmark.mjs — HyperNexus live-proof A/B benchmark (spec v1.2).
//
//   node bin/run-benchmark.mjs [runsPerTask] [topK]
//
// Arms (same tasks, same harness, same model):
//   A. Baseline   — full tool catalog exposed.
//   B. HyperNexus — progressive disclosure: a predictive router narrows the catalog
//                   to top-K relevant tools before the model sees it.
//
// Token counts use Ollama's OWN tokenizer (prompt_eval_count = input tokens for
// prompt + catalog), NOT a chars/4 approximation. Synthetic data only.

import { readFileSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs';

const RUNS = parseInt(process.argv[2] || '3', 10);
const TOPK = parseInt(process.argv[3] || '8', 10);
const MODEL = 'gemma-4-heretic';
const OLLAMA = 'http://localhost:11434/api/generate';
const CATALOG_URL = 'http://127.0.0.1:7778/api/mcp/tools';
const OUTDIR = `docs/benchmark/run-${new Date().toISOString().replace(/[:.]/g, '-')}`;

mkdirSync(OUTDIR, { recursive: true });

async function fetchCatalog() {
	const res = await fetch(CATALOG_URL);
	const d = await res.json();
	let tools = d.data?.tools || d.tools || d.data || [];
	if (!Array.isArray(tools)) tools = [];
	return tools.map(t => ({ name: t.name || t.id, description: (t.description || '').slice(0, 160) }));
}

function loadTasks() {
	return JSON.parse(readFileSync('docs/benchmark/tasks.json', 'utf8')).tasks;
}

// Transparent, reproducible predictive router: rank tools by keyword overlap with
// the task prompt (+ domain name match), expose top-K. Stated as a limitation in
// the report: this is a lexical predictor, a proxy for the kernel's predictive
// routing, not the kernel's internal model.
function routeCatalog(catalog, task, topK) {
	const words = (task.prompt + ' ' + task.domain).toLowerCase().split(/[^a-z0-9_]+/).filter(w => w.length > 3);
	const scored = catalog.map(t => {
		const hay = (t.name + ' ' + t.description).toLowerCase();
		let s = 0;
		for (const w of words) if (hay.includes(w)) s += 1;
		if (hay.includes(task.domain)) s += 2;
		return { ...t, _s: s };
	});
	scored.sort((a, b) => b._s - a._s);
	return scored.slice(0, topK).map(({ _s, ...t }) => t);
}

function catalogText(tools) {
	return tools.map(t => `- ${t.name}: ${t.description}`).join('\n');
}

async function callModel(prompt) {
	const started = Date.now();
	const res = await fetch(OLLAMA, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ model: MODEL, prompt, stream: false, options: { num_predict: 1500, temperature: 0.2 } }),
	});
	const d = await res.json();
	return {
		text: d.response || '',
		promptTokens: d.prompt_eval_count ?? null,   // real tokenizer: input tokens (prompt + catalog)
		outputTokens: d.eval_count ?? null,
		latencyMs: Date.now() - started,
		error: d.error || null,
	};
}

function extractSelected(text, catalog) {
	const names = catalog.map(t => t.name);
	const found = new Set();
	const lower = text.toLowerCase();
	for (const n of names) {
		const re = new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
		if (re.test(lower)) found.add(n);
	}
	return [...found];
}

function scoreSelection(selected, task) {
	// Multi-tool rule: mean over expected tools (1.0 expected/equivalent, 0.5 partial, 0 miss).
	const eq = task.equivalents || {}, pa = task.partials || {};
	const expected = task.expected || [];
	if (!expected.length) return { mean: 0, perTool: [] };
	const perTool = expected.map(exp => {
		const alts = eq[exp] || [];
		const partials = pa[exp] || [];
		if (selected.includes(exp) || selected.some(s => alts.includes(s))) return 1.0;
		if (selected.some(s => partials.includes(s))) return 0.5;
		return 0;
	});
	return { mean: perTool.reduce((a, b) => a + b, 0) / perTool.length, perTool };
}

async function main() {
	console.log(`benchmark: model=${MODEL} runsPerTask=${RUNS} topK=${TOPK}`);
	const catalog = await fetchCatalog();
	const tasks = loadTasks();
	console.log(`catalog: ${catalog.length} tools | tasks: ${tasks.length} | outdir: ${OUTDIR}`);
	writeFileSync(`${OUTDIR}/catalog-names.txt`, catalog.map(t => t.name).join('\n'));

	const rows = [];
	for (const task of tasks) {
		for (const arm of ['A', 'B']) {
			const tools = arm === 'A' ? catalog : routeCatalog(catalog, task, TOPK);
			const prompt =
				`You are selecting tools. Given these tools:\n${catalogText(tools)}\n\n` +
				`Task: ${task.prompt}\n\n` +
				`Reply with ONLY the tool name(s) you would call, comma-separated, nothing else.`;
			for (let run = 1; run <= RUNS; run++) {
				const r = await callModel(prompt);
				if (r.error) { console.log(`  [${task.task_id} ${arm} run${run}] ERROR: ${r.error}`); }
				const selected = extractSelected(r.text, tools);
				const sc = scoreSelection(selected, task);
				const row = {
					task_id: task.task_id, domain: task.domain, arm, run,
					model: MODEL, catalog_size: tools.length,
					tools_selected: selected, expected: task.expected,
					mean_score: sc.mean, per_tool_scores: sc.perTool,
					prompt_tokens: r.promptTokens, output_tokens: r.outputTokens,
					latency_ms: r.latencyMs, error: r.error, text: r.text.trim().slice(0, 120),
				};
				rows.push(row);
				appendFileSync(`${OUTDIR}/results-${arm}.jsonl`, JSON.stringify(row) + '\n');
				console.log(`  [${task.task_id} ${arm} run${run}] score=${sc.mean.toFixed(2)} tok=${r.promptTokens} lat=${r.latencyMs}ms sel=${selected.join('|') || '-'}`);
			}
		}
	}

	// Aggregate.
	function agg(arm) {
		const rs = rows.filter(r => r.arm === arm);
		const mean = arr => arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
		const tok = rs.map(r => r.prompt_tokens).filter(Boolean);
		const lat = rs.map(r => r.latency_ms).sort((a, b) => a - b);
		return {
			n: rs.length,
			mean_score: mean(rs.map(r => r.mean_score)),
			mean_prompt_tokens: mean(tok),
			median_latency_ms: lat[Math.floor(lat.length / 2)] || 0,
			p95_latency_ms: lat[Math.floor(lat.length * 0.95)] || 0,
			error_rate: rs.filter(r => r.error).length / (rs.length || 1),
		};
	}
	const A = agg('A'), B = agg('B');
	const tokenCut = A.mean_prompt_tokens ? (1 - B.mean_prompt_tokens / A.mean_prompt_tokens) * 100 : 0;
	const latDelta = A.median_latency_ms ? (B.median_latency_ms - A.median_latency_ms) / A.median_latency_ms * 100 : 0;

	const report = `# Live-Proof Benchmark Report (spec v1.2)

model: ${MODEL} (Ollama) | runsPerTask: ${RUNS} | tasks: ${tasks.length} | topK: ${TOPK}
Generated: ${new Date().toISOString()}
Identifier: [mimo-v2.6-pro in pi in ~/workspace/HyperNexus]

## Arms
- A (baseline): full catalog (${catalog.length} tools)
- B (HyperNexus): progressive disclosure + predictive routing (top-${TOPK})

## Aggregate
| metric | Arm A | Arm B | delta |
|---|---|---|---|
| tool/context tokens (mean, real tokenizer) | ${A.mean_prompt_tokens.toFixed(0)} | ${B.mean_prompt_tokens.toFixed(0)} | **-${tokenCut.toFixed(1)}%** |
| selection score (mean, 1.0/0.5/0) | ${A.mean_score.toFixed(3)} | ${B.mean_score.toFixed(3)} | ${(B.mean_score - A.mean_score).toFixed(3)} |
| latency median (ms) | ${A.median_latency_ms} | ${B.median_latency_ms} | ${latDelta.toFixed(1)}% |
| latency p95 (ms) | ${A.p95_latency_ms} | ${B.p95_latency_ms} | |
| error rate | ${A.error_rate.toFixed(3)} | ${B.error_rate.toFixed(3)} | |

## Proof threshold (pre-set)
1. Token reduction: **${tokenCut > 0 ? 'PASS' : 'FAIL'}** (-${tokenCut.toFixed(1)}%)
2. Accuracy/success not worse: **${B.mean_score >= A.mean_score * 0.95 ? 'PASS' : 'FAIL'}** (B=${B.mean_score.toFixed(3)} vs A=${A.mean_score.toFixed(3)})
3. Latency within 15%: **${latDelta <= 15 ? 'PASS' : 'FAIL'}** (${latDelta.toFixed(1)}%)

**OVERALL: ${(tokenCut > 0 && B.mean_score >= A.mean_score * 0.95 && latDelta <= 15) ? 'MEETS THRESHOLD' : 'BELOW THRESHOLD'}**

## Known limitations (stated per spec §13b)
- Predictive router is a **lexical proxy** (keyword overlap), not the kernel's internal model.
- Tasks are **HyperNexus-centric** (proves HyperNexus toolset routing, not universal MCP).
- Single machine (laptop Ollama v0.40.11); results do not transfer to Hetzner without re-run.
- **This is a Pi-run artifact for Robert + Muse review — not proof on its own.**
`;
	writeFileSync(`${OUTDIR}/report.md`, report);
	writeFileSync(`${OUTDIR}/results.json`, JSON.stringify(rows, null, 2));
	console.log('\n' + report);
	console.log(`logs: ${OUTDIR}/results-A.jsonl, results-B.jsonl, report.md`);
}

main().catch(e => { console.error(e); process.exit(1); });
