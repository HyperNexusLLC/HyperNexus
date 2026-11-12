// License Management Types and Helpers

export interface User {
	id: string;
	email: string;
	name: string;
	apiKey: string;
	createdAt: string;
}

export interface License {
	id: string;
	userId: string;
	licenseKey: string;
	licenseType: "trial" | "personal" | "team" | "enterprise";
	status: "active" | "expired" | "revoked" | "suspended";
	maxSeats: number;
	usedSeats: number;
	expiresAt: string | null;
	createdAt: string;
}

export interface Subscription {
	id: string;
	userId: string;
	licenseId: string;
	stripeSubscriptionId: string;
	stripeCustomerId: string;
	planId: string;
	status: "active" | "canceled" | "past_due" | "trialing";
	currentPeriodStart: string;
	currentPeriodEnd: string;
	cancelAtPeriodEnd: boolean;
	updatedAt?: string;
}

export interface Device {
	id: string;
	userId: string;
	licenseId: string;
	deviceId: string;
	deviceName: string;
	deviceType: "windows" | "macos" | "linux";
	lastSeenAt: string;
}

export interface MemorySync {
	id: string;
	userId: string;
	memoryKey: string;
	memoryValue: string;
	encrypted: boolean;
	syncedAt: string;
}

// Generate license key
export function generateLicenseKey(): string {
	const prefix = "HN";
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	let result = prefix + "-";
	for (let i = 0; i < 3; i++) {
		for (let j = 0; j < 4; j++) {
			result += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		if (i < 2) result += "-";
	}
	return result;
}

// Generate API key
export function generateApiKey(): string {
	const chars =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let result = "hn_";
	for (let i = 0; i < 32; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

// Generate device ID
export function generateDeviceId(): string {
	const chars = "0123456789abcdef";
	let result = "";
	for (let i = 0; i < 32; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

// License validation
export function validateLicenseKey(key: string): boolean {
	const pattern = /^HN-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
	return pattern.test(key);
}

// Get license type from price ID
export function getLicenseType(priceId: string): License["licenseType"] {
	const priceMap: Record<string, License["licenseType"]> = {
		price_personal_monthly: "personal",
		price_personal_yearly: "personal",
		price_team_monthly: "team",
		price_team_yearly: "team",
		price_enterprise_monthly: "enterprise",
		price_enterprise_yearly: "enterprise",
	};
	return priceMap[priceId] || "personal";
}

// Get max seats from license type
export function getMaxSeats(licenseType: License["licenseType"]): number {
	const seatsMap: Record<License["licenseType"], number> = {
		trial: 1,
		personal: 1,
		team: 10,
		enterprise: 100,
	};
	return seatsMap[licenseType];
}

// Check if license is valid
export function isLicenseValid(license: License): boolean {
	if (license.status !== "active") return false;
	if (license.expiresAt && new Date(license.expiresAt) < new Date())
		return false;
	return true;
}

// Check if license has available seats
export function hasAvailableSeats(license: License): boolean {
	return license.usedSeats < license.maxSeats;
}
