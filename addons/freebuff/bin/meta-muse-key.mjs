#!/usr/bin/env node
/*
 * meta-muse-key.mjs — mint a Meta Model API key from the pi auth.json identity token.
 *
 * Freebuff edition of addons/droid/bin/meta-muse-key.mjs (same flow — freebuff
 * has no apiKeyHelper surface, so call this live from the shell or a session).
 *
 * Mirrors pi's own Meta OAuth flow (see @earendil-works/pi-ai dist/auth/oauth/meta.js):
 *   1. Read identity token from ~/.pi/agent/auth.json -> meta.refresh
 *   2. POST https://api.meta.ai/muse-code/key with Authorization: Bearer <identity>
 *   3. Print ONLY the minted api_key to stdout.
 *
 * Usage:
 *   node meta-muse-key.mjs            # prints minted key
 *   node meta-muse-key.mjs --check     # exit 0 if mint works, 1 otherwise
 *
 * Env overrides:
 *   META_AUTH_PATH      path to pi auth.json (default ~/.pi/agent/auth.json)
 *   META_KEY_MINT_URL   default https://api.meta.ai/muse-code/key
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const AUTH_PATH =
  process.env.META_AUTH_PATH || path.join(os.homedir(), ".pi", "agent", "auth.json");
const MINT_URL = process.env.META_KEY_MINT_URL || "https://api.meta.ai/muse-code/key";
const TIMEOUT_MS = 30_000;

function fail(msg) {
  process.stderr.write(`[meta-muse-key] ${msg}\n`);
  process.exit(1);
}

function readIdentityToken() {
  let raw;
  try {
    raw = fs.readFileSync(AUTH_PATH, "utf8");
  } catch (e) {
    fail(`cannot read auth file ${AUTH_PATH}: ${e.message}. Run /login meta in pi first.`);
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    fail(`auth file ${AUTH_PATH} is not valid JSON.`);
  }
  const cred = data?.meta;
  if (!cred || cred.type !== "oauth" || typeof cred.refresh !== "string" || !cred.refresh) {
    fail(
      `no Meta OAuth credential in ${AUTH_PATH} (expected .meta.refresh). Run /login meta in pi to sign in.`
    );
  }
  return cred.refresh;
}

async function mintApiKey(identityToken, signal) {
  const res = await fetch(MINT_URL, {
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
  let json = null;
  try {
    json = await res.json();
  } catch { /* non-JSON body */ }
  if (res.status === 401 || res.status === 403) {
    fail(
      `Meta session expired (HTTP ${res.status}). Identity tokens are not renewable — run /login meta in pi to sign in again.`
    );
  }
  if (!res.ok) {
    const detail = json && typeof json === "object"
      ? ["error_description", "detail", "message", "error"].map((k) => json[k]).find((v) => typeof v === "string" && v.trim())
      : null;
    fail(`Meta API key mint failed (HTTP ${res.status})${detail ? `: ${detail}` : ""}.`);
  }
  const apiKey = json?.api_key;
  if (typeof apiKey !== "string" || !apiKey) {
    const actionUrl = typeof json?.action_url === "string" ? json.action_url : null;
    fail(`Meta did not issue an API key.${actionUrl ? ` Complete setup at ${actionUrl}` : ""}`);
  }
  return apiKey;
}

const checkOnly = process.argv.includes("--check");
const identity = readIdentityToken();
try {
  const key = await mintApiKey(identity, AbortSignal.timeout(TIMEOUT_MS));
  if (checkOnly) {
    process.stderr.write("[meta-muse-key] mint OK (key hidden)\n");
  } else {
    process.stdout.write(key);
  }
} catch (e) {
  if (e?.name === "TimeoutError" || e?.name === "AbortError") fail(`mint request timed out after ${TIMEOUT_MS}ms.`);
  fail(e.message || String(e));
}
