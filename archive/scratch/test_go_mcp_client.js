import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";

async function run() {
    console.log("Starting Go MCP Client verification...");
    const binaryPath = path.resolve("tormentnexus.exe");
    console.log("Binary path:", binaryPath);

    const transport = new StdioClientTransport({
        command: binaryPath,
        args: ["mcp"],
        env: {
            ...process.env,
            TORMENTNEXUS_WORKSPACE_ROOT: process.cwd(),
        }
    });

    const client = new Client(
        { name: "test-client", version: "1.0.0" },
        { capabilities: {} }
    );

    try {
        await client.connect(transport);
        console.log("Connected to Go MCP Server successfully.");

        console.log("Requesting tools list...");
        const result = await client.listTools();
        console.log(`Success! Received ${result.tools.length} tools.`);
    } catch (err) {
        console.error("Client Error:", err);
    } finally {
        try {
            await client.close();
        } catch {}
    }
}

run().catch(console.error);
