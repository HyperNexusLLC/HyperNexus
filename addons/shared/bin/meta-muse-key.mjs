#!/usr/bin/env node
/*
 * meta-muse-key.mjs — CANONICAL minter: mint a Meta Model API key from the
 * pi auth.json identity token. Shared by ALL harnesses (droid, freebuff,
 * codex, jcode, crush, claude-code, muse-code, mini-swe-agent,
 * open-interpreter, opencode); each harness keeps only a thin shim under
 * addons/<harness>/bin/meta-muse-key.mjs that delegates here.
 *
 * Mirrors pi's own Meta OAuth flow (see @earendil-works/pi-ai
 * dist/auth/oauth/meta.js):
 *   1. Read identity token from ~/.pi/agent/auth.json -> meta.refresh
 *   2. POST https://api.meta.ai/muse-code/key with Authorization: Bearer <identity>
 *   3. Print ONLY the minted api_key to stdout.
 *
 * Called as an `apiKeyHelper`, stdout is used as the credential at request
 * time (refreshed on a TTL and after a 401). Nothing secret is logged.
 * pi owns the OAuth session — this helper never renews the identity itself.
 *
 * Usage:
 *   node meta-muse-key.mjs            # prints minted key
 *   node meta-muse-key.mjs --check     # exit 0 if mint works, 1 otherwise
 *   node meta-muse-key.mjs --doctor    # diagnose reauth-vs-mint failures offline-safe;
 *                                     # exit 0 healthy, 2 reauth needed, 1 other error
 *   node meta-muse-key.mjs --help      # usage
 *
 * Env overrides:
 *   META_AUTH_PATH      path to pi auth.json (default ~/.pi/agent/auth.json)
 *   META_KEY_MINT_URL   default https://api.meta.ai/muse-code/key
 *   META_REAUTH_HINT    appended to reauth guidance (lets a harness shim name
 *                       its native login, e.g. jcode's muse-subscription login)
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const AUTH_PATH =
  process.env.META_AUTH_PATH || path.join(os.homedir(), ".pi", "agent", "auth.json");
const MINT_URL = process.env.META_KEY_MINT_URL || "https://api.meta.ai/muse-code/key";
const REAUTH_HINT = process.env.META_REAUTH_HINT || "";
const TIMEOUT_MS = 30_000;

class ReauthNeeded extends Error {}

function fail(msg) {
  process.stderr.write(`[meta-muse-key] ${msg}\n`);
  process.exit(1);
}

function readIdentityToken() {
  let raw;
  try {
    raw = fs.readFileSync(AUTH_PATH, "utf8");
  } catch (e) {
    throw new ReauthNeeded(
      `cannot read auth file ${AUTH_PATH}: ${e.message}. Run /login meta in pi first.${REAUTH_HINT}`
    );
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new ReauthNeeded(
      `auth file ${AUTH_PATH} is not valid JSON.${REAUTH_HINT}`
    );
  }
  const cred = data?.meta;
  if (!cred || cred.type !== "oauth" || typeof cred.refresh !== "string" || !cred.refresh) {
    throw new ReauthNeeded(
      `no Meta OAuth credential in ${AUTH_PATH} (expected .meta.refresh). Run /login meta in pi to sign in.${REAUTH_HINT}`
    );
  }
  return cred.refresh;
}

async function mintApiKey(identityToken, signal) {
  let res;
  try {
    res = await fetch(MINT_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${identityToken}`,
        "Content-Type": "application/json",
        "x-api-version": "1.0.0",
      },
      body: "{}",
      signal,
    });
  } catch (e) {
    if (e?.name === "TimeoutError" || e?.name === "AbortError") {
      const t = new Error(`mint request timed out after ${TIMEOUT_MS}ms.`);
      t.code = "TIMEOUT";
      throw t;
    }
    const n = new Error(`mint request failed: ${e.message || String(e)}`);
    n.code = "NETWORK";
    throw n;
  }
  let json = null;
  try {
    json = await res.json();
  } catch { /* non-JSON body */ }
  if (res.status === 401 || res.status === 403) {
    throw new ReauthNeeded(
      `Meta session expired (HTTP ${res.status}). Identity tokens are not renewable — run /login meta in pi to sign in again.${REAUTH_HINT}`
    );
  }
  if (!res.ok) {
    const detail = json && typeof json === "object"
      ? ["error_description", "detail", "message", "error"].map((k) => json[k]).find((v) => typeof v === "string" && v.trim())
      : null;
    const err = new Error(`Meta API key mint failed (HTTP ${res.status})${detail ? `: ${detail}` : ""}.`);
    err.code = "MINT_HTTP";
    throw err;
  }
  const apiKey = json?.api_key;
  if (typeof apiKey !== "string" || !apiKey) {
    const actionUrl = typeof json?.action_url === "string" ? json.action_url : null;
    const err = new Error(`Meta did not issue an API key.${actionUrl ? ` Complete setup at ${actionUrl}` : ""}`);
    err.code = "MINT_EMPTY";
    throw err;
  }
  return apiKey;
}

function reauthAction() {
  return `action: run /login meta in pi to reauth, then mint a new key: node addons/shared/bin/meta-muse-key.mjs --check`;
}

if (process.argv.includes("--help")) {
  process.stdout.write(
    `meta-muse-key: mint a Meta Model API key from the pi OAuth session.\n` +
    `  (default)   print minted key to stdout (apiKeyHelper use)\n` +
    `  --check     exit 0 if mint works, 1 otherwise (key hidden)\n` +
    `  --doctor    diagnose: exit 0 healthy, 2 reauth needed, 1 other error\n` +
    `  --help      this text\n`
  );
  process.exit(0);
}

if (process.argv.includes("--doctor")) {
  let identity;
  try {
    identity = readIdentityToken();
  } catch (e) {
    process.stderr.write(`[meta-muse-key] REAUTH: ${e.message}\n[meta-muse-key] ${reauthAction()}\n`);
    process.exit(2);
  }
  try {
    await mintApiKey(identity, AbortSignal.timeout(TIMEOUT_MS));
    process.stderr.write("[meta-muse-key] OK: mint works (key hidden).\n");
  } catch (e) {
    if (e instanceof ReauthNeeded) {
      process.stderr.write(`[meta-muse-key] REAUTH: ${e.message}\n[meta-muse-key] ${reauthAction()}\n`);
      process.exit(2);
    }
    const prefix = e.code === "TIMEOUT" || e.code === "NETWORK" ? "NETWORK" : "MINT-FAILED";
    process.stderr.write(`[meta-muse-key] ${prefix}: ${e.message}\n`);
    process.exit(1);
  }
  process.exit(0);
}

const checkOnly = process.argv.includes("--check");
let identity;
try {
  identity = readIdentityToken();
} catch (e) {
  fail(e instanceof ReauthNeeded ? e.message : e.message || String(e));
}
try {
  const key = await mintApiKey(identity, AbortSignal.timeout(TIMEOUT_MS));
  if (checkOnly) {
    process.stderr.write("[meta-muse-key] mint OK (key hidden)\n");
  } else {
    process.stdout.write(key);
  }
} catch (e) {
  if (e instanceof ReauthNeeded) fail(e.message);
  if (e?.name === "TimeoutError" || e?.name === "AbortError" || e.code === "TIMEOUT") {
    fail(`mint request timed out after ${TIMEOUT_MS}ms.`);
  }
  fail(e.message || String(e));
}
