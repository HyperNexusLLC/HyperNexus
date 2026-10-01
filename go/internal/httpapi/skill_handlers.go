package httpapi

/**
 * @file skill_handlers.go
 * @module go/internal/httpapi
 *
 * WHAT: HTTP handlers for the Skill API.
 * Provides list, get, search, load, unload, and list-loaded endpoints over
 * orchestration.GlobalSkillRegistry plus an in-memory working set.
 *
 * WHY: External clients (tRPC, dashboard) need to query the assembled skill catalog
 * to discover agent capabilities and manage the active skill working set.
 */

import (
	"net/http"
	"strings"
	"sync"
	"time"

	"gitlab.com/HyperNexusLLC/HyperNexus/internal/orchestration"
)

// skillEntry is the JSON shape returned for a single skill.
type skillEntry struct {
	ID        string   `json:"id"`
	AgentURLs []string `json:"agent_urls"`
}

// skillWorkingSetEntry tracks a skill loaded into the active set.
type skillWorkingSetEntry struct {
	skillEntry
	LoadedAt   time.Time `json:"loadedAt"`
	LastUsedAt time.Time `json:"lastUsedAt"`
	UseCount   int       `json:"useCount"`
	AutoLoaded bool      `json:"autoLoaded"`
}

// skillWorkingSet is a process-wide active skill set (A2A + local working set).
type skillWorkingSet struct {
	mu     sync.RWMutex
	loaded map[string]*skillWorkingSetEntry
}

var globalSkillWorkingSet = &skillWorkingSet{loaded: make(map[string]*skillWorkingSetEntry)}

func (ws *skillWorkingSet) load(id string, urls []string, auto bool) skillWorkingSetEntry {
	now := time.Now().UTC()
	ws.mu.Lock()
	defer ws.mu.Unlock()
	if existing, ok := ws.loaded[id]; ok {
		existing.LastUsedAt = now
		existing.UseCount++
		return *existing
	}
	entry := &skillWorkingSetEntry{
		skillEntry: skillEntry{ID: id, AgentURLs: urls},
		LoadedAt:   now,
		LastUsedAt: now,
		UseCount:   1,
		AutoLoaded: auto,
	}
	ws.loaded[id] = entry
	return *entry
}

func (ws *skillWorkingSet) unload(id string) bool {
	ws.mu.Lock()
	defer ws.mu.Unlock()
	if _, ok := ws.loaded[id]; ok {
		delete(ws.loaded, id)
		return true
	}
	return false
}

func (ws *skillWorkingSet) list() []skillWorkingSetEntry {
	ws.mu.RLock()
	defer ws.mu.RUnlock()
	out := make([]skillWorkingSetEntry, 0, len(ws.loaded))
	for _, e := range ws.loaded {
		out = append(out, *e)
	}
	return out
}

// handleSkillList returns all skills registered in the global A2A skill registry.
// GET /api/skills/list
func (s *Server) handleSkillList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
		return
	}

	all := orchestration.GlobalSkillRegistry.ListAllSkillAgents()
	entries := make([]skillEntry, 0, len(all))
	for id, urls := range all {
		entries = append(entries, skillEntry{
			ID:        id,
			AgentURLs: urls,
		})
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"skills":  entries,
		"count":   len(entries),
	})
}

// handleSkillGet returns details for a single skill by ID.
// GET /api/skills/get?id=<skillID>
func (s *Server) handleSkillGet(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
		return
	}

	id := r.URL.Query().Get("id")
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing 'id' query parameter"})
		return
	}

	urls := orchestration.GlobalSkillRegistry.ListSkillAgents(id)
	if len(urls) == 0 {
		writeJSON(w, http.StatusNotFound, map[string]any{"success": false, "error": "skill not found: " + id})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"skill": skillEntry{
			ID:        id,
			AgentURLs: urls,
		},
	})
}

// handleSkillLoad loads a skill into the active working set.
// GET/POST /api/skills/load?id=<skillID>  or  {"id":"...","autoLoaded":true}
func (s *Server) handleSkillLoad(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
		return
	}

	id := strings.TrimSpace(r.URL.Query().Get("id"))
	auto := r.URL.Query().Get("auto") == "true"
	if r.Method == http.MethodPost {
		var body struct {
			ID         string `json:"id"`
			AutoLoaded bool   `json:"autoLoaded"`
		}
		if err := decodeJSONBody(r, &body); err == nil {
			if body.ID != "" {
				id = strings.TrimSpace(body.ID)
			}
			if body.AutoLoaded {
				auto = true
			}
		}
	}
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing 'id'"})
		return
	}

	urls := orchestration.GlobalSkillRegistry.ListSkillAgents(id)
	entry := globalSkillWorkingSet.load(id, urls, auto)

	// Also drive the catalog SkillDecisionSystem when the server has one.
	if s.skillDecision != nil {
		_ = s.skillDecision.LoadSkill(r.Context(), id, auto)
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"skill":   entry,
	})
}

// handleSkillUnload removes a skill from the active working set.
// GET/POST /api/skills/unload?id=<skillID>
func (s *Server) handleSkillUnload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
		return
	}

	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if r.Method == http.MethodPost {
		var body struct {
			ID string `json:"id"`
		}
		if err := decodeJSONBody(r, &body); err == nil && body.ID != "" {
			id = strings.TrimSpace(body.ID)
		}
	}
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing 'id'"})
		return
	}

	removed := globalSkillWorkingSet.unload(id)
	if s.skillDecision != nil {
		if s.skillDecision.UnloadSkill(id) {
			removed = true
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"removed": removed,
		"id":      id,
	})
}

// handleSkillListLoaded returns currently loaded skills.
// GET /api/skills/list-loaded
func (s *Server) handleSkillListLoaded(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
		return
	}

	entries := globalSkillWorkingSet.list()
	// Merge catalog decision-system loads (dedup by lowercased id).
	seen := map[string]bool{}
	for _, e := range entries {
		seen[strings.ToLower(e.ID)] = true
	}
	if s.skillDecision != nil {
		for _, sl := range s.skillDecision.ListLoadedSkills() {
			if seen[strings.ToLower(sl.ID)] {
				continue
			}
			seen[strings.ToLower(sl.ID)] = true
			entries = append(entries, skillWorkingSetEntry{
				skillEntry: skillEntry{ID: sl.ID},
				LoadedAt:   sl.LoadedAt,
				LastUsedAt: sl.LastUsedAt,
				UseCount:   sl.UseCount,
				AutoLoaded: sl.AutoLoaded,
			})
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"skills":  entries,
		"count":   len(entries),
	})
}

func (s *Server) handleSkillSearch(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
		return
	}

	q := r.URL.Query().Get("q")
	if q == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing 'q' query parameter"})
		return
	}

	all := orchestration.GlobalSkillRegistry.ListAllSkillAgents()
	entries := make([]skillEntry, 0)
	query := strings.ToLower(q)

	for id, urls := range all {
		if strings.Contains(strings.ToLower(id), query) {
			entries = append(entries, skillEntry{
				ID:        id,
				AgentURLs: urls,
			})
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"skills":  entries,
		"count":   len(entries),
	})
}
