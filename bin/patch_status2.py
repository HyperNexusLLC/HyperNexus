import io, shutil
p = r"C:\Users\hyper\workspace\HyperNexus\go\internal\httpapi\mcp_handlers.go"
src = open(p, encoding="utf-8").read()

old = '''	// Use inventory tool count (matches /api/mcp/tools) rather than harness SourceBackedToolCount
	toolCount := summary.SourceBackedToolCount
	if view, invErr := s.localMCPInventoryView(); invErr == nil && view != nil && view.Inventory != nil {
		if n := len(view.Inventory.Tools); n > toolCount {
			toolCount = n
		}
	}'''

new = '''	// Use live tool count from the same source as /api/mcp/tools (upstream listTools + accessory merge)
	toolCount := summary.SourceBackedToolCount
	var upstreamTools any
	if _, upErr := s.callUpstreamJSON(ctx, "mcp.listTools", nil, &upstreamTools); upErr == nil {
		var tl []map[string]any
		if b, mErr := json.Marshal(upstreamTools); mErr == nil {
			_ = json.Unmarshal(b, &tl)
		}
		tl = s.mergeAccessoryTools(tl)
		if n := len(tl); n > toolCount {
			toolCount = n
		}
	} else if view, invErr := s.localMCPInventoryView(); invErr == nil && view != nil && view.Inventory != nil {
		if n := len(view.Inventory.Tools); n > toolCount {
			toolCount = n
		}
	}'''

if old not in src:
    print("ANCHOR NOT FOUND")
    idx = src.find("Use inventory tool count")
    if idx >= 0:
        print(repr(src[idx:idx+300]))
    else:
        print("marker not found at all")
else:
    src = src.replace(old, new, 1)
    tmp = p + ".tmp"
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        f.write(src)
    shutil.move(tmp, p)
    print("PATCHED OK")
