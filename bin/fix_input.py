import io, shutil
p = r"C:\Users\hyper\workspace\HyperNexus\addons\pi\hypernexus.ts"
dst = r"C:\Users\hyper\.pi\agent\extensions\hypernexus.ts"
s = io.open(p, encoding="utf-8", errors="replace").read()

old = """      const context = (Array.isArray(memories) ? memories : []).map((m: any) => (m.content ?? m.text ?? "").slice(0, 150)).filter(Boolean).join("\\n");
    }"""
new = """      const context = (Array.isArray(memories) ? memories : []).map((m: any) => (m.content ?? m.text ?? "").slice(0, 150)).filter(Boolean).join("\\n");
      if (context) {
        // Inline the recalled memory in place of the @memory:key token.
        expanded = expanded.replace(match, `\\n[TN Memory ${key}]: ${context}\\n`);
      }
    }"""
if old not in s:
    print("FAIL: pattern not found")
    raise SystemExit(1)
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
shutil.copy2(p, dst)
print("patched + synced", len(s))
z = io.open(p, encoding="utf-8", errors="replace").read()
print("has expand:", "Inline the recalled memory" in z)
