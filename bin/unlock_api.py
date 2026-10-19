import io, re, shutil

p = r"C:\Users\hyper\workspace\HyperNexus\addons\pi\hypernexus.ts"
dst = r"C:\Users\hyper\.pi\agent\extensions\hypernexus.ts"
s = io.open(p, encoding="utf-8", errors="replace").read()

# Namespace + exposure + annotations per tool.
# "deferred" keeps rarely used tools out of the model context (found via tool search) -
# this is the progressive tool-routing direction (50K -> 5K tokens).
# "codemode" makes them callable from codemode scripts.
meta = {
  "hypernexus_memory_store":        dict(expo="direct",   ro=False, dest=False, idem=False, openw=False),
  "hypernexus_memory_search":       dict(expo="direct",   ro=True,  dest=False, idem=True,  openw=False),
  "hypernexus_memory_vector_search":dict(expo="direct",   ro=True,  dest=False, idem=True,  openw=False),
  "hypernexus_tool_search":         dict(expo="direct",   ro=True,  dest=False, idem=True,  openw=False),
  "hypernexus_session_search":      dict(expo="deferred", ro=True,  dest=False, idem=True,  openw=False),
  "hypernexus_skill_manage":        dict(expo="deferred", ro=False, dest=True,  idem=False, openw=False),
  "hypernexus_code_search":         dict(expo="deferred", ro=True,  dest=False, idem=True,  openw=False),
  "hypernexus_context_harvest":     dict(expo="deferred", ro=True,  dest=False, idem=True,  openw=False),
  "hypernexus_scratchpad":          dict(expo="codemode", ro=False, dest=False, idem=False, openw=False),
  "hypernexus_subagent":            dict(expo="deferred", ro=False, dest=False, idem=False, openw=False),
}

count = 0
for name, m in meta.items():
    # Find the registerTool block for this name
    anchor = f'name: "{name}"'
    i = s.find(anchor)
    if i < 0:
        print("MISS", name)
        continue
    # Insert namespace/exposure/annotations right after the description line.
    # Find the parameters: line after this point and insert before it.
    params_i = s.find("parameters: Type.Object", i)
    if params_i < 0:
        params_i = s.find("parameters:", i)
    if params_i < 0:
        print("NO PARAMS", name)
        continue
    insert = (
        f'namespace: {{ name: "mcp__hypernexus", description: "HyperNexus L2 memory, tool catalog, sessions, and skills" }},\n'
        f'    exposure: "{m["expo"]}",\n'
        f'    annotations: {{ readOnlyHint: {"true" if m["ro"] else "false"}, destructiveHint: {"true" if m["dest"] else "false"}, idempotentHint: {"true" if m["idem"] else "false"}, openWorldHint: {"true" if m["openw"] else "false"} }},\n'
        f'    '
    )
    s = s[:params_i] + insert + s[params_i:]
    count += 1
    print("OK", name, m["expo"])

print("patched", count, "tools")

# Also add a kernel-health status bar + working message on session_start
# Find the second session_start (the UI one at former line 1011)
idx = s.find('pi.on("session_start", (_event, ctx)')
print("ui session_start at", idx)
if idx > 0:
    brace = s.find("{", idx)
    s = s[:brace+1] + "\n    // Surface kernel reachability in the status bar so users see it immediately.\n    try {\n      const health = await tnFetchWithTimeout(\"/health\", 600);\n      if (health.ok) {\n        const h: any = await health.json().catch(() => ({}));\n        ctx.ui.setStatus(\"tn\", `HyperNexus v${h.version ?? \"?\"}`);\n        ctx.ui.setWorkingMessage(\"HyperNexus ready\");\n      } else {\n        ctx.ui.setStatus(\"tn\", \"HyperNexus degraded\");\n      }\n    } catch {\n      ctx.ui.setStatus(\"tn\", \"HyperNexus offline\");\n    }" + s[brace+1:]
    print("added kernel health status")

io.open(p, "w", encoding="utf-8", newline="\n").write(s)
shutil.copy2(p, dst)
print("synced", len(s))
z = io.open(p, encoding="utf-8", errors="replace").read()
print("namespace count:", z.count("mcp__hypernexus"))
print("exposure count:", z.count("exposure:"))
print("health status:", "HyperNexus offline" in z)
