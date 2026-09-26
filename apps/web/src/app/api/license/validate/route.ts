import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { licenses, devices, users } from "@/lib/schema";
import { eq, and, gt } from "drizzle-orm";
import crypto from "crypto";

// Generate license key
export function generateLicenseKey(): string {
	const prefix = "HN";
	const random = crypto.randomBytes(24).toString("hex").toUpperCase();
	return `${prefix}-${random.slice(0, 8)}-${random.slice(8, 16)}-${random.slice(16, 24)}`;
}

// Validate license key
export async function validateLicense(licenseKey: string, deviceId?: string) {
	const license = await db.query.licenses.findFirst({
		where: eq(licenses.licenseKey, licenseKey),
		with: { user: true },
	});

	if (!license) {
		return { valid: false, error: "Invalid license key" };
	}

	if (license.status !== "active") {
		return { valid: false, error: `License is ${license.status}` };
	}

	if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
		return { valid: false, error: "License expired" };
	}

	// Check seat limit
	if (deviceId) {
		const existingDevice = await db.query.devices.findFirst({
			where: and(
				eq(devices.licenseId, license.id),
				eq(devices.deviceId, deviceId),
			),
		});

		if (!existingDevice) {
			// New device - check seat limit
			if (license.usedSeats >= license.maxSeats) {
				return { valid: false, error: "Maximum devices reached" };
			}

			// Register device
			await db.insert(devices).values({
				userId: license.userId,
				licenseId: license.id,
				deviceId,
				lastSeenAt: new Date(),
			});

			// Update used seats
			await db
				.update(licenses)
				.set({ usedSeats: license.usedSeats + 1, updatedAt: new Date() })
				.where(eq(licenses.id, license.id));
		} else {
			// Update last seen
			await db
				.update(devices)
				.set({ lastSeenAt: new Date() })
				.where(eq(devices.id, existingDevice.id));
		}
	}

	return {
		valid: true,
		license: {
			key: license.licenseKey,
			type: license.licenseType,
			status: license.status,
			expiresAt: license.expiresAt,
			maxSeats: license.maxSeats,
			usedSeats: license.usedSeats,
			user: {
				email: license.user.email,
				name: license.user.name,
			},
		},
	};
}

// POST /api/license/validate
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { licenseKey, deviceId } = body;

		if (!licenseKey) {
			return NextResponse.json(
				{ error: "License key required" },
				{ status: 400 },
			);
		}

		const result = await validateLicense(licenseKey, deviceId);
		return NextResponse.json(result);
	} catch (error) {
		console.error("License validation error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
