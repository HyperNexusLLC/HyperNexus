import { type NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const WORKSPACE_DATA_DIR = existsSync(join(process.cwd(), "..", "..", "data"))
	? join(process.cwd(), "..", "..", "data")
	: join(process.cwd(), "data");

const CONFIG_PATH = join(WORKSPACE_DATA_DIR, "native-tools.json");

interface NativeConfig {
	tools: Record<string, boolean>;
}

function loadConfig(): NativeConfig {
	try {
		if (existsSync(CONFIG_PATH)) {
			return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
		}
	} catch {
		// ignore
	}
	return { tools: {} };
}

function saveConfig(config: NativeConfig) {
	if (!existsSync(WORKSPACE_DATA_DIR)) {
		const fs = require("fs");
		fs.mkdirSync(WORKSPACE_DATA_DIR, { recursive: true });
	}
	writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

export async function POST(request: NextRequest) {
	try {
		const { name, native } = await request.json();

		if (!name || typeof name !== "string") {
			return NextResponse.json(
				{ success: false, error: "Missing or invalid 'name'" },
				{ status: 400 },
			);
		}

		const config = loadConfig();
		config.tools[name] = native === true;
		saveConfig(config);

		// Also try to hit Go sidecar endpoint for synchronizing internal registries if active
		try {
			const GO_SIDECAR = process.env.TORMENTNEXUS_GO_SIDECAR_URL || "http://127.0.0.1:7778";
			await fetch(`${GO_SIDECAR}/api/tools/native`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name, native }),
				signal: AbortSignal.timeout(1000),
			});
		} catch {
			// ignore if Go sidecar is temporarily unreachable during Next.js standalone compile
		}

		return NextResponse.json({
			success: true,
			name,
			native: config.tools[name],
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json(
			{ success: false, error: message },
			{ status: 500 },
		);
	}
}
