"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const http = __importStar(require("http"));
let statusBarItem;
let connected = false;
let serverUrl = "http://127.0.0.1:7778";
function activate(context) {
    console.log("HyperNexus extension activated");
    // Load configuration (port 7778 is authoritative; 8080 is stale).
    const config = vscode.workspace.getConfiguration("hypernexus");
    serverUrl = config.get("serverUrl", "http://127.0.0.1:7778");
    const autoConnect = config.get("autoConnect", true);
    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.text = "$(brain) HyperNexus";
    statusBarItem.tooltip = "HyperNexus - Click to connect";
    statusBarItem.command = "hypernexus.showStatus";
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
    // Register commands (12: union checklist)
    context.subscriptions.push(vscode.commands.registerCommand("hypernexus.connect", () => connect()), vscode.commands.registerCommand("hypernexus.disconnect", () => disconnect()), vscode.commands.registerCommand("hypernexus.saveMemory", () => saveMemory()), vscode.commands.registerCommand("hypernexus.searchMemory", () => searchMemory()), vscode.commands.registerCommand("hypernexus.showStatus", () => showStatus()), vscode.commands.registerCommand("hypernexus.openDashboard", () => openDashboard()), vscode.commands.registerCommand("hypernexus.showBilling", () => showBilling()), vscode.commands.registerCommand("hypernexus.searchCode", () => searchCode()), vscode.commands.registerCommand("hypernexus.captureHandoff", () => captureHandoff()), vscode.commands.registerCommand("hypernexus.showSessions", () => showSessions()), vscode.commands.registerCommand("hypernexus.runOpsCheck", () => runOpsCheck()), vscode.commands.registerCommand("hypernexus.dispatchAgent", () => dispatchAgent()));
    // Auto-connect if enabled
    if (autoConnect) {
        connect();
    }
    // Watch for configuration changes
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("hypernexus")) {
            const newConfig = vscode.workspace.getConfiguration("hypernexus");
            serverUrl = newConfig.get("serverUrl", "http://127.0.0.1:7778");
        }
    }));
}
async function connect() {
    try {
        statusBarItem.text = "$(sync~spin) HyperNexus";
        statusBarItem.tooltip = "Connecting to HyperNexus...";
        // Test connection
        const response = await makeRequest("/health");
        if (response.ok) {
            connected = true;
            statusBarItem.text = "$(brain) HyperNexus";
            statusBarItem.tooltip = `Connected to ${serverUrl}`;
            statusBarItem.backgroundColor = undefined;
            vscode.window.showInformationMessage("HyperNexus connected!");
        }
        else {
            throw new Error("Health check failed");
        }
    }
    catch (error) {
        connected = false;
        statusBarItem.text = "$(warning) HyperNexus";
        statusBarItem.tooltip = `Disconnected - Click to retry`;
        statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
        vscode.window.showErrorMessage(`HyperNexus connection failed: ${error}`);
    }
}
function disconnect() {
    connected = false;
    statusBarItem.text = "$(circle-slash) HyperNexus";
    statusBarItem.tooltip = "Disconnected";
    statusBarItem.backgroundColor = undefined;
    vscode.window.showInformationMessage("HyperNexus disconnected");
}
function requireConnected() {
    if (!connected) {
        vscode.window.showWarningMessage("HyperNexus not connected");
        return false;
    }
    return true;
}
async function saveMemory() {
    if (!requireConnected()) {
        return;
    }
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage("No active editor");
        return;
    }
    const selection = editor.document.getText(editor.selection);
    const title = await vscode.window.showInputBox({
        prompt: "Memory title",
        placeHolder: "Enter a title for this memory",
    });
    if (!title)
        return;
    const tags = await vscode.window.showInputBox({
        prompt: "Tags (comma-separated)",
        placeHolder: "code, snippet, important",
    });
    try {
        await makeRequest("/api/memory/store", "POST", {
            title,
            content: selection || editor.document.getText(),
            tags: tags ? tags.split(",").map((t) => t.trim()) : [],
            source: vscode.window.activeTextEditor?.document.fileName,
        });
        vscode.window.showInformationMessage(`Memory saved: ${title}`);
    }
    catch (error) {
        vscode.window.showErrorMessage(`Failed to save memory: ${error}`);
    }
}
async function searchMemory() {
    if (!requireConnected()) {
        return;
    }
    const query = await vscode.window.showInputBox({
        prompt: "Search memories",
        placeHolder: "Enter search query",
    });
    if (!query)
        return;
    try {
        const response = await makeRequest(`/api/memory/search?query=${encodeURIComponent(query)}&limit=10`);
        if (response.results && response.results.length > 0) {
            const items = response.results.map((r) => ({
                label: r.title,
                description: r.content.substring(0, 100),
                detail: r.tags?.join(", "),
            }));
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: "Select a memory to insert",
            });
            if (selected) {
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    editor.edit((editBuilder) => {
                        editBuilder.insert(editor.selection.active, selected.description || "");
                    });
                }
            }
        }
        else {
            vscode.window.showInformationMessage("No memories found");
        }
    }
    catch (error) {
        vscode.window.showErrorMessage(`Search failed: ${error}`);
    }
}
async function showStatus() {
    if (!connected) {
        vscode.window.showInformationMessage("HyperNexus: Disconnected");
        return;
    }
    try {
        const health = await makeRequest("/health");
        const message = `
HyperNexus Status:
- Server: ${serverUrl}
- Status: ${health.ok ? "Connected" : "Error"}
- Uptime: ${health.uptime || "N/A"}
- Version: ${health.version || "N/A"}
        `.trim();
        vscode.window
            .showInformationMessage(message, "Open Dashboard", "Disconnect")
            .then((action) => {
            if (action === "Open Dashboard")
                openDashboard();
            if (action === "Disconnect")
                disconnect();
        });
    }
    catch (error) {
        vscode.window.showErrorMessage(`Status check failed: ${error}`);
    }
}
function openDashboard() {
    const dashboardUrl = serverUrl.replace(/\/mcp\/?$/, "") + "/dashboard";
    vscode.env.openExternal(vscode.Uri.parse(dashboardUrl));
}
async function showBilling() {
    if (!requireConnected()) {
        return;
    }
    try {
        const billing = await makeRequest("/api/billing/status");
        vscode.window.showInformationMessage(`HyperNexus billing: ${JSON.stringify(billing).substring(0, 300)}`);
    }
    catch (error) {
        vscode.window.showErrorMessage(`Billing check failed: ${error}`);
    }
}
async function searchCode() {
    if (!requireConnected()) {
        return;
    }
    const query = await vscode.window.showInputBox({
        prompt: "Semantic code search",
        placeHolder: "Enter search query",
    });
    if (!query)
        return;
    try {
        const response = await makeRequest(`/api/memory/fts-search?q=${encodeURIComponent(query)}&limit=10`);
        const list = response?.data ?? response ?? [];
        if (Array.isArray(list) && list.length > 0) {
            const items = list.slice(0, 10).map((r) => ({
                label: String(r.title ?? r.file ?? "result"),
                description: JSON.stringify(r).substring(0, 100),
            }));
            await vscode.window.showQuickPick(items, {
                placeHolder: "Matching results",
            });
        }
        else {
            vscode.window.showInformationMessage("No code results found");
        }
    }
    catch (error) {
        vscode.window.showErrorMessage(`Code search failed: ${error}`);
    }
}
async function captureHandoff() {
    if (!requireConnected()) {
        return;
    }
    const summary = await vscode.window.showInputBox({
        prompt: "Session handoff summary",
        placeHolder: "What should the next session know?",
    });
    if (!summary)
        return;
    try {
        await makeRequest("/api/memory/session-summaries/capture", "POST", {
            status: "active",
            summary,
        });
        vscode.window.showInformationMessage("Handoff captured");
    }
    catch (error) {
        vscode.window.showErrorMessage(`Handoff failed: ${error}`);
    }
}
async function showSessions() {
    if (!requireConnected()) {
        return;
    }
    try {
        const summary = await makeRequest("/api/sessions/summary");
        vscode.window.showInformationMessage(`HyperNexus sessions: ${JSON.stringify(summary).substring(0, 300)}`);
    }
    catch (error) {
        vscode.window.showErrorMessage(`Sessions check failed: ${error}`);
    }
}
async function runOpsCheck() {
    if (!requireConnected()) {
        return;
    }
    try {
        const before = await makeRequest("/health");
        vscode.window.showInformationMessage(`HyperNexus ops baseline: ok=${before.ok} version=${before.version ?? "N/A"}. Apply your change, then run this command again to compare.`);
        await makeRequest("/api/memory/facts/add", "POST", {
            title: "VS Code ops check",
            content: `Ops baseline: ${JSON.stringify(before).substring(0, 500)}`,
            tags: ["ops", "deploy"],
            namespace: "project",
        });
    }
    catch (error) {
        vscode.window.showErrorMessage(`Ops check failed: ${error}`);
    }
}
async function dispatchAgent() {
    if (!requireConnected()) {
        return;
    }
    const verb = await vscode.window.showQuickPick(["tool", "chat", "swarm", "broadcast"], { placeHolder: "Agent call verb" });
    if (!verb)
        return;
    const payload = await vscode.window.showInputBox({
        prompt: `Payload for ${verb}`,
        placeHolder: verb === "chat" ? "Message text" : "JSON arguments",
    });
    if (payload === undefined)
        return;
    const config = vscode.workspace.getConfiguration("hypernexus");
    const model = config.get("model", "muse-spark-1.3-contributor");
    try {
        const endpoint = verb === "chat" ? "/api/agent/chat" : `/api/agent/${verb}/start`;
        const body = verb === "chat"
            ? { message: payload, model }
            : { arguments: payload, model };
        const response = await makeRequest(endpoint, "POST", body);
        vscode.window.showInformationMessage(`Agent ${verb} dispatched: ${JSON.stringify(response).substring(0, 300)}`);
    }
    catch (error) {
        vscode.window.showErrorMessage(`Agent dispatch failed: ${error}`);
    }
}
async function makeRequest(path, method = "GET", body) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, serverUrl);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method,
            headers: {
                "Content-Type": "application/json",
            },
        };
        const req = http.request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
                try {
                    resolve(JSON.parse(data));
                }
                catch {
                    resolve({ ok: res.statusCode === 200 });
                }
            });
        });
        req.on("error", reject);
        req.setTimeout(5000, () => {
            req.destroy();
            reject(new Error("Request timeout"));
        });
        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}
function deactivate() {
    disconnect();
}
//# sourceMappingURL=extension.js.map