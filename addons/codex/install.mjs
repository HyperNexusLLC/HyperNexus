#!/usr/bin/env node 
import fs from 'node:fs'; 
import path from 'node:path'; 
import os from 'node:os'; 
import { fileURLToPath } from 'node:url'; 
const __dirname = path.dirname(fileURLToPath(import.meta.url)); 
const REPO_ROOT = path.resolve(__dirname, '..', '..'); 
let HOME = os.homedir(); 
if (HOME === '') { HOME = process.env.USERPROFILE; } 
if (HOME == null) { HOME = process.env.HOME; } 
const CODEX_HOME = process.env.CODEX_HOME ? process.env.CODEX_HOME : path.join(HOME, '.codex'); 
const MODE = process.argv.includes('--uninstall') ? 'uninstall' : process.argv.includes('--check') ? 'check' : 'install'; 
const CONFIG = path.join(CODEX_HOME, 'config.toml'); 
const SKILLS_DIR = path.join(CODEX_HOME, 'skills'); 
const HOOKS_DIR = path.join(CODEX_HOME, 'hooks'); 
const AGENTS_FILE = path.join(REPO_ROOT, 'AGENTS.md'); 
const DQ = String.fromCharCode(34); 
const SQ = String.fromCharCode(39); 
const TD_BEGIN = '# hypernexus:begin:codex-defaults (managed by addons/codex/install.mjs)'; 
const TD_END = '# hypernexus:end:codex-defaults'; 
const TP_BEGIN = '# hypernexus:begin:codex-meta (managed by addons/codex/install.mjs)'; 
const TP_END = '# hypernexus:end:codex-meta'; 
const TM_BEGIN = '# hypernexus:begin:codex-mcp (managed by addons/codex/install.mjs)'; 
const TM_END = '# hypernexus:end:codex-mcp'; 
const CORE_SKILLS = ['hypernexus', 'hypernexus-ops', 'hypernexus-workflows']; 
const COMMANDS = ['hn-status', 'hn-search', 'hn-store', 'hn-session', 'hn-context', 'hn-summary', 'hn-tools', 'hn-purge']; 
const AGENT = 'hypernexus-orchestrator'; 
const HOOKS = ['hn-session.sh', 'hn-rbac.sh', 'hn-pre-tool.sh']; 
function log(m) { console.log('[hypernexus-codex] ' + m); } 
function readIfExists(p) { try { return fs.readFileSync(p, 'utf8'); } catch (e) { return null; } } 
function writeUtf8(f, c) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, c, 'utf8'); } 
const MBEGIN = '<!-- hypernexus:begin:codex (managed by addons/codex/install.mjs) -->'; 
const MEND = '<!-- hypernexus:end:codex -->'; 
function resolveExe() { const exe = process.platform === 'win32' ? 'hypernexus.exe' : 'hypernexus'; 
const ov = process.env.HYPERNEXUS_MCP_COMMAND; 
if (ov) { return ov; } 
const cands = [path.join(REPO_ROOT, 'bin', exe)]; 
for (const c of cands) { if (fs.existsSync(c)) { return c; } } 
return exe; } 
function wsRoot() { if (process.env.HYPERNEXUS_WORKSPACE_ROOT) { return process.env.HYPERNEXUS_WORKSPACE_ROOT; } return REPO_ROOT; } 
function defaultsBlock() { 
return [TD_BEGIN, 'model = ' + DQ + 'meta/muse-spark-1.3-contributor' + DQ, 'model_provider = ' + DQ + 'meta' + DQ, 'model_reasoning_effort = ' + DQ + 'high' + DQ, 'model_reasoning_summary = ' + DQ + 'auto' + DQ, 'model_context_window = 1048576', TD_END].join('\n'); } 
function providerBlock() { 
return [TP_BEGIN, '[model_providers.meta]', 'name = ' + DQ + 'Meta' + DQ, 'base_url = ' + DQ + 'http://127.0.0.1:7778/v1' + DQ, 'env_key = ' + DQ + 'MODEL_API_KEY' + DQ, 'wire_api = ' + DQ + 'responses' + DQ, TP_END].join('\n'); } 
function mcpBlock() { 
const exe = resolveExe(); 
const ws = wsRoot(); 
return [TM_BEGIN, '[mcp_servers.hypernexus]', 'command = ' + SQ + exe + SQ, 'args = [' + DQ + 'mcp' + DQ + ']', '', '[mcp_servers.hypernexus.env]', 'HYPERNEXUS_URL = ' + DQ + 'http://127.0.0.1:7778' + DQ, 'HYPERNEXUS_WORKSPACE_ROOT = ' + SQ + ws + SQ, TM_END].join('\n'); } 
function hasKey(src, key) { return src.split('\n').some(function (l) { return l.trim().indexOf(key) === 0; }); } 
function upsertBlock(src, begin, end, block) { 
const bi = src.indexOf(begin); 
const ei = src.indexOf(end); 
if (bi !== -1) { if (ei !== -1) { return src.slice(0, bi) + block + src.slice(ei + end.length); } return src; } 
const tail = src.trimEnd(); 
if (tail === '') { return block + '\n'; } return tail + '\n\n' + block + '\n'; } 
function removeBlock(src, begin, end) { 
const bi = src.indexOf(begin); 
const ei = src.indexOf(end); 
if (bi === -1) { return src; } if (ei === -1) { return src; } 
return (src.slice(0, bi) + src.slice(ei + end.length)).replace(/\n{3,}/g, '\n\n'); } 
function installConfig() { 
let raw = readIfExists(CONFIG); 
if (raw == null) { raw = ''; } 
let dirty = false; 
if (raw.indexOf(TD_BEGIN) !== -1) { raw = upsertBlock(raw, TD_BEGIN, TD_END, defaultsBlock()); dirty = true; } 
else { if (hasKey(raw, 'model =') === false) { if (hasKey(raw, 'model_provider =') === false) { raw = upsertBlock(raw, TD_BEGIN, TD_END, defaultsBlock()); dirty = true; } } } 
if (raw.indexOf(TP_BEGIN) !== -1) { raw = upsertBlock(raw, TP_BEGIN, TP_END, providerBlock()); dirty = true; } 
else { if (hasKey(raw, '[model_providers.meta]') === false) { raw = upsertBlock(raw, TP_BEGIN, TP_END, providerBlock()); dirty = true; } } 
if (raw.indexOf(TM_BEGIN) !== -1) { raw = upsertBlock(raw, TM_BEGIN, TM_END, mcpBlock()); dirty = true; } 
else { if (hasKey(raw, '[mcp_servers.hypernexus]') === false) { raw = upsertBlock(raw, TM_BEGIN, TM_END, mcpBlock()); dirty = true; } } 
if (dirty) { writeUtf8(CONFIG, raw); } 
return dirty; } 
function installSkills() { 
let count = 0; 
for (const name of CORE_SKILLS) { 
const src = path.join(__dirname, 'skills', name, 'SKILL.md'); 
if (fs.existsSync(src) === false) { log('WARNING: missing source skill ' + src + ', skipping.'); continue; } 
writeUtf8(path.join(SKILLS_DIR, name, 'SKILL.md'), fs.readFileSync(src, 'utf8')); count++; } 
const asrc = path.join(__dirname, 'agent', AGENT + '.md'); 
if (fs.existsSync(asrc)) { writeUtf8(path.join(SKILLS_DIR, AGENT, 'SKILL.md'), fs.readFileSync(asrc, 'utf8')); count++; } 
else { log('WARNING: missing source agent ' + asrc + ', skipping.'); } 
for (const name of COMMANDS) { 
const csrc = path.join(__dirname, 'commands', name + '.md'); 
if (fs.existsSync(csrc) === false) { log('WARNING: missing source command ' + csrc + ', skipping.'); continue; } 
writeUtf8(path.join(SKILLS_DIR, name, 'SKILL.md'), fs.readFileSync(csrc, 'utf8')); count++; } 
return count; } 
function installHooks() { 
let count = 0; 
for (const h of HOOKS) { 
const src = path.join(__dirname, 'hooks', h); 
if (fs.existsSync(src) === false) { log('WARNING: missing source hook ' + src + ', skipping.'); continue; } 
writeUtf8(path.join(HOOKS_DIR, h), fs.readFileSync(src, 'utf8')); count++; } 
const rsrc = path.join(__dirname, 'hooks', 'README.md'); 
if (fs.existsSync(rsrc)) { writeUtf8(path.join(HOOKS_DIR, 'README.md'), fs.readFileSync(rsrc, 'utf8')); } 
return count; } 
function agentsBlock() { 
return [MBEGIN, '## HyperNexus Control Plane (codex)', '', 'This repo is backed by the local HyperNexus kernel (Go, port 7778).', 'Codex reads this file at session start plus skills from CODEX_HOME/skills', '(each skill invocable as /skill:name).', '', 'Discipline loop: RECALL -> DISCOVER -> EXECUTE -> PERSIST -> VERIFY', '', '- RECALL: search kernel memory first (hypernexus MCP search_memory) before re-deriving.', '- DISCOVER: list MCP servers and tools, then route with mcp_call_tool.', '- PERSIST: store non-obvious outcomes via add_memory with topic,codex tags.', '- VERIFY: system_status plus billing_status before and after production changes.', '- Skills: hypernexus, hypernexus-ops, hypernexus-workflows, hypernexus-orchestrator', '  plus command-skills hn-status, hn-search, hn-store, hn-session, hn-context, hn-summary, hn-tools, hn-purge.', '- Model: meta/muse-spark-1.3-contributor via model_providers.meta (env_key MODEL_API_KEY).', '  Mint with node addons/codex/bin/meta-muse-key.mjs (pi owns OAuth refresh).', '  Launch with use-meta-model.ps1 after setting MODEL_API_KEY in your shell.', '- Hooks (by-convention, CODEX_HOME/hooks): hn-session.sh bootstrap, hn-rbac.sh deny-list, hn-pre-tool.sh allow-gate.', '- Degradation: if the kernel is down, say so in one sentence and continue with local tools.', MEND].join('\n'); } 
function installOverlay() { 
const ex = readIfExists(AGENTS_FILE); 
if (ex == null) { log('WARNING: AGENTS.md not found, skipping overlay.'); return 'skipped'; } 
const block = agentsBlock(); 
const bi = ex.indexOf(MBEGIN); 
const ei = ex.indexOf(MEND); 
let nx = ex; 
if (bi !== -1) { if (ei !== -1) { nx = ex.slice(0, bi) + block + ex.slice(ei + MEND.length); } } 
else { nx = ex.trimEnd() + '\n\n' + block + '\n'; } 
if (nx !== ex) { writeUtf8(AGENTS_FILE, nx); return 'written'; } 
return 'current'; } 
function checkAll() { 
const gaps = []; 
const raw = readIfExists(CONFIG); 
if (raw == null) { gaps.push('missing ' + CONFIG); } 
else { 
if (raw.indexOf('muse-spark-1.3-contributor') === -1) { gaps.push('config: no muse-spark-1.3-contributor model'); } 
if (raw.indexOf('[model_providers.meta]') === -1) { gaps.push('config: no [model_providers.meta]'); } 
if (raw.indexOf('[mcp_servers.hypernexus]') === -1) { gaps.push('config: no [mcp_servers.hypernexus]'); } } 
const all = CORE_SKILLS.concat([AGENT]).concat(COMMANDS); 
for (const n of all) { if (fs.existsSync(path.join(SKILLS_DIR, n, 'SKILL.md')) === false) { gaps.push('missing skill ' + n); } } 
for (const h of HOOKS) { if (fs.existsSync(path.join(HOOKS_DIR, h)) === false) { gaps.push('missing hook ' + h); } } 
const agents = readIfExists(AGENTS_FILE); 
if (agents == null) { gaps.push('missing AGENTS.md'); } 
else { if (agents.indexOf('hypernexus:begin:codex') === -1) { gaps.push('AGENTS.md: no managed hypernexus block'); } } 
if (fs.existsSync(path.join(__dirname, 'bin', 'meta-muse-key.mjs')) === false) { gaps.push('missing bin/meta-muse-key.mjs'); } 
if (fs.existsSync(path.join(__dirname, 'use-meta-model.ps1')) === false) { gaps.push('missing use-meta-model.ps1'); } 
if (gaps.length) { console.log('[hypernexus-codex] CHECK FAILED (' + gaps.length + ' gap(s)):'); for (const g of gaps) { console.log('  - ' + g); } process.exit(1); } 
console.log('[hypernexus-codex] CHECK OK: config + ' + all.length + ' skills + ' + HOOKS.length + ' hooks + overlay present.'); } 
function uninstallAll() { 
let removed = 0; 
const raw = readIfExists(CONFIG); 
if (raw != null) { 
let nx = removeBlock(raw, TD_BEGIN, TD_END); 
nx = removeBlock(nx, TP_BEGIN, TP_END); 
nx = removeBlock(nx, TM_BEGIN, TM_END); 
if (nx !== raw) { writeUtf8(CONFIG, nx); removed++; } } 
const all = CORE_SKILLS.concat([AGENT]).concat(COMMANDS); 
for (const n of all) { const d = path.join(SKILLS_DIR, n); if (fs.existsSync(d)) { fs.rmSync(d, { recursive: true, force: true }); removed++; } } 
for (const h of HOOKS) { const f = path.join(HOOKS_DIR, h); if (fs.existsSync(f)) { fs.rmSync(f, { force: true }); removed++; } } 
const hf = path.join(HOOKS_DIR, 'README.md'); 
if (fs.existsSync(hf)) { fs.rmSync(hf, { force: true }); removed++; } 
const agents = readIfExists(AGENTS_FILE); 
if (agents != null) { 
const bi = agents.indexOf(MBEGIN); 
const ei = agents.indexOf(MEND); 
if (bi !== -1) { if (ei !== -1) { const nx2 = (agents.slice(0, bi) + agents.slice(ei + MEND.length)).replace(/\n{3,}/g, '\n\n'); writeUtf8(AGENTS_FILE, nx2); removed++; } } } 
log('uninstalled (' + removed + ' item(s) removed).'); } 
if (MODE === 'check') { checkAll(); } 
else { if (MODE === 'uninstall') { uninstallAll(); } else { 
const cfg = installConfig(); 
const nskills = installSkills(); 
const nhooks = installHooks(); 
const ov = installOverlay(); 
log('installed (config ' + (cfg ? 'updated' : 'already current') + ', ' + nskills + ' skills, ' + nhooks + ' hooks, AGENTS.md ' + ov + ').'); 
log('mint a key: node addons/codex/bin/meta-muse-key.mjs --mint (pi owns OAuth refresh; key stays in your shell env, never in files).'); 
log('launch: set MODEL_API_KEY in this shell, then run use-meta-model.ps1'); 
log('verify: node addons/codex/install.mjs --check'); } } 
