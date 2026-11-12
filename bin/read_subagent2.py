p = r"C:\Users\hyper\workspace\HyperNexus\addons\pi\hypernexus.ts"
src = open(p, encoding="utf-8").read()
lines = src.split("\n")
# Find hypernexus_subagent
for i, line in enumerate(lines, 1):
    if "hypernexus_subagent" in line and "name:" in line:
        for j in range(i-1, min(i+50, len(lines))):
            print(f"{j+1}: {lines[j]}")
        break
