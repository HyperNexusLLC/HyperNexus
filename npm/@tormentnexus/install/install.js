#!/usr/bin/env node
const { execSync } = require("child_process");
const https = require("https");
const fs = require("fs");
const path = require("path");
const os = require("os");

console.log("╔══════════════════════════════════════════╗");
console.log("║   HyperNexus Universal Installer        ║");
console.log("║   38 AI Clients • One Command           ║");
console.log("╚══════════════════════════════════════════╝\n");

const platform = os.platform();
const arch = os.arch();

// Determine download URL based on platform
function getDownloadUrl() {
	const baseUrl = "https://releases.hypernexus.site/v1.0.0";

	if (platform === "win32") {
		return `${baseUrl}/hypernexus-setup.exe`;
	} else if (platform === "darwin") {
		return arch === "arm64"
			? `${baseUrl}/hypernexus-darwin-arm64`
			: `${baseUrl}/hypernexus-darwin-amd64`;
	} else {
		return arch === "arm64"
			? `${baseUrl}/hypernexus-linux-arm64`
			: `${baseUrl}/hypernexus-linux-amd64`;
	}
}

// Download file
function download(url, dest) {
	return new Promise((resolve, reject) => {
		const file = fs.createWriteStream(dest);
		https
			.get(url, (response) => {
				// Handle redirects
				if (
					response.statusCode >= 300 &&
					response.statusCode < 400 &&
					response.headers.location
				) {
					file.close();
					fs.unlinkSync(dest);
					download(response.headers.location, dest).then(resolve).catch(reject);
					return;
				}

				if (response.statusCode !== 200) {
					file.close();
					fs.unlinkSync(dest);
					reject(new Error(`Download failed: ${response.statusCode}`));
					return;
				}

				response.pipe(file);
				file.on("finish", () => {
					file.close();
					resolve();
				});
			})
			.on("error", (err) => {
				file.close();
				fs.unlinkSync(dest);
				reject(err);
			});
	});
}

async function main() {
	const url = getDownloadUrl();
	const isWindows = platform === "win32";
	const ext = isWindows ? ".exe" : "";
	const dest = path.join(os.tmpdir(), `hypernexus-install${ext}`);

	console.log(`Platform: ${platform} (${arch})`);
	console.log(`Downloading: ${url}\n`);

	try {
		await download(url, dest);

		// Make executable on Unix
		if (!isWindows) {
			fs.chmodSync(dest, "755");
		}

		console.log("Download complete. Running installer...\n");

		// Run the installer
		if (isWindows) {
			// Run .exe installer (silent mode)
			execSync(`"${dest}" /S`, { stdio: "inherit" });
		} else {
			// Run binary installer
			execSync(`"${dest}"`, { stdio: "inherit" });
		}

		// Cleanup
		try {
			fs.unlinkSync(dest);
		} catch {}

		console.log("\n✅ HyperNexus installed successfully!");
		console.log("   🏢 Corporate mode: ENABLED");
		console.log("   ☁️  Cloud endpoint: cloud.hypernexus.site");
		console.log("\n   Run 'hypernexus serve' to start the server.");
		console.log("   Run 'hypernexus --help' for more options.\n");

		// Create config directory and corporate branding
		const configDir = path.join(os.homedir(), ".hypernexus");
		if (!fs.existsSync(configDir)) {
			fs.mkdirSync(configDir, { recursive: true });
		}

		// Write corporate branding config
		const branding = {
			edition: "hypernexus",
			product_name: "HyperNexus",
			company_name: "HyperNexus Corp",
			tray_tooltip: "HyperNexus (Running)",
			dashboard_title: "HyperNexus Dashboard",
			cloud_endpoint: "https://cloud.hypernexus.site",
			config_dir: ".hypernexus",
			registry_key: "HyperNexus",
		};
		fs.writeFileSync(
			path.join(configDir, "branding.json"),
			JSON.stringify(branding, null, 2),
		);

		// Set environment variables
		if (isWindows) {
			execSync(`setx HN_EDITION corporate`);
			execSync(`setx HN_CLOUD_ENDPOINT https://cloud.hypernexus.site`);
		}
		process.env.HN_EDITION = "corporate";
		process.env.HN_CLOUD_ENDPOINT = "https://cloud.hypernexus.site";

		// Configure Claude Desktop MCP
		console.log("Configuring Claude Desktop...");
		const claudeConfigDir = isWindows
			? path.join(process.env.APPDATA || "", "Claude")
			: path.join(os.homedir(), "Library", "Application Support", "Claude");
		const claudeConfigFile = path.join(
			claudeConfigDir,
			"claude_desktop_config.json",
		);
		if (fs.existsSync(claudeConfigDir)) {
			const mcpConfig = {
				mcpServers: {
					hypernexus: {
						command: isWindows ? "hypernexus.exe" : "hypernexus",
						args: ["mcp"],
						env: {
							HN_EDITION: "corporate",
							HN_CLOUD_ENDPOINT: "https://cloud.hypernexus.site",
							TORMENTNEXUS_WORKSPACE_ROOT: path.join(
								os.homedir(),
								"workspace",
								"HyperNexus",
							),
						},
					},
				},
			};
			fs.writeFileSync(claudeConfigFile, JSON.stringify(mcpConfig, null, 2));
			console.log("  ✓ Claude Desktop configured");
		} else {
			console.log("  ⚠ Claude Desktop not found - skipping MCP config");
		}

		// Configure Cursor MCP
		console.log("Configuring Cursor...");
		const cursorConfigDir = isWindows
			? path.join(process.env.APPDATA || "", "Cursor", "User")
			: path.join(
					os.homedir(),
					"Library",
					"Application Support",
					"Cursor",
					"User",
				);
		const cursorConfigFile = path.join(cursorConfigDir, "mcp.json");
		if (fs.existsSync(cursorConfigDir)) {
			const mcpConfig = {
				mcpServers: {
					hypernexus: {
						command: isWindows ? "hypernexus.exe" : "hypernexus",
						args: ["mcp"],
						env: {
							HN_EDITION: "corporate",
							HN_CLOUD_ENDPOINT: "https://cloud.hypernexus.site",
							TORMENTNEXUS_WORKSPACE_ROOT: path.join(
								os.homedir(),
								"workspace",
								"HyperNexus",
							),
						},
					},
				},
			};
			fs.writeFileSync(cursorConfigFile, JSON.stringify(mcpConfig, null, 2));
			console.log("  ✓ Cursor configured");
		} else {
			console.log("  ⚠ Cursor not found - skipping MCP config");
		}
	} catch (err) {
		console.error("\n❌ Installation failed:", err.message);
		console.error("\nPlease download manually from:");
		console.error("  https://hypernexus.site/download\n");
		process.exit(1);
	}
}

main();
