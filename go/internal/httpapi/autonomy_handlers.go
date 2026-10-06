package httpapi

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
)

func (s *Server) localAutonomyPath() string {
	return filepath.Join(s.cfg.WorkspaceRoot, ".hypernexus", "autonomy.json")
}

func (s *Server) localAutonomyGet() map[string]any {
	raw, err := os.ReadFile(s.localAutonomyPath())
	if err != nil {
		return map[string]any{"level": "MEDIUM", "fullAutonomy": false}
	}
	var parsed map[string]any
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return map[string]any{"level": "MEDIUM", "fullAutonomy": false}
	}
	return parsed
}

func (s *Server) localAutonomySet(data map[string]any) {
	os.MkdirAll(filepath.Dir(s.localAutonomyPath()), 0o755)
	out, _ := json.MarshalIndent(data, "", "  ")
	os.WriteFile(s.localAutonomyPath(), out, 0o644)
}

func (s *Server) handleAutonomyGetLevel(w http.ResponseWriter, r *http.Request) {
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "autonomy.getLevel", nil, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{"upstreamBase": upstreamBase, "procedure": "autonomy.getLevel"},
		})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    s.localAutonomyGet(),
		"bridge":  map[string]any{"fallback": "go-local-autonomy", "procedure": "autonomy.getLevel", "reason": "upstream unavailable; using local autonomy level"},
	})
}

func (s *Server) handleAutonomySetLevel(w http.ResponseWriter, r *http.Request) {
	var payload map[string]any
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
		return
	}
	if upstreamBase, err := s.callUpstreamJSON(r.Context(), "autonomy.setLevel", payload, new(any)); err == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "bridge": map[string]any{"upstreamBase": upstreamBase, "procedure": "autonomy.setLevel"}})
		return
	}
	level := fmt.Sprint(payload["level"])
	state := s.localAutonomyGet()
	state["level"] = level
	s.localAutonomySet(state)
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    map[string]any{"level": level},
		"bridge":  map[string]any{"fallback": "go-local-autonomy", "procedure": "autonomy.setLevel", "reason": "upstream unavailable; saved autonomy level locally"},
	})
}

func (s *Server) handleAutonomyActivateFull(w http.ResponseWriter, r *http.Request) {
	var payload map[string]any
	_ = json.NewDecoder(r.Body).Decode(&payload)
	if upstreamBase, err := s.callUpstreamJSON(r.Context(), "autonomy.activateFullAutonomy", payload, new(any)); err == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "bridge": map[string]any{"upstreamBase": upstreamBase, "procedure": "autonomy.activateFullAutonomy"}})
		return
	}
	state := s.localAutonomyGet()
	state["level"] = "HIGH"
	state["fullAutonomy"] = true
	s.localAutonomySet(state)
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    map[string]any{"level": "HIGH", "fullAutonomy": true},
		"bridge":  map[string]any{"fallback": "go-local-autonomy", "procedure": "autonomy.activateFullAutonomy", "reason": "upstream unavailable; activated full autonomy locally"},
	})
}
