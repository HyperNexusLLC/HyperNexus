import re
p = r"C:\Users\hyper\workspace\HyperNexus\addons\pi\hypernexus.ts"
s = open(p, encoding="utf-8", errors="replace").read()
for kw in ["ping", "echo", "setInterval", "setTimeout", "keepalive", "heartbeat"]:
    found = False
    for m in re.finditer(kw, s, re.I):
        line = s[:m.start()].count("\n") + 1
        snippet = s[max(0, m.start()-50):m.end()+50].replace("\n", " ")
        print(f"{line}: [{kw}] ...{snippet}...")
        found = True
        break
    if not found:
        print(f"-: [{kw}] not found")
