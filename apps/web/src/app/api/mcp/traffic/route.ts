import { type NextRequest, NextResponse } from "next/server";

// In-memory store for MCP traffic (replace with database in production)
const trafficLog: Array<{
	id: string;
	timestamp: string;
	method: string;
	server: string;
	tool?: string;
	status: "success" | "error" | "pending";
	duration: number;
	request?: string;
	response?: string;
}> = [];

// POST /api/mcp/traffic - Log MCP traffic
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const {
			method,
			server,
			tool,
			status,
			duration,
			request: req,
			response: res,
		} = body;

		const entry = {
			id: crypto.randomUUID(),
			timestamp: new Date().toISOString(),
			method,
			server,
			tool,
			status: status || "success",
			duration: duration || 0,
			request: req,
			response: res,
		};

		trafficLog.unshift(entry);

		// Keep only last 1000 entries
		if (trafficLog.length > 1000) {
			trafficLog.splice(1000);
		}

		return NextResponse.json({ success: true, id: entry.id });
	} catch (error) {
		console.error("MCP traffic log error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// GET /api/mcp/traffic - Get MCP traffic
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const limit = parseInt(searchParams.get("limit") || "100");
		const server = searchParams.get("server");
		const tool = searchParams.get("tool");

		let filtered = trafficLog;

		if (server) {
			filtered = filtered.filter((t) => t.server === server);
		}

		if (tool) {
			filtered = filtered.filter((t) => t.tool === tool);
		}

		return NextResponse.json({
			traffic: filtered.slice(0, limit),
			total: filtered.length,
		});
	} catch (error) {
		console.error("MCP traffic GET error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
