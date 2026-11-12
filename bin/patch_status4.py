import shutil
p = r"C:\Users\hyper\workspace\HyperNexus\go\internal\httpapi\mcp_handlers.go"
src = open(p, encoding="utf-8").read()

old = '''	// Use live tool count from the same source as /api/mcp/tools
	toolCount := summary.SourceBackedToolCount
	var baseTools []map[string]any
	if view, invErr := s.localMCPInventoryView(); invErr == nil && view != nil && view.Inventory != nil {
		baseTools = fallbackMCPInventoryTools(view)
	}
	merged := s.mergeAccessoryTools(baseTools)
	if n := len(merged); n > toolCount {
		toolCount = n
	}'''

new = '''	// Use live tool count matching /api/mcp/tools (accessory registry + inventory)
	toolCount := summary.SourceBackedToolCount
	registry := roottools.NewRegistry()
	if registry != nil && len(registry.Tools) > toolCount {
		toolCount = len(registry.Tools)
	}
	if view, invErr := s.localMCPInventoryView(); invErr == nil && view != nil && view.Inventory != nil {
		if n := len(view.Inventory.Tools); n > toolCount {
			toolCount = n
		}
	}'''

if old not in src:
    print("ANCHOR NOT FOUND")
    idx = src.find("Use live tool count")
    if idx >= 0:
        print(repr(src[idx:idx+200]))
    else:
        print("marker gone")
else:
    src = src.replace(old, new, 1)
    tmp = p + ".tmp"
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        f.write(src)
    shutil.move(tmp, p)
    print("PATCHED OK")
