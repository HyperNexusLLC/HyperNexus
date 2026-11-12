import shutil
p = r"C:\Users\hyper\workspace\HyperNexus\go\internal\httpapi\mcp_handlers.go"
src = open(p, encoding="utf-8").read()

old = '''	// Use live tool count matching /api/mcp/tools (built-in registry + native tools + inventory)
	toolCount := summary.SourceBackedToolCount
	seen := make(map[string]bool)'''

new = '''	// Use live tool count matching /api/mcp/tools (built-in registry + native tools + inventory)
	toolCount := 0
	seen := make(map[string]bool)'''

if old not in src:
    print("ANCHOR NOT FOUND")
else:
    src = src.replace(old, new, 1)
    tmp = p + ".tmp"
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        f.write(src)
    shutil.move(tmp, p)
    print("PATCHED OK")
