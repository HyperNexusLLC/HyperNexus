package httpapi

import (
	"encoding/json"
	"net/http"
	"strings"
)

func (s *Server) localCouncilMembers() []map[string]any {
	return []map[string]any{
		{"id": "planner", "name": "Planner", "role": "planner", "provider": "anthropic", "model": "claude-sonnet-4-20250514", "status": "available"},
		{"id": "implementer", "name": "Implementer", "role": "implementer", "provider": "openai", "model": "gpt-4o", "status": "available"},
		{"id": "tester", "name": "Tester", "role": "tester", "provider": "google", "model": "gemini-2.5-flash", "status": "available"},
		{"id": "critic", "name": "Critic", "role": "critic", "provider": "deepseek", "model": "deepseek-chat", "status": "available"},
		{"id": "reviewer", "name": "Reviewer", "role": "reviewer", "provider": "anthropic", "model": "claude-sonnet-4-20250514", "status": "available"},
	}
}

func (s *Server) handleCouncilMembers(w http.ResponseWriter, r *http.Request) {
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "council.members", nil, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "council.members",
			},
		})
		return
	}
	members := s.localCouncilMembers()
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    members,
		"bridge": map[string]any{
			"fallback":  "go-local-council",
			"procedure": "council.members",
			"reason":    "upstream unavailable; using local council member roster",
		},
	})
}

func (s *Server) handleCouncilUpdateMembers(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "council.updateMembers")
}

func (s *Server) handleCouncilSessionsList(w http.ResponseWriter, r *http.Request) {
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "council.sessions.list", nil, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": result, "bridge": map[string]any{"upstreamBase": upstreamBase, "procedure": "council.sessions.list"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    []map[string]any{},
		"bridge":  map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.list", "reason": "upstream unavailable; no local council sessions"},
	})
}

func (s *Server) handleCouncilSessionsActive(w http.ResponseWriter, r *http.Request) {
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "council.sessions.active", nil, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": result, "bridge": map[string]any{"upstreamBase": upstreamBase, "procedure": "council.sessions.active"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    []map[string]any{},
		"bridge":  map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.active", "reason": "upstream unavailable; no active local council sessions"},
	})
}

func (s *Server) handleCouncilSessionsStats(w http.ResponseWriter, r *http.Request) {
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "council.sessions.stats", nil, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": result, "bridge": map[string]any{"upstreamBase": upstreamBase, "procedure": "council.sessions.stats"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"total": 0, "active": 0, "completed": 0, "failed": 0,
		},
		"bridge": map[string]any{"fallback": "go-local-council", "procedure": "council.sessions.stats", "reason": "upstream unavailable; zero-state local session stats"},
	})
}

func (s *Server) handleCouncilSessionsGet(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing id query parameter"})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "council.sessions.get", map[string]any{"id": id})
}

func (s *Server) handleCouncilSessionsStart(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "council.sessions.start")
}

func (s *Server) handleCouncilSessionsBulkStart(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "council.sessions.bulkStart")
}

func (s *Server) handleCouncilSessionsBulkStop(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodPost, "council.sessions.bulkStop", nil)
}

func (s *Server) handleCouncilSessionsBulkResume(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodPost, "council.sessions.bulkResume", nil)
}

func (s *Server) handleCouncilSessionsStop(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "council.sessions.stop")
}

func (s *Server) handleCouncilSessionsResume(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "council.sessions.resume")
}

func (s *Server) handleCouncilSessionsDelete(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "council.sessions.delete")
}

func (s *Server) handleCouncilSessionsGuidance(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "council.sessions.sendGuidance")
}

func (s *Server) handleCouncilSessionsLogs(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing id query parameter"})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "council.sessions.getLogs", map[string]any{"id": id})
}

func (s *Server) handleCouncilSessionsTemplates(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "council.sessions.templates", nil)
}

func (s *Server) handleCouncilSessionsStartFromTemplate(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "council.sessions.startFromTemplate")
}

func (s *Server) handleCouncilSessionsPersisted(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "council.sessions.persisted", nil)
}

func (s *Server) handleCouncilSessionsByTag(w http.ResponseWriter, r *http.Request) {
	tag := strings.TrimSpace(r.URL.Query().Get("tag"))
	if tag == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing tag query parameter"})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "council.sessions.byTag", map[string]any{"tag": tag})
}

func (s *Server) handleCouncilSessionsByTemplate(w http.ResponseWriter, r *http.Request) {
	template := strings.TrimSpace(r.URL.Query().Get("template"))
	if template == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing template query parameter"})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "council.sessions.byTemplate", map[string]any{"template": template})
}

func (s *Server) handleCouncilSessionsByCLI(w http.ResponseWriter, r *http.Request) {
	cliType := strings.TrimSpace(r.URL.Query().Get("cliType"))
	if cliType == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing cliType query parameter"})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "council.sessions.byCLI", map[string]any{"cliType": cliType})
}

func (s *Server) handleCouncilSessionsUpdateTags(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "council.sessions.updateTags")
}

func (s *Server) handleCouncilSessionsAddTag(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "council.sessions.addTag")
}

func (s *Server) handleCouncilSessionsRemoveTag(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "council.sessions.removeTag")
}

func (s *Server) handleCouncilQuotaStatus(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "council.quota.status", nil)
}

func (s *Server) handleCouncilQuotaConfig(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		s.handleTRPCBridgeCall(w, r, http.MethodGet, "council.quota.getConfig", nil)
	case http.MethodPost:
		s.handleTRPCBridgeBodyCall(w, r, "council.quota.updateConfig")
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
	}
}

func (s *Server) handleCouncilQuotaEnabled(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		enabled := strings.EqualFold(strings.TrimSpace(r.URL.Query().Get("enabled")), "true")
		if enabled {
			s.handleTRPCBridgeCall(w, r, http.MethodPost, "council.quota.enable", nil)
			return
		}
		s.handleTRPCBridgeCall(w, r, http.MethodPost, "council.quota.disable", nil)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
	}
}

func (s *Server) handleCouncilQuotaCheck(w http.ResponseWriter, r *http.Request) {
	provider := strings.TrimSpace(r.URL.Query().Get("provider"))
	if provider == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing provider query parameter"})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "council.quota.check", map[string]any{"provider": provider})
}

func (s *Server) handleCouncilQuotaStats(w http.ResponseWriter, r *http.Request) {
	provider := strings.TrimSpace(r.URL.Query().Get("provider"))
	if provider != "" {
		s.handleTRPCBridgeCall(w, r, http.MethodGet, "council.quota.providerStats", map[string]any{"provider": provider})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "council.quota.allStats", nil)
}

func (s *Server) handleCouncilQuotaLimits(w http.ResponseWriter, r *http.Request) {
	provider := strings.TrimSpace(r.URL.Query().Get("provider"))
	if provider == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing provider query parameter"})
		return
	}
	switch r.Method {
	case http.MethodGet:
		s.handleTRPCBridgeCall(w, r, http.MethodGet, "council.quota.getLimits", map[string]any{"provider": provider})
	case http.MethodPost:
		var payload map[string]any
		payload = map[string]any{"provider": provider}
		if err := decodeJSONBody(r, &payload); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
			return
		}
		payload["provider"] = provider
		s.handleTRPCBridgeCall(w, r, http.MethodPost, "council.quota.setLimits", payload)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
	}
}

func (s *Server) handleCouncilQuotaReset(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
		return
	}
	provider := strings.TrimSpace(r.URL.Query().Get("provider"))
	if provider != "" {
		s.handleTRPCBridgeCall(w, r, http.MethodPost, "council.quota.resetProvider", map[string]any{"provider": provider})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodPost, "council.quota.resetAll", nil)
}

func (s *Server) handleCouncilQuotaUnthrottle(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
		return
	}
	provider := strings.TrimSpace(r.URL.Query().Get("provider"))
	if provider == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing provider query parameter"})
		return
	}
	s.handleTRPCBridgeCall(w, r, http.MethodPost, "council.quota.unthrottle", map[string]any{"provider": provider})
}

func (s *Server) handleCouncilQuotaRecordRequest(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "council.quota.recordRequest")
}

func (s *Server) handleCouncilQuotaRecordRateLimitError(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "council.quota.recordRateLimitError")
}

func decodeJSONBody(r *http.Request, target any) error {
	decoder := json.NewDecoder(r.Body)
	return decoder.Decode(target)
}
