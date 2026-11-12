import io, shutil
p = r"C:\Users\hyper\workspace\HyperNexus\addons\pi\hypernexus.ts"
dst = r"C:\Users\hyper\.pi\agent\extensions\hypernexus.ts"
s = io.open(p, encoding="utf-8", errors="replace").read()
old = 'pi.on("session_start", (_event, ctx) => {'
new = 'pi.on("session_start", async (_event, ctx) => {'
if old in s:
    s = s.replace(old, new, 1)
    print("made session_start async")
else:
    print("pattern not found:", s.count("pi.on(\"session_start\""))
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
shutil.copy2(p, dst)
print("synced", len(s))
