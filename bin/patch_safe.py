import io, os, re, shutil

src = r"C:\Users\hyper\workspace\HyperNexus\addons\pi\hypernexus.ts"
bak = src + ".bak"
tmp = src + ".tmp"

s = io.open(src, encoding="utf-8", errors="replace").read()
print("loaded", len(s), "chars")
if os.path.exists(bak):
    os.remove(bak)
shutil.copy2(src, bak)
print("backup ok")

# --- 1) helpers ---
i = s.find("const TN_TIMEOUT_MS")
print("TN_TIMEOUT_MS at", i)
j = s.find("return fetch(", i)
print("return fetch at", j)
k = s.find("\n}", j)
print("end brace at", k)
if i < 0 or j < 0 or k < 0:
    print("FAIL anchors"); raise SystemExit(1)

old_block = s[i:k+2]
print("OLD BLOCK REPR:", repr(old_block[:200]))

new_block = (
"const TN_TIMEOUT_MS = 2500;\n"
"// Hot-path hooks (before_agent_start / context / input) must never stall a turn.\n"
"// /api/memory/search can take 6s+ when Ollama is slow, so these use a much\n"
"// tighter budget and simply return no context rather than block.\n"
"const TN_FAST_TIMEOUT_MS = 400;\n"
"function tnFetchWithTimeout(path: string, timeoutMs: number, init?: RequestInit, signal?: AbortSignal) {\n"
"  let s: AbortSignal | undefined;\n"
"  try {\n"
"    const t = AbortSignal.timeout(timeoutMs);\n"
"    s = signal ? AbortSignal.any([signal, t]) : t;\n"
"  } catch {\n"
"    s = signal;\n"
"  }\n"
"  return fetch(`${TN_BASE}${path}`, { ...init, signal: s });\n"
"}\n"
"function tnFetch(path: string, init?: RequestInit, signal?: AbortSignal) {\n"
"  return tnFetchWithTimeout(path, TN_TIMEOUT_MS, init, signal);\n"
"}\n"
"// Non-blocking lookup: resolves to null on any failure/timeout instead of throwing.\n"
"async function tnFetchFastJson(path: string, signal?: AbortSignal): Promise<any | null> {\n"
"  try {\n"
"    const r = await tnFetchWithTimeout(path, TN_FAST_TIMEOUT_MS, {}, signal);\n"
"    if (!r.ok) return null;\n"
"    return await r.json();\n"
"  } catch { return null; }\n"
"}"
)
s = s[:i] + new_block + s[k+2:]
print("helpers replaced")

# --- 2) before_agent_start subsequent-turn branch ---
# Locate by ASCII anchor: the !isFirstTurn early-return path
a = s.find("const isFirstTurn")
print("isFirstTurn at", a)
# subsequent-turn search is the first event.prompt.slice after that
b = s.find("event.prompt.slice(0, 100)", a)
print("prompt.slice at", b)
# find "try {" just before b
t = s.rfind("try {", a, b)
print("try at", t)
# find the catch that ends this try
c = s.find("} catch {", b)
print("catch at", c)
# find "return;" after catch
r = s.find("return;", c)
print("return at", r)
if t > 0 and c > t and r > c:
    end = r + len("return;")
    new_sub = (
"// Fast path: never stall the turn waiting on the kernel.\n"
"      const body = await tnFetchFastJson(`/api/memory/search?q=${encodeURIComponent(event.prompt.slice(0, 100))}`, ctx.signal);\n"
"      const memories = body?.data ?? [];\n"
"      if (Array.isArray(memories) && memories.length > 0) {\n"
"        const contextBlock = memories.slice(0, 3)\n"
"          .map((m: any) => `  - ${(m.content ?? m.text ?? JSON.stringify(m)).slice(0, 200)}`)\n"
"          .join(\"\\n\");\n"
"        return { systemPrompt: `${event.systemPrompt}\\n\\n## Relevant Context from HyperNexus L2\\n${contextBlock}` };\n"
"      }\n"
"      return;"
    )
    s = s[:t] + new_sub + s[end:]
    print("subsequent-turn branch replaced")

# --- 3) context hook ---
# Find the userText.length check then the try block
u = s.find("userText.length < 10")
print("userText.length at", u)
t2 = s.find("try {", u)
print("try2 at", t2)
c2 = s.find("} catch {", t2)
print("catch2 at", c2)
if t2 > 0 and c2 > t2:
    end2 = c2 + len("} catch { /* skip */ }")
    # be tolerant: find the real end of the catch block
    close = s.find("}", c2 + 10)
    end2 = close + 1
    new_ctx = (
"// Non-blocking: a slow kernel must not delay the model call.\n"
"    const body = await tnFetchFastJson(`/api/memory/search?q=${encodeURIComponent(userText.slice(0, 100))}`, ctx.signal);\n"
"    const memories = body?.data ?? [];\n"
"    if (!Array.isArray(memories) || memories.length === 0) return;\n"
"\n"
"    const top = memories.slice(0, 2);\n"
"    const contextBlock = top.map((m: any) => (m.content ?? m.text ?? JSON.stringify(m)).slice(0, 150)).filter(Boolean).join(\"\\n\");\n"
"    if (!contextBlock) return;\n"
"\n"
"    event.messages.push({ role: \"system\", content: `[TN Context]: ${contextBlock}` });"
    )
    s = s[:t2] + new_ctx + s[end2:]
    print("context hook replaced")

# write to tmp, verify, then move
io.open(tmp, "w", encoding="utf-8", newline="\n").write(s)
check = io.open(tmp, encoding="utf-8", errors="replace").read()
print("tmp len", len(check))
for kw in ["TN_FAST_TIMEOUT_MS", "tnFetchFastJson", "registerTool", "const TN_BASE"]:
    print("  ", kw, "->", check.find(kw))
assert check.find("TN_FAST_TIMEOUT_MS") > 0
assert check.find("registerTool") > 0
shutil.move(tmp, src)
print("MOVED OK, final len", len(io.open(src, encoding="utf-8", errors="replace").read()))
