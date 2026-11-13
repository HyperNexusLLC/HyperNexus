#!/usr/bin/env node
/**
 * cdp-bridge.mjs -- drive web session threads (muse.ai, Gemini, ChatGPT) via Edge CDP.
 * ====================================================================================
 * The output/input driver for sessions that live in the browser and cannot
 * poll the kernel session bus. Generalizes bin/cdp-send.mjs + bin/cdp.mjs.
 *
 *   node cdp-bridge.mjs tabs
 *   node cdp-bridge.mjs send --target muse|gemini|chatgpt --file <path>
 *   node cdp-bridge.mjs send --target muse|gemini|chatgpt --text "..."
 *   node cdp-bridge.mjs read --target muse|gemini|chatgpt [--chars 2000]
 *
 * INPUT:  muse    = textarea value-setter + Enter key events (synchronous
 *                   evaluate; background tabs throttle timers).
 *         gemini  = focus the Quill editor, execCommand insertText, then click Send.
 *         chatgpt = focus ProseMirror #prompt-textarea (or fallback textarea),
 *                   insertText/input event, then click [data-testid="send-button"].
 * OUTPUT: synchronous Runtime.evaluate of document.body.innerText tail.
 *         awaitPromise is never used (it hangs while a reply generates).
 *
 * Env: CDP_URL (default http://127.0.0.1:9222). Node stdlib only.
 * Prints JSON/text to stdout; errors to stderr with exit 1.
 */
import { execSync } from "child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const CDP = (process.env.CDP_URL || "http://127.0.0.1:9222").replace(/\/$/, "");
function fail(msg) { process.stderr.write(`[cdp-bridge] FAIL: ${msg}\n`); process.exit(1); }
function opt(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : null;
}
function listTabs() {
  try {
    return JSON.parse(execSync(`curl.exe -s -m 10 ${CDP}/json`).toString());
  } catch (e) { fail("CDP tab list failed (is msedge --remote-debugging-port=9222 running?): " + e.message); }
}
const VALID_TARGETS = new Set(["muse", "gemini", "chatgpt"]);
function findTab(target) {
  const tabs = listTabs().filter((t) => t.type === "page");
  const tab = target === "muse"
    ? tabs.find((t) => t.url.includes("muse.ai"))
    : target === "gemini"
      ? tabs.find((t) => t.url.includes("gemini.google.com"))
      : tabs.find((t) => t.url.includes("chatgpt.com") || t.url.includes("chat.openai.com"));
  if (!tab) fail(`no ${target} tab open in Edge (CDP ${CDP})`);
  return tab;
}
function evaluate(tab, expression) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    const timer = setTimeout(() => { try { ws.close(); } catch {} reject(new Error("CDP evaluate timeout")); }, 45000);
    ws.onopen = () => ws.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { expression, returnByValue: true } }));
    ws.onmessage = (ev) => {
      const d = JSON.parse(ev.data);
      if (d.id !== 1) return;
      clearTimeout(timer);
      const ex = d.result?.exceptionDetails;
      try { ws.close(); } catch {}
      if (ex) reject(new Error(ex.exception?.description || ex.text || "evaluate failed"));
      else resolve(d.result?.result?.value);
    };
    ws.onerror = () => { clearTimeout(timer); reject(new Error("CDP websocket error")); };
  });
}
const sleep = (ms) => new Promise((s) => setTimeout(s, ms));

// Dedupe/idempotency guard (leader priority): a message body is delivered
// at most once per target. Before sending, check the kernel scratchpad for
// bus:acked:<sha256-12>; after a confirmed send, record it. Best-effort:
// if the kernel is unreachable the send proceeds and says so.
const KERNEL = (process.env.HYPERNEXUS_URL || "http://127.0.0.1:7778").replace(/\/$/, "");
const ackKeyOf = (target, text) => "bus:acked:" + createHash("sha256").update(target + "\n" + text).digest("hex").slice(0, 12);
async function ackGuard(target, text) {
  const key = ackKeyOf(target, text);
  try {
    const r = await fetch(KERNEL + "/api/memory/scratchpad/get");
    if (r.status === 200) {
      const map = (await r.json())?.scratchpad || {};
      if (map[key]) return { blocked: true, key };
    }
  } catch { /* kernel down: proceed unguarded */ }
  return { blocked: false, key };
}
async function ackRecord(key, target, chars) {
  try {
    await fetch(KERNEL + "/api/memory/scratchpad/set", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value: JSON.stringify({ target, chars, ts: Date.now() }) }),
    });
  } catch { /* best-effort */ }
}

async function cmdTabs() {
  const tabs = listTabs().filter((t) => t.type === "page")
    .map((t) => ({ title: t.title, url: t.url }));
  process.stdout.write(JSON.stringify({ ok: true, tabs }, null, 2) + "\n");
}
async function cmdSend() {
  const target = opt("--target");
  if (!VALID_TARGETS.has(target)) fail("send needs --target muse|gemini|chatgpt");
  const file = opt("--file");
  const text = file ? readFileSync(file, "utf8").trim() : opt("--text");
  if (!text) fail("send needs --file <path> or --text \"...\"");
  const guard = await ackGuard(target, text);
  if (guard.blocked && !process.argv.includes("--force")) {
    fail(`already delivered to ${target} (${guard.key}); not re-sending. Use --force to override.`);
  }
  const tab = findTab(target);
  if (target === "muse") {
    const js = `
(() => {
  const ta = document.querySelector('textarea');
  if (!ta) return 'NO_TEXTAREA';
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  setter.call(ta, ${JSON.stringify(text)});
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  for (const type of ['keydown', 'keypress', 'keyup']) {
    ta.dispatchEvent(new KeyboardEvent(type, { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
  }
  return 'SUBMITTED';
})()`;
    const r = await evaluate(tab, js);
    if (r !== "SUBMITTED") fail("muse send failed: " + r);
  } else if (target === "gemini") {
    const insertJs = `
(() => {
  const ed = document.querySelector('div.ql-editor[contenteditable="true"]') || document.querySelector('div.ql-editor');
  if (!ed) return 'NO_EDITOR';
  ed.focus();
  const ok = document.execCommand('insertText', false, ${JSON.stringify(text)});
  return JSON.stringify({ insertOk: ok, len: ed.innerText.length });
})()`;
    const ins = JSON.parse(await evaluate(tab, insertJs));
    if (!ins.insertOk && ins.len === 0) fail("gemini insert failed: " + JSON.stringify(ins));
    await sleep(1200);
    const clickJs = `
(() => {
  const btns = [...document.querySelectorAll('button')];
  const send = btns.find(b => /send message/i.test(b.getAttribute('aria-label') || ''))
    || btns.find(b => /send/i.test(b.getAttribute('aria-label') || '') && !b.disabled);
  if (!send) return 'NO_SEND_BTN';
  if (send.disabled) return 'SEND_DISABLED';
  send.click();
  return 'CLICKED';
})()`;
    const r = await evaluate(tab, clickJs);
    if (r !== "CLICKED") fail("gemini send failed: " + r);
  } else {
    // ChatGPT (ProseMirror contenteditable #prompt-textarea or fallback textarea)
    const insertJs = `
(() => {
  const pm = document.querySelector('#prompt-textarea[contenteditable="true"]')
    || document.querySelector('div.ProseMirror[contenteditable="true"]');
  if (pm) {
    pm.focus();
    const ok = document.execCommand('insertText', false, ${JSON.stringify(text)});
    if (!ok || pm.innerText.trim().length === 0) {
      pm.textContent = ${JSON.stringify(text)};
      pm.dispatchEvent(new InputEvent('input', { bubbles: true, data: ${JSON.stringify(text)} }));
    }
    return JSON.stringify({ mode: 'prosemirror', len: pm.innerText.length });
  }
  const ta = document.querySelector('textarea#prompt-textarea') || document.querySelector('textarea');
  if (!ta) return JSON.stringify({ error: 'NO_CHATGPT_EDITOR' });
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  setter.call(ta, ${JSON.stringify(text)});
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  return JSON.stringify({ mode: 'textarea', len: ta.value.length });
})()`;
    const ins = JSON.parse(await evaluate(tab, insertJs));
    if (ins.error || !ins.len) fail("chatgpt insert failed: " + JSON.stringify(ins));
    await sleep(900);
    const clickJs = `
(() => {
  const send = document.querySelector('button[data-testid="send-button"]')
    || [...document.querySelectorAll('button')].find(b => /send prompt|send message/i.test(b.getAttribute('aria-label') || ''));
  if (!send) return 'NO_SEND_BTN';
  if (send.disabled) return 'SEND_DISABLED';
  send.click();
  return 'CLICKED';
})()`;
    const r = await evaluate(tab, clickJs);
    if (r !== "CLICKED") fail("chatgpt send failed: " + r);
  }
  await ackRecord(guard.key, target, text.length);
  process.stdout.write(JSON.stringify({ ok: true, target, sent: text.length, ackKey: guard.key }) + "\n");
}
async function cmdRead() {
  const target = opt("--target");
  if (!VALID_TARGETS.has(target)) fail("read needs --target muse|gemini|chatgpt");
  const chars = Number(opt("--chars") || 2000);
  const tab = findTab(target);
  const text = await evaluate(tab, `document.body.innerText.slice(-${chars})`);
  process.stdout.write(JSON.stringify({ ok: true, target, title: tab.title, url: tab.url, text }) + "\n");
}
async function main() {
  const cmd = process.argv[2];
  if (cmd === "tabs") return cmdTabs();
  if (cmd === "send") return cmdSend();
  if (cmd === "read") return cmdRead();
  process.stderr.write("usage: node cdp-bridge.mjs tabs | send --target muse|gemini|chatgpt (--file <path>|--text \"...\") | read --target muse|gemini|chatgpt [--chars n]\n");
  process.exit(cmd === "--help" || cmd === "-h" ? 0 : 1);
}
main().catch((e) => fail(e.message || String(e)));
