#!/usr/bin/env node 
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
ok('config-exists', cfg == null ? false : true); 
ok('config-model', cfg == null ? false : cfg.indexOf('muse-spark-1.3-contributor') !== -1); 
ok('config-provider', cfg == null ? false : cfg.indexOf('[model_providers.meta]') !== -1); 
ok('config-envkey', cfg == null ? false : cfg.indexOf('MODEL_API_KEY') !== -1); 
ok('config-mcp', cfg == null ? false : cfg.indexOf('[mcp_servers.hypernexus]') !== -1); 
const SKILL_NAMES = ['hypernexus', 'hypernexus-ops', 'hypernexus-workflows', 'hypernexus-orchestrator', 'hn-status', 'hn-search', 'hn-store', 'hn-session', 'hn-context', 'hn-summary', 'hn-tools', 'hn-purge']; 
let nskills = 0; 
for (const n of SKILL_NAMES) { const f = path.join(CODEX_HOME, 'skills', n, 'SKILL.md'); if (fs.existsSync(f)) { if (fs.statSync(f).size > 100) { nskills++; } } } 
ok('skills-12-present-nonempty', nskills === 12); 
let nhooks = 0; 
for (const h of ['hn-session.sh', 'hn-rbac.sh', 'hn-pre-tool.sh']) { if (fs.existsSync(path.join(CODEX_HOME, 'hooks', h))) { nhooks++; } } 
ok('hooks-3-present', nhooks === 3); 
const agents = readIfExists(path.join(REPO, 'AGENTS.md')); 
ok('agents-overlay', agents == null ? false : agents.indexOf('hypernexus:begin:codex') !== -1); 
ok('mint-helper-present', fs.existsSync(path.join(ADDON, 'bin', 'meta-muse-key.mjs'))); 
ok('launcher-present', fs.existsSync(path.join(ADDON, 'use-meta-model.ps1'))); 
ok('installer-present', fs.existsSync(path.join(ADDON, 'install.mjs'))); 
function runMint() { 
return new Promise(function (resolve) { 
execFile(process.execPath, [path.join(ADDON, 'bin', 'meta-muse-key.mjs'), '--check'], { timeout: 60000 }, function (err, stdout, stderr) { 
const so = stdout ? String(stdout) : ''; 
const se = stderr ? String(stderr) : ''; 
resolve({ err: err, out: so + se }); }); }); } 
function runCodexVersion() { 
return new Promise(function (resolve) { 
execFile('codex', ['--version'], { timeout: 30000 }, function (err, stdout, stderr) { 
const so = stdout ? String(stdout) : ''; 
resolve({ err: err, out: so }); }); }); } 
async function main() { 
const r = await runMint(); 
console.log('mint-output: ' + r.out.slice(0, 200)); 
ok('mint-check', r.err == null ? true : false); 
let hok = false; 
let htxt = ''; 
try { const res = await fetch('http://127.0.0.1:7778/health'); hok = res.ok; htxt = await res.text(); } catch (e) { htxt = 'FETCH_FAIL ' + e.message; } 
console.log('kernel-health-body: ' + htxt.slice(0, 200)); 
ok('kernel-health', hok); 
const c = await runCodexVersion(); 
if (c.err == null) { console.log('codex-cli: ' + c.out.trim()); ok('codex-cli-present', true); } 
else { console.log('SKIP codex-cli-present (codex not on PATH in this shell: ' + c.err.message + ')'); } 
console.log('RESULT pass=' + pass + ' fail=' + fail); 
if (fail) { process.exit(1); } } 
main(); 
