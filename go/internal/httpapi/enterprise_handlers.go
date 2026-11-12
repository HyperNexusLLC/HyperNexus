package httpapi

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"gitlab.com/HyperNexusLLC/HyperNexus/internal/enterprise"
)

// dangerousOperationBlocklist mirrors the pi extension's local check and serves
// as the server-side enforcement point for enterprise RBAC.
var dangerousOperationBlocklist = []string{
	"rm -rf", "sudo ", "chmod -R 777", "DROP TABLE", "DROP DATABASE", "git push --force",
}

// POST /api/enterprise/authorize
// Evaluates an incoming tool call against the enterprise policy and returns
// { "allowed": bool }. The pi extension calls this for dangerous operations.
func (s *Server) handleEnterpriseAuthorize(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
		return
	}
	var payload struct {
		Tool   string `json:"tool"`
		Action string `json:"action"`
		Args   any    `json:"args"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
		return
	}

	allowed := !s.isDangerousEnterpriseAction(payload.Tool, payload.Action, payload.Args)
	result := "ALLOW"
	if !allowed {
		result = "DENY"
	}
	s.enterpriseAuditLog(payload.Tool, "AUTHORIZE", result, payload)

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"allowed": allowed,
		"tool":    payload.Tool,
		"action":  payload.Action,
	})
}

// POST /api/enterprise/audit/log
// Records a tool execution in the enterprise audit trail.
func (s *Server) handleEnterpriseAuditLog(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
		return
	}
	var payload map[string]any
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body"})
		return
	}

	tool, _ := payload["tool"].(string)
	action, _ := payload["action"].(string)
	result, _ := payload["result"].(string)
	if action == "" {
		action = "EXECUTE_TOOL"
	}
	s.enterpriseAuditLog(tool, action, result, payload)

	writeJSON(w, http.StatusOK, map[string]any{"success": true})
}

func (s *Server) isDangerousEnterpriseAction(tool, action string, args any) bool {
	input := strings.ToLower(action + " " + strings.ToLower(fmt.Sprint(args)))
	for _, pattern := range dangerousOperationBlocklist {
		if strings.Contains(input, strings.ToLower(pattern)) {
			return true
		}
	}
	return false
}

func (s *Server) enterpriseAuditLog(tool, action, result string, metadata any) {
	auditor := enterprise.NewAuditor(s.cfg.WorkspaceRoot)
	auditor.Log(enterprise.AuditEvent{
		UserID:   "pi-agent",
		Action:   action,
		Resource: tool,
		Result:   result,
		Metadata: metadata,
	})
}
