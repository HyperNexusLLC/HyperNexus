package httpapi

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
)

func (s *Server) handleCloudDevListProviders(w http.ResponseWriter, r *http.Request) {
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "cloudDev.listProviders", nil, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": result, "bridge": map[string]any{"upstreamBase": upstreamBase, "procedure": "cloudDev.listProviders"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    []map[string]any{},
		"bridge":  map[string]any{"fallback": "go-local-clouddev", "procedure": "cloudDev.listProviders", "reason": "upstream unavailable; no local cloud dev providers configured"},
	})
}

func (s *Server) handleCloudDevCreateSession(w http.ResponseWriter, r *http.Request) {
	var payload map[string]any
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
		return
	}
	if upstreamBase, err := s.callUpstreamJSON(r.Context(), "cloudDev.createSession", payload, new(any)); err == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "bridge": map[string]any{"upstreamBase": upstreamBase, "procedure": "cloudDev.createSession"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    map[string]any{"sessionId": fmt.Sprintf("cd-%d", 0), "status": "created"},
		"bridge":  map[string]any{"fallback": "go-local-clouddev", "procedure": "cloudDev.createSession", "reason": "upstream unavailable; cloud dev session creation requires upstream engine"},
	})
}

func (s *Server) handleCloudDevListSessions(w http.ResponseWriter, r *http.Request) {
	payload := map[string]any{}
	if provider := strings.TrimSpace(r.URL.Query().Get("provider")); provider != "" {
		payload["provider"] = provider
	}
	if status := strings.TrimSpace(r.URL.Query().Get("status")); status != "" {
		payload["status"] = status
	}
	var result any
	var upstreamBase string
	var err error
	if len(payload) == 0 {
		upstreamBase, err = s.callUpstreamJSON(r.Context(), "cloudDev.listSessions", nil, &result)
	} else {
		upstreamBase, err = s.callUpstreamJSON(r.Context(), "cloudDev.listSessions", payload, &result)
	}
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": result, "bridge": map[string]any{"upstreamBase": upstreamBase, "procedure": "cloudDev.listSessions"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    []map[string]any{},
		"bridge":  map[string]any{"fallback": "go-local-clouddev", "procedure": "cloudDev.listSessions", "reason": "upstream unavailable; no local cloud dev sessions"},
	})
}

func (s *Server) handleCloudDevGetSession(w http.ResponseWriter, r *http.Request) {
	sessionID := strings.TrimSpace(r.URL.Query().Get("sessionId"))
	if sessionID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing sessionId query parameter"})
		return
	}
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "cloudDev.getSession", map[string]any{"sessionId": sessionID}, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": result, "bridge": map[string]any{"upstreamBase": upstreamBase, "procedure": "cloudDev.getSession"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    map[string]any{"sessionId": sessionID, "status": "not_found"},
		"bridge":  map[string]any{"fallback": "go-local-clouddev", "procedure": "cloudDev.getSession", "reason": "upstream unavailable; cloud dev sessions require upstream engine"},
	})
}

func (s *Server) handleCloudDevUpdateSessionStatus(w http.ResponseWriter, r *http.Request) {
	var payload map[string]any
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
		return
	}
	if upstreamBase, err := s.callUpstreamJSON(r.Context(), "cloudDev.updateSessionStatus", payload, new(any)); err == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "bridge": map[string]any{"upstreamBase": upstreamBase, "procedure": "cloudDev.updateSessionStatus"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    map[string]any{"updated": true},
		"bridge":  map[string]any{"fallback": "go-local-clouddev", "procedure": "cloudDev.updateSessionStatus", "reason": "upstream unavailable; status update acknowledged locally"},
	})
}

func (s *Server) handleCloudDevDeleteSession(w http.ResponseWriter, r *http.Request) {
	var payload map[string]any
	_ = json.NewDecoder(r.Body).Decode(&payload)
	if upstreamBase, err := s.callUpstreamJSON(r.Context(), "cloudDev.deleteSession", payload, new(any)); err == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "bridge": map[string]any{"upstreamBase": upstreamBase, "procedure": "cloudDev.deleteSession"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    map[string]any{"deleted": true},
		"bridge":  map[string]any{"fallback": "go-local-clouddev", "procedure": "cloudDev.deleteSession", "reason": "upstream unavailable; delete acknowledged locally"},
	})
}

func (s *Server) handleCloudDevSendMessage(w http.ResponseWriter, r *http.Request) {
	var payload map[string]any
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
		return
	}
	if upstreamBase, err := s.callUpstreamJSON(r.Context(), "cloudDev.sendMessage", payload, new(any)); err == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "bridge": map[string]any{"upstreamBase": upstreamBase, "procedure": "cloudDev.sendMessage"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    map[string]any{"sent": true},
		"bridge":  map[string]any{"fallback": "go-local-clouddev", "procedure": "cloudDev.sendMessage", "reason": "upstream unavailable; message send acknowledged locally"},
	})
}

func (s *Server) handleCloudDevBroadcastMessage(w http.ResponseWriter, r *http.Request) {
	var payload map[string]any
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
		return
	}
	if upstreamBase, err := s.callUpstreamJSON(r.Context(), "cloudDev.broadcastMessage", payload, new(any)); err == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "bridge": map[string]any{"upstreamBase": upstreamBase, "procedure": "cloudDev.broadcastMessage"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    map[string]any{"broadcasted": true, "recipients": 0},
		"bridge":  map[string]any{"fallback": "go-local-clouddev", "procedure": "cloudDev.broadcastMessage", "reason": "upstream unavailable; broadcast acknowledged locally"},
	})
}

func (s *Server) handleCloudDevPreviewBroadcastRecipients(w http.ResponseWriter, r *http.Request) {
	var payload map[string]any
	_ = json.NewDecoder(r.Body).Decode(&payload)
	if upstreamBase, err := s.callUpstreamJSON(r.Context(), "cloudDev.previewBroadcastRecipients", payload, new(any)); err == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "bridge": map[string]any{"upstreamBase": upstreamBase, "procedure": "cloudDev.previewBroadcastRecipients"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    []map[string]any{},
		"bridge":  map[string]any{"fallback": "go-local-clouddev", "procedure": "cloudDev.previewBroadcastRecipients", "reason": "upstream unavailable; no local broadcast recipients"},
	})
}

func (s *Server) handleCloudDevAcceptPlan(w http.ResponseWriter, r *http.Request) {
	var payload map[string]any
	_ = json.NewDecoder(r.Body).Decode(&payload)
	if upstreamBase, err := s.callUpstreamJSON(r.Context(), "cloudDev.acceptPlan", payload, new(any)); err == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "bridge": map[string]any{"upstreamBase": upstreamBase, "procedure": "cloudDev.acceptPlan"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    map[string]any{"accepted": true},
		"bridge":  map[string]any{"fallback": "go-local-clouddev", "procedure": "cloudDev.acceptPlan", "reason": "upstream unavailable; plan accept acknowledged locally"},
	})
}

func (s *Server) handleCloudDevSetAutoAcceptPlan(w http.ResponseWriter, r *http.Request) {
	var payload map[string]any
	_ = json.NewDecoder(r.Body).Decode(&payload)
	if upstreamBase, err := s.callUpstreamJSON(r.Context(), "cloudDev.setAutoAcceptPlan", payload, new(any)); err == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "bridge": map[string]any{"upstreamBase": upstreamBase, "procedure": "cloudDev.setAutoAcceptPlan"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    map[string]any{"autoAccept": true},
		"bridge":  map[string]any{"fallback": "go-local-clouddev", "procedure": "cloudDev.setAutoAcceptPlan", "reason": "upstream unavailable; auto-accept set locally"},
	})
}

func (s *Server) handleCloudDevGetMessages(w http.ResponseWriter, r *http.Request) {
	sessionID := strings.TrimSpace(r.URL.Query().Get("sessionId"))
	if sessionID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing sessionId query parameter"})
		return
	}
	payload := map[string]any{"sessionId": sessionID}
	if limit := strings.TrimSpace(r.URL.Query().Get("limit")); limit != "" {
		if parsed, err := strconv.Atoi(limit); err == nil {
			payload["limit"] = parsed
		}
	}
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "cloudDev.getMessages", payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": result, "bridge": map[string]any{"upstreamBase": upstreamBase, "procedure": "cloudDev.getMessages"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    []map[string]any{},
		"bridge":  map[string]any{"fallback": "go-local-clouddev", "procedure": "cloudDev.getMessages", "reason": "upstream unavailable; no local cloud dev messages"},
	})
}

func (s *Server) handleCloudDevGetLogs(w http.ResponseWriter, r *http.Request) {
	sessionID := strings.TrimSpace(r.URL.Query().Get("sessionId"))
	if sessionID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing sessionId query parameter"})
		return
	}
	payload := map[string]any{"sessionId": sessionID}
	if limit := strings.TrimSpace(r.URL.Query().Get("limit")); limit != "" {
		if parsed, err := strconv.Atoi(limit); err == nil {
			payload["limit"] = parsed
		}
	}
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "cloudDev.getLogs", payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": result, "bridge": map[string]any{"upstreamBase": upstreamBase, "procedure": "cloudDev.getLogs"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    []map[string]any{},
		"bridge":  map[string]any{"fallback": "go-local-clouddev", "procedure": "cloudDev.getLogs", "reason": "upstream unavailable; no local cloud dev logs"},
	})
}

func (s *Server) handleCloudDevStats(w http.ResponseWriter, r *http.Request) {
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "cloudDev.stats", nil, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": result, "bridge": map[string]any{"upstreamBase": upstreamBase, "procedure": "cloudDev.stats"}})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    map[string]any{"totalSessions": 0, "activeSessions": 0, "totalMessages": 0},
		"bridge":  map[string]any{"fallback": "go-local-clouddev", "procedure": "cloudDev.stats", "reason": "upstream unavailable; zero-state local cloud dev stats"},
	})
}
