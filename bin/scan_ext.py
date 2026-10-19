import re
p = r"C:\Users\hyper\workspace\HyperNexus\addons\pi\hypernexus.ts"
s = open(p, encoding="utf-8", errors="replace").read()
print("=== HOOKS ===")
for m in re.finditer(r'pi\.on\("([^"]+)"', s):
    print(" ", m.group(1))
print("=== TOOLS ===")
for m in re.finditer(r'registerTool\(\{\s*name:\s*"([^"]+)"', s):
    print(" ", m.group(1))
print("=== COMMANDS ===")
for m in re.finditer(r'registerCommand\("([^"]+)"', s):
    print(" ", m.group(1))
print("=== SHORTCUTS ===")
for m in re.finditer(r'registerShortcut\("([^"]+)"', s):
    print(" ", m.group(1))
print("=== EVENTS ===")
for m in re.finditer(r'pi\.events\.(on|emit)\("([^"]+)"', s):
    print(" ", m.group(1), m.group(2))
print("=== OTHER pi.* calls ===")
seen = set()
for m in re.finditer(r'pi\.([a-zA-Z_.]+)', s):
    k = m.group(1)
    if k not in seen:
        seen.add(k)
        print(" ", k)
