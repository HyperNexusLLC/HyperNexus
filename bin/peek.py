import io
p = r"C:\Users\hyper\workspace\HyperNexus\addons\pi\hypernexus.ts"
s = io.open(p, encoding="utf-8", errors="replace").read()
i = s.find("TN_TIMEOUT_MS")
print("TN_TIMEOUT_MS at", i)
print(repr(s[i-80:i+600]))
