import io, os, shutil

src = r"C:\Users\hyper\workspace\HyperNexus\addons\pi\hypernexus.ts"
dst = r"C:\Users\hyper\.pi\agent\extensions\hypernexus.ts"
bak = src + ".bak2"

s = io.open(src, encoding="utf-8", errors="replace").read()
print("loaded", len(s))
shutil.copy2(src, bak)

# --- input hook: @memory:key expansion does a blocking search ---
a = s.find('@memory:')
print("@memory: at", a)
# find the tnFetch with memory/search after that
b = s.find("/api/memory/search?q=${encodeURIComponent(key)}", a)
print("key search at", b)
if b > 0:
    t = s.rfind("try {", a, b)
    c = s.find("} catch {", b)
    print("try", t, "catch", c)
    if t > 0 and c > t:
        close = s.find("}", c + 10)
        end = close + 1
        new_in = (
"// Non-blocking: @memory expansion must not stall input handling.\n"
"      const body = await tnFetchFastJson(`/api/memory/search?q=${encodeURIComponent(key)}&limit=3`, ctx.signal);\n"
"      const memories = body?.data ?? [];\n"
"      const context = (Array.isArray(memories) ? memories : []).map((m: any) => (m.content ?? m.text ?? \"\").slice(0, 150)).filter(Boolean).join(\"\\n\");"
        )
        s = s[:t] + new_in + s[end:]
        print("input hook replaced")

io.open(src, "w", encoding="utf-8", newline="\n").write(s)
print("src len", len(s))
shutil.copy2(src, dst)
print("synced to .pi copy")
for p in [src, dst]:
    z = io.open(p, encoding="utf-8", errors="replace").read()
    print(p, len(z), "TN_FAST" in z, "registerTool" in z)
