#!/usr/bin/env node
/**
 * HyperNexus Master Build & Verify Script
 * 
 * Orchestrates: Go kernel build → Dashboard build → Service restart → Health verify
 * Usage: node scripts/build-and-verify.mjs [--skip-go] [--skip-dashboard] [--skip-restart]
 */

import { execSync, spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const args = new Set(process.argv.slice(2));
const skipGo = args.has("--skip-go");
const skipDashboard = args.has("--skip-dashboard");
const skipRestart = args.has("--skip-restart");

const repoRoot = path.resolve(import.meta.dirname, "..");
const VERSION = readFileSync(path.join(repoRoot, "VERSION"), "utf-8").trim();

function log(msg) {
	console.log(`[build] ${msg}`);
}

function run(cmd, opts = {}) {
	log(`$ ${cmd}`);
	try {
		return execSync(cmd, { stdio: "inherit", shell: true, cwd: repoRoot, ...opts });
	} catch (e) {
		console.error(`[build] FAILED: ${cmd}`);
		if (!opts.continueOnError) process.exit(1);
	}
}

async function waitForHealth(url, timeoutMs = 30000) {
	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		try {
			const res = await fetch(url);
			if (res.ok) return true;
		} catch {}
		await new Promise(r => setTimeout(r, 1000));
	}
	return false;
}

async function main() {
	log(`Building HyperNexus v${VERSION}`);

	// 1. Go kernel
	if (!skipGo) {
		log("=== Building Go kernel ===");
		run("cd go && go build -o tormentnexus.exe ./cmd/tormentnexus", { continueOnError: true });
	}

	// 2. Dashboard
	if (!skipDashboard) {
		log("=== Building Dashboard ===");
		// Kill existing dashboard first (releases .next-build lock)
		try {
			execSync("powershell -Command \"Get-NetTCPConnection -LocalPort 7779 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }\"", { stdio: "pipe" });
		} catch {}
		await new Promise(r => setTimeout(r, 2000));
		run("cd apps/web && npm run build");
	}

	// 3. Restart services
	if (!skipRestart) {
		log("=== Restarting services ===");
		// Start Go kernel
		run("powershell -Command \"Get-NetTCPConnection -LocalPort 7778 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }\"", { continueOnError: true });
		await new Promise(r => setTimeout(r, 1000));
		spawn("go/tormentnexus.exe", [], { detached: true, stdio: "ignore", cwd: repoRoot }).unref();
		
		// Start Dashboard
		spawn("node", [".next-build/standalone/apps/web/server.js"], {
			detached: true,
			stdio: "ignore",
			cwd: path.join(repoRoot, "apps/web"),
			env: { ...process.env, PORT: "7779" },
		}).unref();
		
		log("Waiting for services...");
		await new Promise(r => setTimeout(r, 5000));
	}

	// 4. Health verify
	log("=== Health Verification ===");
	const goOk = await waitForHealth("http://127.0.0.1:7778/health");
	const dashOk = await waitForHealth("http://127.0.0.1:7779/dashboard");
	
	log(`Go kernel: ${goOk ? "✅ OK" : "❌ FAILED"}`);
	log(`Dashboard: ${dashOk ? "✅ OK" : "❌ FAILED"}`);
	
	if (goOk && dashOk) {
		log(`\n✅ Build complete — HyperNexus v${VERSION} running`);
		log(`   Go kernel: http://127.0.0.1:7778`);
		log(`   Dashboard: http://127.0.0.1:7779/dashboard`);
	} else {
		log("\n❌ Build complete but services unhealthy");
		process.exit(1);
	}
}

main().catch(console.error);
