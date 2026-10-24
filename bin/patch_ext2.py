import io, sys
p = r"C:\Users\hyper\workspace\HyperNexus\addons\pi\hypernexus.ts"
s = io.open(p, encoding="utf-8", errors="replace").read()
orig = len(s)

# 1) Helpers: add fast-path fetch (idempotent)
if "TN_FAST_TIMEOUT_MS" not in s:
    old_helpers = """const TN_TIMEOUT_MS = 2500;
function tnFetch(path: string, init?: RequestInit, signal?: AbortSignal) {
  let s: AbortSignal | undefined;
  try {
    const t = AbortSignal.timeout(TN_TIMEOUT_MS);
    s = signal ? AbortSignal.any([signal, t]) : t;
  } catch {
    s = signal;
  }
  return fetch(`${TN_BASE}${path}`, { ...init, signal: s });
}"""
    new_helpers = """const TN_TIMEOUT_MS = 2500;
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
}"""
    if old_helpers in s:
        s = s.replace(old_helpers, new_helpers, 1)
        print("patched: helpers")
    else:
        print("FAIL: helpers not found")
        sys.exit(1)
else:
    print("skip: helpers already patched")

# 2) before_agent_start subsequent-turn branch
# Match on ASCII-only anchors to dodge encoding drift in bullet chars
anchor = "const isFirstTurn = event.systemPrompt.includes"
idx = s.find(anchor)
print("isFirstTurn at", idx)

# Find the non-first-turn early return: the block that ends with "return;" after a memory search
# We look for the distinctive sequence: event.prompt.slice(0, 100)) in before_agent_start region
marker = 'event.prompt.slice(0, 100)'
positions = []
start = 0
while True:
    i = s.find(marker, start)
    if i < 0: break
    positions.append(i)
    start = i + 1
print("event.prompt.slice occurrences:", positions)

# The first occurrence after isFirstTurn is the subsequent-turn branch
if idx > 0 and positions:
    first_after = next((q for q in positions if q > idx), None)
    print("first after isFirstTurn:", first_after)
    if first_after:
        # Find the try { that starts this block: search backwards for "try {"
        trystart = s.rfind("try {", idx, first_after)
        print("try { at", trystart)
        # Find the matching return; after the catch: search forward for '} catch { /* skip */ }' then 'return;'
        catchend = s.find("} catch { /* skip */ }", first_after)
        print("catchend at", catchend)
        if trystart > 0 and catchend > trystart:
            retend = s.find("return;", catchend)
            print("return at", retend)
            if retend > catchend:
                block_end = retend + len("return;")
                old_block = s[trystart:block_end]
                new_block = """// Fast path: never stall the turn waiting on the kernel.
      const body = await tnFetchFastJson(`/api/memory/search?q=${encodeURIComponent(event.prompt.slice(0, 100))}`, ctx.signal);
      const memories = body?.data ?? [];
      if (Array.isArray(memories) && memories.length > 0) {
        const contextBlock = memories.slice(0, 3)
          .map((m: any) => `  - ${(m.content ?? m.text ?? JSON.stringify(m)).slice(0, 200)}`)
          .join("\\n");
        return { systemPrompt: `${event.systemPrompt}\\n\\n## Relevant Context from HyperNexus L2\\n${contextBlock}` };
      }
      return;"""
                s = s[:trystart] + new_block + s[block_end:]
                print("patched: before_agent_start subsequent-turn branch")

# 3) context hook non-blocking (already attempted in prior run - check)
if "tnFetchFastJson(`/api/memory/search?q=${encodeURIComponent(userText.slice(0, 100))}`" in s:
    print("skip: context hook already patched")
else:
    old_ctx_try = s.find("const userText = typeof lastUserMsg.content")
    if old_ctx_try > 0:
        # find the try block after userText
        t2 = s.find("try {", old_ctx_try)
        c2 = s.find("} catch { /* skip */ }", t2)
        if t2 > 0 and c2 > t2:
            old_ctx = s[t2:c2 + len("} catch { /* skip */ }")]
            new_ctx = """// Non-blocking: a slow kernel must not delay the model call.
    const body = await tnFetchFastJson(`/api/memory/search?q=${encodeURIComponent(userText.slice(0, 100))}`, ctx.signal);
    const memories = body?.data ?? [];
    if (!Array.isArray(memories) || memories.length === 0) return;

    const top = memories.slice(0, 2);
    const contextBlock = top.map((m: any) => (m.content ?? m.text ?? JSON.stringify(m)).slice(0, 150)).filter(Boolean).join("\\n");
    if (!contextBlock) return;

    event.messages.push({ role: "system", content: `[TN Context]: ${contextBlock}` });"""
            s = s[:t2] + new_ctx + s[c2 + len("} catch { /* skip */ }"):]
            print("patched: context hook")

io.open(p, "w", encoding="utf-8", newline="").write(s)
print(f"DONE: {orig} -> {len(s)} bytes")
