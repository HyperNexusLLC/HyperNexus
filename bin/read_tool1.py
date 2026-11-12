p = r"C:\Users\hyper\workspace\HyperNexus\addons\pi\hypernexus.ts"
src = open(p, encoding="utf-8").read()
lines = src.split("\n")
# Print lines 447-534 (first tool registration)
for i in range(446, min(534, len(lines))):
    print(f"{i+1}: {lines[i]}")
