/**
 * Resolves ordered tRPC upstream base URLs and the authoritative Go kernel HTTP base.
 *
 * Architectural rationale:
 * HyperNexus migrated its authoritative control plane to the Go-native kernel on
 * port 7778 (`http://127.0.0.1:7778/trpc`), while retaining legacy TS core ports
 * (`3100`, `4000`, `3001`) as ordered fallback candidates for hybrid dev setups.
 * Both `HYPERNEXUS_*` and legacy `TORMENTNEXUS_*` environment variables are honored
 * so existing systemd units and local `.env` files keep working without drift.
 */

export const DEFAULT_GO_API_BASE = "http://127.0.0.1:7778";

export const DEFAULT_UPSTREAM_BASES = [
	"http://127.0.0.1:7778/trpc",
	"http://127.0.0.1:3100/trpc",
	"http://127.0.0.1:4000/trpc",
	"http://127.0.0.1:3001/trpc",
] as const;

function normalizeBaseUrl(raw: string): string {
	return raw.trim().replace(/\/+$/, "");
}

export function resolveUpstreamBases(): string[] {
	const configuredRaw =
		process.env.HYPERNEXUS_TRPC_UPSTREAM?.trim() ||
		process.env.TORMENTNEXUS_TRPC_UPSTREAM?.trim() ||
		"";

	const ordered: string[] = [];
	if (configuredRaw.length > 0) {
		for (const part of configuredRaw.split(",")) {
			const normalized = normalizeBaseUrl(part);
			if (normalized && !ordered.includes(normalized)) {
				ordered.push(normalized);
			}
		}
	}

	for (const candidate of DEFAULT_UPSTREAM_BASES) {
		const normalized = normalizeBaseUrl(candidate);
		if (!ordered.includes(normalized)) {
			ordered.push(normalized);
		}
	}

	return ordered;
}

export function resolveGoApiBase(): string {
	const configured =
		process.env.HYPERNEXUS_GO_API_BASE?.trim() ||
		process.env.TORMENTNEXUS_GO_API_BASE?.trim() ||
		DEFAULT_GO_API_BASE;
	return normalizeBaseUrl(configured);
}

export const trpcUpstream = {
	DEFAULT_GO_API_BASE,
	DEFAULT_UPSTREAM_BASES,
	resolveUpstreamBases,
	resolveGoApiBase,
};
