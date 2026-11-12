p = r"C:\Users\hyper\workspace\HyperNexus\addons\pi\hypernexus.ts"
src = open(p, encoding="utf-8").read()
lines = src.split("\n")
# Find all pi.registerTool calls
for i, line in enumerate(lines, 1):
    if "pi.registerTool" in line or "pi.registerCommand" in line or "pi.registerShortcut" in line or "pi.registerFlag" in line or "pi.on(" in line:
        print(f"{i}: {line.strip()}")
