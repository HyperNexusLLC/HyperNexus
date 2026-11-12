p = r"C:\Users\hyper\workspace\HyperNexus\addons\pi\hypernexus.ts"
src = open(p, encoding="utf-8").read()
lines = src.split("\n")
# Print lines 700-770 (hypernexus_subagent tool)
for i in range(699, min(770, len(lines))):
    print(f"{i+1}: {lines[i]}")
