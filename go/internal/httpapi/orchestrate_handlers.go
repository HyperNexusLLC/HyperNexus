package httpapi

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// handleAgentOrchestrate serves POST /api/agent/orchestrate: the native
// one-call RECALL -> DISCOVER -> PERSIST step the harness extensions used
// to implement client-side (EXECUTE stays with the caller, which invokes
// the recommended tools through /api/agent/tool). Before this handler the
// route 404'd whenever the TypeScript upstream (:4000) was down.
func (s *Server) handleAgentOrchestrate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
		return
	}

	var payload struct {
		Goal      string `json:"goal"`
		SessionID string `json:"sessionId"`
		Harness   string `json:"harness"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
		return
	}
	goal := strings.TrimSpace(payload.Goal)
	if goal == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "goal is required"})
		return
	}

	// Try upstream first for full routing/quota features.
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "agent.orchestrate", payload, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge":  map[string]any{"upstreamBase": upstreamBase, "procedure": "agent.orchestrate"},
		})
		return
	}

	// RECALL: keyword-scored search over the local agent-memory store.
	records, recallErr := s.localSearchAgentMemoryRecords(goal, localAgentMemorySearchOptions{Limit: 8})
	recall := make([]map[string]any, 0)
	if recallErr == nil {
		for _, record := range records {
			mapped := localAgentMemoryMap(record)
			if content, ok := mapped["content"].(string); ok && len(content) > 500 {
				mapped["content"] = content[:500]
			}
			recall = append(recall, mapped)
		}
	}

	// DISCOVER: tool suggestions for the goal (same snapshot /sessions uses).
	suggestions, suggestErr := s.buildToolSuggestionSnapshotWithLimit(r, goal, 8)
	var recommended any
	if suggestErr == nil {
		recommended = suggestions.RecommendedTools
	}

	// PERSIST: stash the orchestration plan on the scratchpad (SQLite-fast;
	// a memories.json write would serialize behind the whole-store rewrite).
	sessionID := strings.TrimSpace(payload.SessionID)
	if sessionID == "" {
		sessionID = "default"
	}
	scratchKey := "orchestrate:" + sessionID
	persisted := false
	if s.memoryManager != nil {
		plan, _ := json.Marshal(map[string]any{
			"goal": goal, "sessionId": sessionID, "harness": payload.Harness,
			"recallCount": len(recall), "ts": time.Now().UnixMilli(),
		})
		persisted = s.memoryManager.SetScratchpad(r.Context(), scratchKey, string(plan)) == nil
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"goal":             goal,
			"sessionId":        sessionID,
			"recall":           recall,
			"recallCount":      len(recall),
			"recommendedTools": recommended,
			"persisted":        persisted,
			"scratchpadKey":    scratchKey,
			"steps": []string{
				"RECALL: searched local agent memory for the goal",
				"DISCOVER: ranked kernel/MCP tools for the goal",
				"EXECUTE: caller invokes recommendedTools via POST /api/agent/tool",
				fmt.Sprintf("PERSIST: plan stashed at scratchpad key %q", scratchKey),
			},
		},
		"bridge": map[string]any{
			"fallback":  "go-local-orchestrate",
			"procedure": "agent.orchestrate",
			"reason":    "upstream unavailable; using native Go RECALL/DISCOVER/PERSIST",
		},
	})
}
