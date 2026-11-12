import shutil
p = r"C:\Users\hyper\workspace\HyperNexus\go\internal\httpapi\mcp_handlers.go"
src = open(p, encoding="utf-8").read()

old = '''	if view, invErr := s.localMCPInventoryView(); invErr == nil && view != nil && view.Inventory != nil {
		for _, t := range view.Inventory.Tools {
			n, _ := t["name"].(string)
			if n != "" && !seen[n] {
				seen[n] = true
				toolCount++
			}
		}
	}'''

new = '''	if view, invErr := s.localMCPInventoryView(); invErr == nil && view != nil && view.Inventory != nil {
		for _, t := range view.Inventory.Tools {
			if t.Name != "" && !seen[t.Name] {
				seen[t.Name] = true
				toolCount++
			}
		}
	}'''

if old not in src:
    print("ANCHOR NOT FOUND")
else:
    src = src.replace(old, new, 1)
    tmp = p + ".tmp"
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        f.write(src)
    shutil.move(tmp, p)
    print("PATCHED OK")
