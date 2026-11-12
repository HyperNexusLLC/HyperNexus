type MemoryRecordInput = {
    title: string;
    content: string;
    tags?: string[];
    namespace?: string;
    type?: string;
};

function getCoreBaseUrl(): string {
    return (
        process.env.HYPERNEXUS_CORE_URL ??
        process.env.NEXT_PUBLIC_CORE_SSE_URL?.replace(/\/+$/, '') ??
        'http://localhost:7778'
    );
}

export async function logHyperNexusDecision(input: MemoryRecordInput): Promise<{ ok: boolean; detail?: string }> {
    const baseUrl = getCoreBaseUrl().replace(/\/+$/, '');
    const payload = {
        content: `${input.title}\n\n${input.content}`,
        type: input.type ?? 'decision',
        namespace: input.namespace ?? 'architecture',
        tags: input.tags ?? ['auth', 'architecture'],
    };

    const endpoints = [
        `${baseUrl}/api/memory/observations/record`,
        `${baseUrl}/api/memory/facts/add`,
        `${baseUrl}/api/memory/add`,
    ];

    for (const endpoint of endpoints) {
        try {
            const body =
                endpoint.endsWith('/api/memory/add')
                    ? { content: payload.content }
                    : endpoint.endsWith('/facts/add')
                      ? { content: payload.content, type: payload.type }
                      : {
                            content: payload.content,
                            type: payload.type,
                            namespace: payload.namespace,
                            tags: payload.tags,
                        };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(5000),
            });

            if (response.ok) {
                return { ok: true, detail: endpoint };
            }
        } catch {
            // Try the next endpoint.
        }
    }

    return { ok: false, detail: 'HyperNexus memory endpoints were unreachable.' };
}
