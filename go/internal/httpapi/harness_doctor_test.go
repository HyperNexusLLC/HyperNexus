package httpapi

import (
	"os"
	"path/filepath"
	"testing"
)

func TestScanHarnessAddons(t *testing.T) {
	root := t.TempDir()
	full := filepath.Join(root, "full")
	if err := os.MkdirAll(filepath.Join(full, "bin"), 0o755); err != nil {
		t.Fatal(err)
	}
	for _, f := range []string{"install.mjs", "meta-model.x.md", "mcp.json", "swarm-prompt-block.md", "bin/test-x-ext.mjs"} {
		if err := os.WriteFile(filepath.Join(full, f), []byte("x"), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	bare := filepath.Join(root, "bare")
	if err := os.MkdirAll(bare, 0o755); err != nil {
		t.Fatal(err)
	}
	reports := scanHarnessAddons(root)
	if len(reports) != 2 {
		t.Fatalf("reports = %d, want 2", len(reports))
	}
	byName := map[string]harnessReport{}
	for _, r := range reports {
		byName[r.Name] = r
	}
	if byName["full"].Status != "ok" || !byName["full"].Battery || !byName["full"].Swarm {
		t.Fatalf("full report wrong: %+v", byName["full"])
	}
	if byName["bare"].Status != "partial" {
		t.Fatalf("bare report wrong: %+v", byName["bare"])
	}
	if got := scanHarnessAddons(filepath.Join(root, "missing")); len(got) != 0 {
		t.Fatalf("missing dir = %v, want empty", got)
	}
}
