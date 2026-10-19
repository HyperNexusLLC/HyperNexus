import io
p = r"C:\Users\hyper\workspace\HyperNexus\addons\pi\hypernexus.ts"
s = io.open(p, encoding="utf-8", errors="replace").read()
# Show the three patched regions
for label, kw in [("HELPERS", "TN_FAST_TIMEOUT_MS"), ("SUBSEQUENT", "Fast path: never stall"), ("CONTEXT", "Non-blocking: a slow kernel"), ("INPUT", "@memory expansion must not stall")]:
    i = s.find(kw)
    print("="*20, label, "at", i)
    if i > 0:
        print(s[i-80:i+500])
        print()
