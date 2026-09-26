// HyperNexus Claude Desktop Extension
// This extension provides persistent memory, tool orchestration, and cloud sync

const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

// Extension configuration
const CONFIG = {
	name: "hypernexus",
	version: "1.0.1",
	description: "HyperNexus - Universal AI Control Plane",
	mcpServerCommand: "hypernexus",
	mcpServerArgs: ["mcp"],
	configDir: path.join(os.homedir(), ".hypernexus"),
	brandingFile: path.join(os.homedir(), ".hypernexus", "branding.json"),
};

// Initialize extension
function initialize() {
	console.log(
		`[${CONFIG.name}] Initializing HyperNexus extension v${CONFIG.version}`,
	);

	// Ensure config directory exists
	if (!fs.existsSync(CONFIG.configDir)) {
		fs.mkdirSync(CONFIG.configDir, { recursive: true });
	}

	// Write branding config if it doesn't exist
	if (!fs.existsSync(CONFIG.brandingFile)) {
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
		fs.writeFileSync(CONFIG.brandingFile, JSON.stringify(branding, null, 2));
	}

	console.log(`[${CONFIG.name}] Extension initialized successfully`);
}

// Get extension info
function getInfo() {
	return {
		name: CONFIG.name,
		version: CONFIG.version,
		description: CONFIG.description,
		configDir: CONFIG.configDir,
		brandingFile: CONFIG.brandingFile,
	};
}

// Check if MCP server is running
function isMcpServerRunning() {
	try {
		const result = execSync('tasklist /FI "IMAGENAME eq hypernexus.exe" /NH', {
			encoding: "utf8",
		});
		return result.includes("hypernexus.exe");
	} catch (error) {
		return false;
	}
}

// Start MCP server
function startMcpServer() {
	console.log(`[${CONFIG.name}] Starting MCP server...`);

	try {
		const server = spawn(CONFIG.mcpServerCommand, CONFIG.mcpServerArgs, {
			detached: true,
			stdio: "ignore",
		});

		server.unref();
		console.log(`[${CONFIG.name}] MCP server started with PID: ${server.pid}`);
		return true;
	} catch (error) {
		console.error(
			`[${CONFIG.name}] Failed to start MCP server:`,
			error.message,
		);
		return false;
	}
}

// Stop MCP server
function stopMcpServer() {
	console.log(`[${CONFIG.name}] Stopping MCP server...`);

	try {
		execSync("taskkill /F /IM hypernexus.exe", { encoding: "utf8" });
		console.log(`[${CONFIG.name}] MCP server stopped`);
		return true;
	} catch (error) {
		console.error(`[${CONFIG.name}] Failed to stop MCP server:`, error.message);
		return false;
	}
}

// Get server status
function getServerStatus() {
	const isRunning = isMcpServerRunning();
	return {
		running: isRunning,
		command: CONFIG.mcpServerCommand,
		args: CONFIG.mcpServerArgs,
		pid: isRunning ? "unknown" : null,
	};
}

// Export extension functions
module.exports = {
	initialize,
	getInfo,
	isMcpServerRunning,
	startMcpServer,
	stopMcpServer,
	getServerStatus,
	CONFIG,
};

// Auto-initialize when loaded
initialize();
