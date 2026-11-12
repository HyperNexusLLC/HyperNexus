import { type NextRequest, NextResponse } from "next/server";

// In-memory store for telemetry (replace with database in production)
const telemetryData: Map<
	string,
	{
		firstRuns: number;
		downloads: number;
		activations: number;
	}
> = new Map();

// POST /api/v1/telemetry/first_run
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { deviceId, platform, version, timestamp } = body;

		if (!deviceId) {
			return NextResponse.json({ error: "deviceId required" }, { status: 400 });
		}

		// Track first run
		const today = new Date().toISOString().split("T")[0];
		const data = telemetryData.get(today) || {
			firstRuns: 0,
			downloads: 0,
			activations: 0,
		};
		data.firstRuns++;
		telemetryData.set(today, data);

		// Log for analytics
		console.log(`[Telemetry] First run: ${deviceId} (${platform}) v${version}`);

		return NextResponse.json({
			success: true,
			message: "First run recorded",
			showTrialBanner: true,
		});
	} catch (error) {
		console.error("Telemetry error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// GET /api/v1/telemetry/first_run - Get metrics
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const days = parseInt(searchParams.get("days") || "7");

		const metrics = [];
		for (let i = 0; i < days; i++) {
			const date = new Date();
			date.setDate(date.getDate() - i);
			const dateStr = date.toISOString().split("T")[0];
			const data = telemetryData.get(dateStr) || {
				firstRuns: 0,
				downloads: 0,
				activations: 0,
			};
			metrics.push({
				date: dateStr,
				...data,
				conversionRate:
					data.downloads > 0
						? ((data.firstRuns / data.downloads) * 100).toFixed(1) + "%"
						: "0%",
			});
		}

		return NextResponse.json({ metrics });
	} catch (error) {
		console.error("Telemetry GET error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
