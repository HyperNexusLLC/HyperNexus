import io, os
for p in [r"C:\Users\hyper\workspace\HyperNexus\addons\pi\hypernexus.ts",
          r"C:\Users\hyper\.pi\agent\extensions\hypernexus.ts"]:
    try:
        s = io.open(p, encoding="utf-8", errors="replace").read()
        print(p, "LEN", len(s))
        for kw in ["TN_TIMEOUT_MS", "tnFetchFastJson", "TN_FAST_TIMEOUT_MS", "const TN_BASE", "registerTool", "exposure"]:
            print("  ", kw, "->", s.find(kw))
    except Exception as e:
        print(p, "ERR", e)
