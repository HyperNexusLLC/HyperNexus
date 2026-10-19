import io
p = r"C:\Users\hyper\workspace\HyperNexus\addons\pi\hypernexus.ts"
s = io.open(p, encoding="utf-8", errors="replace").read()
i = s.find("const key = match.replace")
print(s[i-400:i+800])
