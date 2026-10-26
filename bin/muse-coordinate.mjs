#!/usr/bin/env node
// muse-coordinate.mjs — resident Muse (Bobbi) coordinator.
//
// An autonomous agent-to-agent coordination loop: it talks to Muse via CDP,
// generates its side of the conversation with a LOCAL LLM (gemma-4-e4b in LM
// Studio), and keeps going until BOTH sides signal the direction is settled
// (or a bounded max-iteration count is reached). Everything is logged.
//
//   Usage: node bin/muse-coordinate.mjs [goal] [maxIters]
//
// Identifies to Muse as a HyperNexus pi session (agent-to-agent, not a human).

import { execFileSync } from 'node:child_process';
import { appendFileSync, writeFileSync } from 'node:fs';

const LOG = new URL('./_muse-coord.log', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const LM_URL = process.env.LLM_URL || 'http://localhost:11434/v1/chat/completions'; // Ollama (OpenAI-compatible)
const MODEL = process.env.LLM_MODEL || 'gemma-4-heretic'; // gemma-4-E2B-it-ultra-uncensored-heretic

const GOAL = process.argv[2] ||
	'Agree with Muse (Bobbi) on the HyperNexus outreach pivot: use the finalized pricing ' +
	'($1.99/14-day trial -> $5/seat/mo subscription -> $200 one-time founding fee per team), ' +
	'NOT the retired $750 pilot. Confirm the remaining 8 Tier A forms use these terms, and ' +
	'agree the order is proof + billing first, then sell.';
const MAX_ITERS = parseInt(process.argv[3] || '6', 10);

const SYSTEM =
	'You are a HyperNexus pi session running MiMo 2.6 Pro, coordinating agent-to-agent with ' +
	'Muse (Bobbi), another AI that advises Robert (the human principal) on HyperNexus go-to-market. ' +
	'You are NOT a human and must not pretend to be. Your job is to reach agreement on the ' +
	'direction, not to commit the business (only Robert can do that). Be concise (<= 120 words), ' +
	'strategic, concrete, and push back when something is wrong. When you and Muse are aligned and ' +
	'nothing material is open, end your message with the token [ALIGNED].';

function log(line) {
	const ts = new Date().toISOString();
	appendFileSync(LOG, `[${ts}] ${line}\n`);
}

async function callGemma(messages) {
	const body = {
		model: MODEL,
		messages,
		temperature: 0.4,
		max_tokens: 1200, // gemma-4 is a thinking model: needs headroom or content comes back empty
	};
	const res = await fetch(LM_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
	if (!res.ok) throw new Error(`gemma HTTP ${res.status}`);
	const data = await res.json();
	return (data.choices?.[0]?.message?.content || '').trim();
}

function sendToMuse(msg) {
	try {
		execFileSync('node', ['bin/cdp-send.mjs', msg], { stdio: 'ignore', timeout: 30000 });
		log(`SENT: ${msg.slice(0, 200)}`);
	} catch (e) {
		log(`SEND ERROR: ${e.message}`);
	}
}

function readMuseReply() {
	// Reuse the working bin/cdp.mjs tool (which resolves playwright + connects over CDP)
	// instead of an inline node -e script (which can't resolve playwright from [eval]).
	try {
		const out = execFileSync('node', ['bin/cdp.mjs', 'muse.ai', 'document.body.innerText'], {
			encoding: 'utf8', timeout: 30000,
		});
		const raw = out.trim();
		try { return JSON.parse(raw); } catch { return raw; }
	} catch (e) {
		log(`READ ERROR: ${e.message}`);
		return '';
	}
}

// Extract Muse's latest reply. The muse.ai DOM marks the assistant's turns with
// "Assistant message:", so grab the last one (that is Bobbi's newest reply).
function extractMuseSegment(body, ourLastMsg) {
	if (!body) return '';
	const marker = 'Assistant message:';
	const idx = body.lastIndexOf(marker);
	if (idx >= 0) {
		let seg = body.slice(idx + marker.length).trim();
		// Cut anything after our own re-rendered prompt if it appears.
		const us = (ourLastMsg || '').slice(0, 30);
		if (us) {
			const usIdx = seg.indexOf(us);
			if (usIdx > 0) seg = seg.slice(0, usIdx).trim();
		}
		return seg;
	}
	// Fallback: text strictly after our last sent message.
	const tail = (ourLastMsg || '').slice(-40);
	if (tail) {
		const t = body.lastIndexOf(tail);
		if (t >= 0) return body.slice(t + tail.length).trim();
	}
	return body.slice(Math.max(0, body.length - 1200)).trim();
}

function notSettled(text) {
	const t = (text || '').toLowerCase();
	return /(not settled|still not|outstanding|doesn'?t address|does not address|not aligned|blocked|until robert|needs? (robert|your) (to )?(specify|confirm|clarify)|open question|unresolved|cannot (agree|confirm))/.test(t);
}

function saysAligned(text) {
	if (notSettled(text)) return false; // any open item overrides an 'aligned' token
	const t = (text || '').toLowerCase();
	return /\[aligned\]/.test(t) ||
		/\b(i'?m|i am|we'?re|we are|this is)\s+(now\s+)?(fully\s+)?aligned\b/.test(t) ||
		/\bwe (have )?(a )?(deal|consensus|agreement)\b/.test(t);
}

async function main() {
	log(`=== coordinator start | goal=${GOAL.slice(0, 80)}... | maxIters=${MAX_ITERS} ===`);
	console.log(`[coordinator] starting; model=${MODEL}; maxIters=${MAX_ITERS}`);

	const history = [{ role: 'system', content: SYSTEM }];
	let lastOurMsg = '';

	// Opening message: state the goal + identify as an agent.
	const opener =
		`[HyperNexus pi session · MiMo 2.6 Pro — AI agent, not a human] Bobbi, coordinating ` +
		`agent-to-agent on the outreach pivot. Goal: ${GOAL} Let's settle the direction. ` +
		`What's your read? End with [ALIGNED] when we're settled.`;
	sendToMuse(opener);
	history.push({ role: 'assistant', content: opener });
	lastOurMsg = opener;

	for (let i = 1; i <= MAX_ITERS; i++) {
		log(`--- iteration ${i} ---`);
		await new Promise(r => setTimeout(r, 60000)); // give Muse time to reply

		const body = readMuseReply();
		const museMsg = extractMuseSegment(body, lastOurMsg);
		log(`MUSE: ${museMsg.slice(0, 400)}`);
		console.log(`\n[Muse] ${museMsg.slice(0, 300)}`);

		if (!museMsg) { log('no Muse reply yet; waiting another round'); continue; }

		history.push({ role: 'user', content: `Muse (Bobbi) replied:\n${museMsg}` });

		// Ask the model to judge + reply. Retry once if the thinking model returns empty.
		let judge = await callGemma([
			...history,
			{ role: 'user', content: 'Based on the conversation so far, are BOTH sides aligned with nothing material open? Answer ONLY "SATISFIED" or "CONTINUE", then on a new line give your next message to Muse (<=120 words). End that message with [ALIGNED] only if satisfied.' },
		]);
		if (!judge) judge = await callGemma(history); // fallback: plain reply

		const satisfied = /^\s*SATISFIED/i.test(judge) && saysAligned(museMsg) && saysAligned(reply) && !notSettled(museMsg + ' ' + reply);
		const reply = judge.split('\n').slice(1).join('\n').trim() || judge.trim();

		if (reply) {
			sendToMuse(reply);
			history.push({ role: 'assistant', content: reply });
			lastOurMsg = reply;
		} else {
			log('gemma returned empty; skipping send');
		}

		if (satisfied || saysAligned(museMsg + ' ' + reply)) {
			log(`=== BOTH SIDES SATISFIED at iteration ${i} ===`);
			console.log(`\n✅ Both sides satisfied at iteration ${i}.`);
			writeFileSync(LOG.replace(/\.log$/, '.result.txt'), `SATISFIED at iteration ${i}\n\nMuse:\n${museMsg}\n\nUs:\n${reply}\n`);
			return;
		}
	}

	log(`=== max iterations (${MAX_ITERS}) reached; direction not fully settled ===`);
	console.log(`\n⚠️  Reached max iterations (${MAX_ITERS}) without full consensus.`);
}

main().catch(e => { log(`FATAL: ${e.stack || e.message}`); console.error(e); process.exit(1); });
