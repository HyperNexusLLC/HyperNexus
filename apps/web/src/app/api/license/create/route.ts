import { type NextRequest, NextResponse } from "next/server";
import {
	generateLicenseKey,
	validateLicenseKey,
	type License,
} from "@/lib/license";

// In-memory store (replace with database in production)
const licenses: Map<string, License> = new Map();

// POST /api/license/create
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { userId, licenseType, priceId } = body;

		if (!userId || !licenseType) {
			return NextResponse.json(
				{ error: "userId and licenseType required" },
				{ status: 400 },
			);
		}

		// Generate license key
		const licenseKey = generateLicenseKey();

		// Create license
		const license: License = {
			id: crypto.randomUUID(),
			userId,
			licenseKey,
			licenseType,
			status: "active",
			maxSeats:
				licenseType === "team" ? 10 : licenseType === "enterprise" ? 100 : 1,
			usedSeats: 0,
			expiresAt:
				licenseType === "trial"
					? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
					: null,
			createdAt: new Date().toISOString(),
		};

		licenses.set(licenseKey, license);

		return NextResponse.json({
			success: true,
			license: {
				key: license.licenseKey,
				type: license.licenseType,
				status: license.status,
				expiresAt: license.expiresAt,
				maxSeats: license.maxSeats,
			},
		});
	} catch (error) {
		console.error("License creation error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
