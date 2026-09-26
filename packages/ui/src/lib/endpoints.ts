export interface EndpointOptions {
	envUrl?: string | null;
	defaultPort: number;
	defaultPath?: string;
}

function normalizeEnvUrl(url: string, suffix?: string): string {
	const trimmed = url.trim().replace(/\/$/, "");
	if (!suffix) {
		return trimmed;
	}

	if (trimmed.endsWith(suffix)) {
		return trimmed;
	}

	return `${trimmed}${suffix}`;
}

export function resolveHttpBaseUrl({
	envUrl,
	defaultPort,
	defaultPath,
}: EndpointOptions): string {
	const fromEnv = envUrl?.trim();
	if (fromEnv) {
		return normalizeEnvUrl(fromEnv, defaultPath);
	}

	if (typeof window !== "undefined") {
		const isLocal =
			window.location.hostname === "localhost" ||
			window.location.hostname === "127.0.0.1";
		const host = isLocal ? "127.0.0.1" : window.location.hostname;
		// When remote, use same origin (nginx proxies). When local, use specific port.
		const base = isLocal
			? `${window.location.protocol}//${host}:${defaultPort}`
			: `${window.location.protocol}//${host}`;
		return defaultPath ? `${base}${defaultPath}` : base;
	}

	const base = `http://127.0.0.1:${defaultPort}`;
	return defaultPath ? `${base}${defaultPath}` : base;
}

export function resolveWsUrl({
	envUrl,
	defaultPort,
	defaultPath,
}: EndpointOptions): string {
	const fromEnv = envUrl?.trim();
	if (fromEnv) {
		return normalizeEnvUrl(fromEnv, defaultPath);
	}

	if (typeof window !== "undefined") {
		const scheme = window.location.protocol === "https:" ? "wss" : "ws";
		const host =
			window.location.hostname === "localhost"
				? "127.0.0.1"
				: window.location.hostname;
		const base = `${scheme}://${host}:${defaultPort}`;
		return defaultPath ? `${base}${defaultPath}` : base;
	}

	const base = `ws://127.0.0.1:${defaultPort}`;
	return defaultPath ? `${base}${defaultPath}` : base;
}

export function resolveTrpcHttpUrl(envUrl?: string | null): string {
	const fromEnv = envUrl?.trim();
	if (fromEnv) {
		return normalizeEnvUrl(fromEnv, "/trpc");
	}

	if (typeof window !== "undefined") {
		const isLocal =
			window.location.hostname === "localhost" ||
			window.location.hostname === "127.0.0.1";
		// When remote, use same origin (nginx proxies /trpc). When local, use port 7778.
		if (isLocal) {
			return `http://127.0.0.1:7778/trpc`;
		}
		return `${window.location.protocol}//${window.location.hostname}/trpc`;
	}

	return "http://127.0.0.1:7778/trpc";
}

export function resolveCoreSseUrl(envUrl?: string | null): string {
	return resolveHttpBaseUrl({
		envUrl,
		defaultPort: 4300,
		defaultPath: "/api/sse",
	});
}

export function resolveCouncilWsUrl(envUrl?: string | null): string {
	return resolveWsUrl({ envUrl, defaultPort: 3000 });
}

export function resolveTerminalWsUrl(envUrl?: string | null): string {
	return resolveWsUrl({ envUrl, defaultPort: 8081 });
}

export function resolveCliApiBaseUrl(envUrl?: string | null): string {
	return resolveHttpBaseUrl({ envUrl, defaultPort: 4300 });
}
