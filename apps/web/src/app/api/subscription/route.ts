import { type NextRequest, NextResponse } from "next/server";
import type { Subscription } from "@/lib/license";

// In-memory store (replace with database in production)
const subscriptions: Map<string, Subscription> = new Map();

// GET /api/subscription - Get subscription
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const userId = searchParams.get("userId");

		if (!userId) {
			return NextResponse.json({ error: "userId required" }, { status: 400 });
		}

		// Find subscription for user
		const subscription = Array.from(subscriptions.values()).find(
			(s) => s.userId === userId,
		);

		return NextResponse.json({ subscription: subscription || null });
	} catch (error) {
		console.error("Subscription get error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// POST /api/subscription - Create subscription
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { userId, planId, stripeSubscriptionId, stripeCustomerId } = body;

		if (!userId || !planId) {
			return NextResponse.json(
				{ error: "userId and planId required" },
				{ status: 400 },
			);
		}

		const subscription: Subscription = {
			id: crypto.randomUUID(),
			userId,
			licenseId: "", // Will be set after license creation
			stripeSubscriptionId: stripeSubscriptionId || "",
			stripeCustomerId: stripeCustomerId || "",
			planId,
			status: "active",
			currentPeriodStart: new Date().toISOString(),
			currentPeriodEnd: new Date(
				Date.now() + 30 * 24 * 60 * 60 * 1000,
			).toISOString(),
			cancelAtPeriodEnd: false,
		};

		subscriptions.set(subscription.id, subscription);

		return NextResponse.json({
			success: true,
			subscription,
		});
	} catch (error) {
		console.error("Subscription create error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// PATCH /api/subscription - Update subscription
export async function PATCH(request: NextRequest) {
	try {
		const body = await request.json();
		const { subscriptionId, action, planId } = body;

		if (!subscriptionId || !action) {
			return NextResponse.json(
				{ error: "subscriptionId and action required" },
				{ status: 400 },
			);
		}

		const subscription = subscriptions.get(subscriptionId);
		if (!subscription) {
			return NextResponse.json(
				{ error: "Subscription not found" },
				{ status: 404 },
			);
		}

		switch (action) {
			case "cancel":
				subscription.cancelAtPeriodEnd = true;
				subscription.status = "canceled";
				break;
			case "reactivate":
				subscription.cancelAtPeriodEnd = false;
				subscription.status = "active";
				break;
			case "change_plan":
				if (planId) {
					subscription.planId = planId;
				}
				break;
			default:
				return NextResponse.json({ error: "Invalid action" }, { status: 400 });
		}

		subscription.updatedAt = new Date().toISOString();
		subscriptions.set(subscriptionId, subscription);

		return NextResponse.json({
			success: true,
			subscription,
		});
	} catch (error) {
		console.error("Subscription update error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
