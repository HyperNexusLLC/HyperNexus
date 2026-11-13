#!/usr/bin/env node
// HyperNexus Codex integration battery: config + 18 skills + hooks + overlay + mint + kernel + MCP probe + proxy inference smoke.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ADDON = path.resolve(__dirname, '..');
const REPO = path.resolve(ADDON, '..', '..');
let HOME = os.homedir();
if (HOME === '') { HOME = process.env.USERPROFILE; }
const CODEX_HOME = process.env.CODEX_HOME ? process.env.CODEX_HOME : path.join(HOME, '.codex');
const CONFIG = path.join(CODEX_HOME, 'config.toml');
let pass = 0;
let fail = 0;
function ok(n, c) { if (c) { pass++; console.log('PASS ' + n); } else { fail++; console.log('FAIL ' + n); } }
function readIfExists(p) { try { return fs.readFileSync(p, 'utf8'); } catch (e) { return null; } }
const cfg = readIfExists(CONFIG);
ok('config-exists', cfg != null);
ok('config-model', cfg != null && (cfg.indexOf('muse-wonder-1.0-contributor') !== -1 || (cfg.indexOf('[model_providers.meta]') !== -1 && cfg.indexOf('model_provider') !== -1)));
ok('config-provider', cfg != null && cfg.indexOf('[model_providers.meta]') !== -1);
ok('config-envkey', cfg != null && cfg.indexOf('MODEL_API_KEY') !== -1);
ok('config-mcp', cfg != null && cfg.indexOf('[mcp_servers.hypernexus]') !== -1);
ok('config-wire-responses', cfg != null && cfg.indexOf('wire_api') !== -1 && cfg.indexOf('responses') !== -1);
ok('config-no-active-node_repl', (() => { if (cfg == null) return false; const lines = cfg.split('\n').filter(l => l.trim().indexOf('#') !== 0); return lines.join('\n').indexOf('[mcp_servers.node_repl]') === -1; })());
const SKILL_NAMES = ['hypernexus', 'hypernexus-ops', 'hypernexus-workflows', 'hypernexus-orchestrator', 'hypernexus-researcher', 'hn-status', 'hn-search', 'hn-store', 'hn-session', 'hn-context', 'hn-summary', 'hn-tools', 'hn-purge', 'hn-plan', 'hn-remember', 'hn-restore', 'hn-auth', 'hn-models'];
let nskills = 0;
for (const n of SKILL_NAMES) { const f = path.join(CODEX_HOME, 'skills', n, 'SKILL.md'); if (fs.existsSync(f) && fs.statSync(f).size > 100) { nskills++; } else { console.log('MISSING-SKILL ' + n); } }
ok('skills-18-present-nonempty', nskills === SKILL_NAMES.length);
// source files exist in repo
let nsrc = 0;
for (const n of ['hypernexus', 'hypernexus-ops', 'hypernexus-workflows']) { if (fs.existsSync(path.join(ADDON, 'skills', n, 'SKILL.md'))) nsrc++; }
for (const n of ['hypernexus-orchestrator', 'hypernexus-researcher']) { if (fs.existsSync(path.join(ADDON, 'agent', n + '.md'))) nsrc++; }
for (const n of ['hn-status','hn-search','hn-store','hn-session','hn-context','hn-summary','hn-tools','hn-purge','hn-plan','hn-remember','hn-restore','hn-auth','hn-models']) { if (fs.existsSync(path.join(ADDON, 'commands', n + '.md'))) nsrc++; }
ok('sources-present-18', nsrc === 18);
let nhooks = 0;
for (const h of ['hn-session.sh', 'hn-rbac.sh', 'hn-pre-tool.sh']) { if (fs.existsSync(path.join(CODEX_HOME, 'hooks', h))) nhooks++; }
ok('hooks-3-present', nhooks === 3);
const agents = readIfExists(path.join(REPO, 'AGENTS.md'));
ok('agents-overlay', agents != null && agents.indexOf('hypernexus:begin:codex') !== -1);
ok('agents-overlay-lists-13', agents != null && agents.indexOf('hn-models') !== -1 && agents.indexOf('hn-restore') !== -1 && agents.indexOf('hypernexus-researcher') !== -1);
ok('mint-helper-present', fs.existsSync(path.join(ADDON, 'bin', 'meta-muse-key.mjs')));
ok('launcher-present', fs.existsSync(path.join(ADDON, 'use-meta-model.ps1')));
const launcherSrc = readIfExists(path.join(ADDON, 'use-meta-model.ps1')) || '';
ok('launcher-disables-shell_tool', launcherSrc.indexOf('--disable') !== -1 && launcherSrc.indexOf('shell_tool') !== -1);
ok('launcher-disables-unified_exec', launcherSrc.indexOf('unified_exec') !== -1);
ok('launcher-disables-goals', launcherSrc.indexOf('goals') !== -1);
ok('installer-present', fs.existsSync(path.join(ADDON, 'install.mjs')));
const instSrc = readIfExists(path.join(ADDON, 'install.mjs')) || '';
ok('installer-13-commands', instSrc.indexOf('hn-models') !== -1 && instSrc.indexOf('hn-restore') !== -1 && instSrc.indexOf('hn-auth') !== -1);
ok('installer-researcher', instSrc.indexOf('hypernexus-researcher') !== -1);
function runMint() {
  return new Promise(function (resolve) {
    execFile(process.execPath, [path.join(ADDON, 'bin', 'meta-muse-key.mjs'), '--check'], { timeout: 60000 }, function (err, stdout, stderr) {
      resolve({ err: err, out: String(stdout || '') + String(stderr || '') });
    });
  });
}
function runCodexVersion() {
  return new Promise(function (resolve) {
    execFile('codex', ['--version'], { timeout: 30000 }, function (err, stdout) {
      resolve({ err: err, out: String(stdout || '') });
    });
  });
}
async function main() {
  const r = await runMint();
  console.log('mint-output: ' + r.out.slice(0, 200));
  ok('mint-check', r.err == null);
  let hok = false; let htxt = '';
  try { const res = await fetch('http://127.0.0.1:7778/health'); hok = res.ok; htxt = await res.text(); } catch (e) { htxt = 'FETCH_FAIL ' + e.message; }
  console.log('kernel-health-body: ' + htxt.slice(0, 200));
  ok('kernel-health', hok);
  // MCP probe: system_status via HTTP fallback (never prints secrets)
  try {
    const res = await fetch('http://127.0.0.1:7778/api/mcp/status');
    const j = await res.json().catch(() => null);
    console.log('mcp-status-body: ' + JSON.stringify(j).slice(0, 300));
    ok('mcp-status-http', res.ok);
  } catch (e) { console.log('mcp-status-http FAIL ' + e.message); ok('mcp-status-http', false); }
  // Proxy inference smoke: parity-only tools (no shell/request_user_input/goal names) through the kernel.
  // Uses a live-minted key in-memory only (never printed); skips cleanly when mint fails.
  try {
    const { execFile: ef } = await import('node:child_process');
    const key = await new Promise(function (resolve, reject) {
      ef(process.execPath, [path.join(ADDON, 'bin', 'meta-muse-key.mjs')], { timeout: 60000 }, function (err, stdout) {
        if (err) reject(err); else resolve(String(stdout || '').trim());
      });
    });
    if (!key) { console.log('SKIP proxy-inference (empty key)'); }
    else {
      const body = { model: 'meta/muse-wonder-1.0-contributor', input: 'Reply with the exact word PONG.', tools: [{ type: 'function', name: 'code_interpreter', description: 'run code', parameters: { type: 'object', properties: {} } }] };
      const res = await fetch('http://127.0.0.1:7778/v1/responses', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key }, body: JSON.stringify(body) });
      const txt = await res.text();
      console.log('proxy-inference-status: ' + res.status + ' body: ' + txt.slice(0, 300));
      ok('proxy-inference-200', res.status === 200);
      ok('proxy-inference-no-403', txt.indexOf('client_attestation_denied') === -1);
    }
  } catch (e) { console.log('proxy-inference SKIP/FAIL: ' + (e && e.message ? e.message : e)); ok('proxy-inference-200', false); }
  const c = await runCodexVersion();
  if (c.err == null) { console.log('codex-cli: ' + c.out.trim()); ok('codex-cli-present', true); }
  else { console.log('SKIP codex-cli-present (codex not on PATH in this shell)'); }
  console.log('RESULT pass=' + pass + ' fail=' + fail);
  if (fail) process.exit(1);
}
main();
