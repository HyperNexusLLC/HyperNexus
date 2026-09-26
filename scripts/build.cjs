#!/usr/bin/env node
/**
 * HyperNexus Build & Release Script (Cross-Platform)
 */

const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const VERSION = "1.0.1";
const PLATFORMS = [
	{ goos: "windows", goarch: "amd64", ext: ".exe" },
	{ goos: "darwin", goarch: "amd64", ext: "" },
	{ goos: "darwin", goarch: "arm64", ext: "" },
	{ goos: "linux", goarch: "amd64", ext: "" },
	{ goos: "linux", goarch: "arm64", ext: "" },
];

function run(cmd, opts = {}) {
	console.log(`\n$ ${cmd}`);
	try {
		return execSync(cmd, { stdio: "inherit", shell: true, ...opts });
	} catch (e) {
		console.error(`Failed: ${cmd}`);
		if (!opts.continueOnError) process.exit(1);
	}
}

function runSilent(cmd) {
	try {
		return execSync(cmd, { encoding: "utf-8", shell: true }).trim();
	} catch {
		return null;
	}
}

// ============================================================
// STEP 1: CLEAN
// ============================================================
function clean() {
	console.log("\n=== STEP 1: Clean ===");
	if (fs.existsSync("dist/releases")) {
		fs.rmSync("dist/releases", { recursive: true, force: true });
	}
	fs.mkdirSync("dist/releases", { recursive: true });
	console.log("  Cleaned dist/releases/");
}

// ============================================================
// STEP 2: BUILD GO BINARIES
// ============================================================
function buildBinaries() {
	console.log("\n=== STEP 2: Build Go Binaries ===");

	// Check if go.mod exists
	if (!fs.existsSync("go.mod")) {
		console.log("  SKIP: No go.mod found");
		return;
	}

	for (const { goos, goarch, ext } of PLATFORMS) {
		const platform = `${goos}-${goarch}`;
		const output = `dist/releases/${platform}/hypernexus${ext}`;
		const dir = `dist/releases/${platform}`;

		fs.mkdirSync(dir, { recursive: true });
		console.log(`\nBuilding ${platform}...`);

		const result = spawnSync(
			"go",
			[
				"build",
				"-ldflags",
				`-s -w -X main.version=${VERSION}`,
				"-o",
				output,
				"./cmd/hypernexus",
			],
			{
				stdio: "inherit",
				shell: true,
				env: { ...process.env, GOOS: goos, GOARCH: goarch },
			},
		);

		if (result.status !== 0) {
			console.log(`  SKIP: ${platform} build failed`);
		} else {
			console.log(`  OK: ${output}`);
		}
	}
}

// ============================================================
// STEP 3: BUILD VS CODE EXTENSIONS
// ============================================================
function buildExtensions() {
	console.log("\n=== STEP 3: Build VS Code Extensions ===");

	// Build HyperNexus extension
	console.log("\nBuilding HyperNexus extension...");
	if (fs.existsSync("extensions/vscode-hypernexus/package.json")) {
		run("cd extensions/vscode-hypernexus && npm install && npm run compile", {
			continueOnError: true,
		});

		// Package
		run(
			"cd extensions/vscode-hypernexus && npx vsce package --allow-missing-releases",
			{ continueOnError: true },
		);
	}

	// Build TormentNexus extension
	console.log("\nBuilding TormentNexus extension...");
	if (!fs.existsSync("extensions/vscode-tormentnexus")) {
		if (fs.existsSync("extensions/vscode-hypernexus")) {
			fs.cpSync(
				"extensions/vscode-hypernexus",
				"extensions/vscode-tormentnexus",
				{ recursive: true },
			);
		}
	}

	if (fs.existsSync("extensions/vscode-tormentnexus/package.json")) {
		// Update branding
		const pkg = JSON.parse(
			fs.readFileSync("extensions/vscode-tormentnexus/package.json", "utf-8"),
		);
		pkg.name = "tormentnexus";
		pkg.displayName = "TormentNexus - Universal AI Control Plane";
		pkg.publisher = "tormentnexus";
		fs.writeFileSync(
			"extensions/vscode-tormentnexus/package.json",
			JSON.stringify(pkg, null, 2),
		);

		run("cd extensions/vscode-tormentnexus && npm install && npm run compile", {
			continueOnError: true,
		});
		run(
			"cd extensions/vscode-tormentnexus && npx vsce package --allow-missing-releases",
			{ continueOnError: true },
		);
	}
}

// ============================================================
// STEP 4: COPY EXTENSIONS TO RELEASES
// ============================================================
function copyExtensions() {
	console.log("\n=== STEP 4: Copy Extensions ===");

	// Copy HyperNexus VSIX
	const hnVsix = runSilent(
		'ls extensions/vscode-hypernexus/*.vsix 2>/dev/null || echo ""',
	);
	if (hnVsix) {
		const dest = `dist/releases/hypernexus-${VERSION}.vsix`;
		fs.copyFileSync(hnVsix, dest);
		console.log(`  Copied: ${dest}`);
	}

	// Copy TormentNexus VSIX
	const tnVsix = runSilent(
		'ls extensions/vscode-tormentnexus/*.vsix 2>/dev/null || echo ""',
	);
	if (tnVsix) {
		const dest = `dist/releases/tormentnexus-${VERSION}.vsix`;
		fs.copyFileSync(tnVsix, dest);
		console.log(`  Copied: ${dest}`);
	}
}

// ============================================================
// STEP 5: PUBLISH VS CODE EXTENSIONS
// ============================================================
function publishExtensions() {
	console.log("\n=== STEP 5: Publish VS Code Extensions ===");

	const vsceToken = process.env.VSCE_TOKEN;
	const ovsxToken = process.env.OVSX_TOKEN;

	if (!vsceToken) {
		console.log("  SKIP: VSCE_TOKEN not set");
		return;
	}

	// Publish HyperNexus
	console.log("\nPublishing HyperNexus extension...");
	run(
		`cd extensions/vscode-hypernexus && npx vsce publish --pat ${vsceToken}`,
		{ continueOnError: true },
	);

	// Publish TormentNexus
	console.log("\nPublishing TormentNexus extension...");
	run(
		`cd extensions/vscode-tormentnexus && npx vsce publish --pat ${vsceToken}`,
		{ continueOnError: true },
	);

	// Publish to Open VSX
	if (ovsxToken) {
		console.log("\nPublishing to Open VSX...");
		run(
			`cd extensions/vscode-hypernexus && npx ovsx publish --pat ${ovsxToken}`,
			{ continueOnError: true },
		);
		run(
			`cd extensions/vscode-tormentnexus && npx ovsx publish --pat ${ovsxToken}`,
			{ continueOnError: true },
		);
	}
}

// ============================================================
// STEP 6: CREATE RELEASE ARCHIVES
// ============================================================
function createArchives() {
	console.log("\n=== STEP 6: Create Release Archives ===");

	for (const { goos, goarch } of PLATFORMS) {
		const platform = `${goos}-${goarch}`;
		const dir = `dist/releases/${platform}`;

		if (!fs.existsSync(dir)) continue;

		console.log(`\nArchiving ${platform}...`);

		if (goos === "windows") {
			run(`cd ${dir} && zip -j ../hypernexus-${platform}.zip hypernexus.exe`, {
				continueOnError: true,
			});
		} else {
			run(`cd ${dir} && tar czf ../hypernexus-${platform}.tar.gz hypernexus`, {
				continueOnError: true,
			});
		}
	}
}

// ============================================================
// STEP 7: GENERATE CHECKSUMS
// ============================================================
function generateChecksums() {
	console.log("\n=== STEP 7: Generate Checksums ===");

	const releases = fs
		.readdirSync("dist/releases")
		.filter(
			(f) => f.endsWith(".zip") || f.endsWith(".tar.gz") || f.endsWith(".vsix"),
		);

	let checksums = "";
	for (const file of releases) {
		const hash = runSilent(`sha256sum dist/releases/${file}`);
		if (hash) {
			checksums += hash + "\n";
		}
	}

	fs.writeFileSync("dist/releases/checksums.txt", checksums);
	console.log("  Generated checksums.txt");
}

// ============================================================
// STEP 8: GIT OPERATIONS
// ============================================================
function gitOperations() {
	console.log("\n=== STEP 8: Git Operations ===");

	run("git add -A", { continueOnError: true });
	run(`git commit -m "release: v${VERSION}"`, { continueOnError: true });
	run(`git tag -a v${VERSION} -m "Release v${VERSION}"`, {
		continueOnError: true,
	});
	run("git push origin main --tags", { continueOnError: true });
}

// ============================================================
// MAIN
// ============================================================
function main() {
	console.log(`\n========================================`);
	console.log(`  HyperNexus Build & Release v${VERSION}`);
	console.log(`========================================\n`);

	const step = process.argv[2] || "all";

	switch (step) {
		case "clean":
			clean();
			break;
		case "binaries":
			buildBinaries();
			break;
		case "extensions":
			buildExtensions();
			break;
		case "copy":
			copyExtensions();
			break;
		case "publish":
			publishExtensions();
			break;
		case "archives":
			createArchives();
			break;
		case "checksums":
			generateChecksums();
			break;
		case "git":
			gitOperations();
			break;
		case "all":
			clean();
			buildBinaries();
			buildExtensions();
			copyExtensions();
			createArchives();
			generateChecksums();
			publishExtensions();
			gitOperations();
			break;
		default:
			console.log("Usage: node scripts/build.cjs [step]");
			console.log(
				"Steps: clean, binaries, extensions, copy, publish, archives, checksums, git, all",
			);
	}

	console.log("\n========================================");
	console.log("  Build Complete!");
	console.log("========================================\n");
}

main();
