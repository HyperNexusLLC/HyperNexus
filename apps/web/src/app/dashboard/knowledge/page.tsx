"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Legacy /dashboard/knowledge route. The knowledge graph + skills live in the
// consolidated dashboard home view (dashboard-home-view.tsx) under the
// "memory-graphrag" section. This redirect keeps old links/bookmarks working and
// prevents a 404 dead-end (the same pattern as council -> swarm).
export default function KnowledgeRedirect() {
	const router = useRouter();
	useEffect(() => {
		router.replace("/dashboard#memory-graphrag");
	}, [router]);

	return (
		<div className="flex min-h-screen items-center justify-center bg-black text-zinc-400">
			<p>Redirecting to Memory &amp; Knowledge...</p>
		</div>
	);
}
