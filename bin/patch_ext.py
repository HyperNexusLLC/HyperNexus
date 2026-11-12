import io, sys
p = r"C:\Users\hyper\workspace\HyperNexus\addons\pi\hypernexus.ts"
s = io.open(p, encoding="utf-8", errors="replace").read()
orig = len(s)

# 1) Add a fast-path timeout + fetch helper after TN_TIMEOUT_MS block
old_helpers = '''const TN_TIMEOUT_MS = 2500;
function tnFetch(path: string, init?: RequestInit, signal?: AbortSignal) {
  let s: AbortSignal | undefined;
  try {
    const t = AbortSignal.timeout(TN_TIMEOUT_MS);
    s = signal ? AbortSignal.any([signal, t]) : t;
  } catch {
    s = signal;
  }
  return fetch(`${TN_BASE}${path}`, { ...init, signal: s });
}'''

new_helpers = '''const TN_TIMEOUT_MS = 2500;
// Hot-path hooks (before_agent_start / context / input) must never stall a turn.
// /api/memory/search can take 6s+ when Ollama is slow, so these use a much
// tighter budget and simply return no context rather than block.
const TN_FAST_TIMEOUT_MS = 400;
function tnFetchWithTimeout(path: string, timeoutMs: number, init?: RequestInit, signal?: AbortSignal) {
  let s: AbortSignal | undefined;
  try {
    const t = AbortSignal.timeout(timeoutMs);
    s = signal ? AbortSignal.any([signal, t]) : t;
  } catch {
    s = signal;
  }
  return fetch(`${TN_BASE}${path}`, { ...init, signal: s });
}
function tnFetch(path: string, init?: RequestInit, signal?: AbortSignal) {
  return tnFetchWithTimeout(path, TN_TIMEOUT_MS, init, signal);
}
// Non-blocking lookup: resolves to null on any failure/timeout instead of throwing.
async function tnFetchFastJson(path: string, signal?: AbortSignal): Promise<any | null> {
  try {
    const r = await tnFetchWithTimeout(path, TN_FAST_TIMEOUT_MS, {}, signal);
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}'''

if old_helpers not in s:
    print("FAIL: helpers block not found")
    sys.exit(1)
s = s.replace(old_helpers, new_helpers, 1)

# 2) before_agent_start: use fast non-blocking lookup for both branches
# Subsequent-turn branch
old_sub = '''      try {
        const res = await tnFetch(`/api/memory/search?q=${encodeURIComponent(event.prompt.slice(0, 100))}`, {}, ctx.signal);
        if (res.ok) {
          const body = await res.json();
          const memories = body.data ?? [];
          if (Array.isArray(memories) && memories.length > 0) {
            const contextBlock = memories.slice(0, 3)
              .map((m: any) => `  - ${(m.content ?? m.text ?? JSON.stringify(m)).slice(0, 200)}`)
              .join("\\n");
            return { systemPrompt: `${event.systemPrompt}\\n\\n## Relevant Context from HyperNexus L2\\n${contextBlock}` };
          }
        }
      } catch { /* skip */ }
      return;'''
new_sub = '''      // Fast path: never stall the turn waiting on the kernel.
      const body = await tnFetchFastJson(`/api/memory/search?q=${encodeURIComponent(event.prompt.slice(0, 100))}`, ctx.signal);
      const memories = body?.data ?? [];
      if (Array.isArray(memories) && memories.length > 0) {
        const contextBlock = memories.slice(0, 3)
          .map((m: any) => `  - ${(m.content ?? m.text ?? JSON.stringify(m)).slice(0, 200)}`)
          .join("\\n");
        return { systemPrompt: `${event.systemPrompt}\\n\\n## Relevant Context from HyperNexus L2\\n${contextBlock}` };
      }
      return;'''
if old_sub in s:
    s = s.replace(old_sub, new_sub, 1)
    print("patched: before_agent_start subsequent-turn branch")
else:
    print("WARN: subsequent-turn branch not found (encoding drift?)")

# 3) context hook: non-blocking
old_ctx = '''    try {
      const res = await tnFetch(`/api/memory/search?q=${encodeURIComponent(userText.slice(0, 100))}`, {}, ctx.signal);
      if (!res.ok) return;
      const body = await res.json();
      const memories = body.data ?? [];
      if (!Array.isArray(memories) || memories.length === 0) return;

      const top = memories.slice(0, 2);
      const contextBlock = top.map((m: any) => (m.content ?? m.text ?? JSON.stringify(m)).slice(0, 150)).filter(Boolean).join("\\n");
      if (!contextBlock) return;

      event.messages.push({ role: "system", content: `[TN Context]: ${contextBlock}` });
    } catch { /* skip */ }'''
new_ctx = '''    // Non-blocking: a slow kernel must not delay the model call.
    const body = await tnFetchFastJson(`/api/memory/search?q=${encodeURIComponent(userText.slice(0, 100))}`, ctx.signal);
    const memories = body?.data ?? [];
    if (!Array.isArray(memories) || memories.length === 0) return;

    const top = memories.slice(0, 2);
    const contextBlock = top.map((m: any) => (m.content ?? m.text ?? JSON.stringify(m)).slice(0, 150)).filter(Boolean).join("\\n");
    if (!contextBlock) return;

    event.messages.push({ role: "system", content: `[TN Context]: ${contextBlock}` });'''
if old_ctx in s:
    s = s.replace(old_ctx, new_ctx, 1)
    print("patched: context hook")
else:
    print("WARN: context hook block not found")

io.open(p, "w", encoding="utf-8", newline="\\n").write(s)
print(f"DONE: {orig} -> {len(s)} bytes")
