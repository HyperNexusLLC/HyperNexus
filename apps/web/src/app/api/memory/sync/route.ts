import { type NextRequest, NextResponse } from "next/server";
import type { MemorySync } from "@/lib/license";

// In-memory store (replace with database in production)
const memoryStore: Map<string, MemorySync[]> = new Map();

// POST /api/memory/sync - Sync memory to cloud
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { userId, memories } = body;

		if (!userId || !memories) {
			return NextResponse.json(
				{ error: "userId and memories required" },
				{ status: 400 },
			);
		}

		// Get or create user memory store
		const userMemories = memoryStore.get(userId) || [];

		// Update memories
		for (const mem of memories) {
			const existing = userMemories.findIndex((m) => m.memoryKey === mem.key);
			const memorySync: MemorySync = {
				id: crypto.randomUUID(),
				userId,
				memoryKey: mem.key,
				memoryValue: mem.value,
				encrypted: false,
				syncedAt: new Date().toISOString(),
			};

			if (existing >= 0) {
				userMemories[existing] = memorySync;
			} else {
				userMemories.push(memorySync);
			}
		}

		memoryStore.set(userId, userMemories);

		return NextResponse.json({
			success: true,
			synced: memories.length,
			total: userMemories.length,
		});
	} catch (error) {
		console.error("Memory sync error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// GET /api/memory/sync - Get synced memories
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const userId = searchParams.get("userId");
		const key = searchParams.get("key");

		if (!userId) {
			return NextResponse.json({ error: "userId required" }, { status: 400 });
		}

		const userMemories = memoryStore.get(userId) || [];

		if (key) {
			const memory = userMemories.find((m) => m.memoryKey === key);
			return NextResponse.json({ memory: memory || null });
		}

		return NextResponse.json({
			memories: userMemories.map((m) => ({
				key: m.memoryKey,
				value: m.memoryValue,
				syncedAt: m.syncedAt,
			})),
		});
	} catch (error) {
		console.error("Memory get error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
