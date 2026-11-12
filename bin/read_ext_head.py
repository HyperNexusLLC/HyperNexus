p = r"C:\Users\hyper\workspace\HyperNexus\addons\pi\hypernexus.ts"
src = open(p, encoding="utf-8").read()
# Get first 200 lines (imports, constants, helpers)
lines = src.split("\n")
for i, line in enumerate(lines[:120], 1):
    print(f"{i}: {line}")
