package httpapi

import (
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// harnessReport is one addon's integration surface as found on disk.
// It mirrors what the per-harness batteries assert hermetically: layout only,
// no battery execution and no kernel calls, so the endpoint stays fast.
type harnessReport struct {
	Name       string `json:"name"`
	Install    bool   `json:"install"`
	Battery    bool   `json:"battery"`
	MetaDoc    bool   `json:"metaDoc"`
	McpConfig  bool   `json:"mcpConfig"`
	Swarm      bool   `json:"swarm"`
	Connection bool   `json:"connection"`
	Status     string `json:"status"` // ok | partial
}

func scanHarnessAddons(addonsDir string) []harnessReport {
	entries, err := os.ReadDir(addonsDir)
	if err != nil {
		return []harnessReport{}
	}
	reports := []harnessReport{}
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		dir := filepath.Join(addonsDir, e.Name())
		has := func(patterns ...string) bool {
			for _, pat := range patterns {
				matches, _ := filepath.Glob(filepath.Join(dir, pat))
				if len(matches) > 0 {
					return true
				}
			}
			return false
		}
		r := harnessReport{
			Name:       e.Name(),
			Install:    has("install.mjs", "install.py", "install.ps1"),
			Battery:    has("bin/test-*-ext.mjs", "bin/test-*.mjs"),
			MetaDoc:    has("meta-model.*"),
			McpConfig:  has("mcp.json", "mcp.*.json", "mcp.*.snippet", "mcp.*.toml"),
			Swarm:      has("swarm-prompt-block.md", "swarm.mjs", "skills/hn-swarm/SKILL.md", "agent/swarm-leader.md"),
			Connection: has("connection.json"),
		}
		if r.Install && r.MetaDoc {
			r.Status = "ok"
		} else {
			r.Status = "partial"
		}
		reports = append(reports, r)
	}
	sort.Slice(reports, func(i, j int) bool { return reports[i].Name < reports[j].Name })
	return reports
}

func (s *Server) handleHarnessDoctor(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
		return
	}
	reports := scanHarnessAddons(filepath.Join(s.cfg.WorkspaceRoot, "addons"))
	ok, partial := 0, 0
	for _, rep := range reports {
		if rep.Status == "ok" {
			ok++
		} else {
			partial++
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"harnesses": reports,
			"counts":    map[string]any{"total": len(reports), "ok": ok, "partial": partial},
			"note":      strings.TrimSpace("layout scan only; run addons/<h>/bin/test-*-ext.mjs for battery verdicts"),
		},
	})
}
