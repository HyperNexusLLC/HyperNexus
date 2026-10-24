import shutil
p = r"C:\Users\hyper\workspace\HyperNexus\go\internal\httpapi\mcp_handlers.go"
src = open(p, encoding="utf-8").read()

old = '''	// Use live tool count matching /api/mcp/tools (accessory registry + inventory)
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

new = '''	// Use live tool count matching /api/mcp/tools (built-in registry + native tools + inventory)
	toolCount := summary.SourceBackedToolCount
	seen := make(map[string]bool)
	registry := roottools.NewRegistry()
	if registry != nil {
		for _, t := range registry.Tools {
			if !seen[t.Name] {
				seen[t.Name] = true
				toolCount++
			}
		}
	}
	if s.toolsRegistry != nil {
		for _, name := range s.toolsRegistry.List() {
			if !seen[name] {
				seen[name] = true
				toolCount++
			}
		}
	}
	if view, invErr := s.localMCPInventoryView(); invErr == nil && view != nil && view.Inventory != nil {
		for _, t := range view.Inventory.Tools {
			n, _ := t["name"].(string)
			if n != "" && !seen[n] {
				seen[n] = true
				toolCount++
			}
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
