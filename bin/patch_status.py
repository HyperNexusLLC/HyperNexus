import io, shutil
p = r"C:\Users\hyper\workspace\HyperNexus\go\internal\httpapi\mcp_handlers.go"
src = open(p, encoding="utf-8").read()

old = '''	// Count live Aggregator connections (alwaysOn stdio servers)
	aggCount := 0
	if s.mcpAggregator != nil {
		aggCount = s.mcpAggregator.ConnectedCount()
	}
	return map[string]any{
		"success": true,
		"data": map[string]any{
			"initialized":              true,
			"connected":                summary.SourceBackedHarnessCount > 0 || aggCount > 0,
			"toolCount":                summary.SourceBackedToolCount,
			"serverCount":              summary.InstalledHarnessCount,
			"connectedCount":           summary.SourceBackedHarnessCount + aggCount,
			"sourceBackedHarnessCount": summary.SourceBackedHarnessCount,
			"aggregatorConnectedCount": aggCount,
			"source":                   "source-backed-local-summary",
			"lazySessionMode":          false,
			"singleActiveServerMode":   false,
		},'''

new = '''	// Count live Aggregator connections (alwaysOn stdio servers)
	aggCount := 0
	if s.mcpAggregator != nil {
		aggCount = s.mcpAggregator.ConnectedCount()
	}
	// Use inventory tool count (matches /api/mcp/tools) rather than harness SourceBackedToolCount
	toolCount := summary.SourceBackedToolCount
	if view, invErr := s.localMCPInventoryView(); invErr == nil && view != nil && view.Inventory != nil {
		if n := len(view.Inventory.Tools); n > toolCount {
			toolCount = n
		}
	}
	return map[string]any{
		"success": true,
		"data": map[string]any{
			"initialized":              true,
			"connected":                summary.SourceBackedHarnessCount > 0 || aggCount > 0 || toolCount > 0,
			"toolCount":                toolCount,
			"serverCount":              summary.InstalledHarnessCount,
			"connectedCount":           summary.SourceBackedHarnessCount + aggCount,
			"sourceBackedHarnessCount": summary.SourceBackedHarnessCount,
			"aggregatorConnectedCount": aggCount,
			"source":                   "inventory-aware-local-summary",
			"lazySessionMode":          false,
			"singleActiveServerMode":   false,
		},'''

if old not in src:
    print("ANCHOR NOT FOUND - checking nearby text")
    idx = src.find("Count live Aggregator")
    print(repr(src[idx:idx+200]))
else:
    src = src.replace(old, new, 1)
    tmp = p + ".tmp"
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        f.write(src)
    shutil.copy2(p, p + ".bak")
    shutil.move(tmp, p)
    print("PATCHED OK")
