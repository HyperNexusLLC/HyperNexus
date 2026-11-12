package httpapi

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"gitlab.com/HyperNexusLLC/HyperNexus/internal/memorystore"
	"gitlab.com/HyperNexusLLC/HyperNexus/internal/tools"
)

// handleMemoryGraphCleanup rewrites hashed entity IDs and returns counts.
func (s *Server) handleMemoryGraphCleanup(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
		return
	}
	if tools.GlobalVectorStore == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"success": false, "error": "vector store not initialized"})
		return
	}
	rewritten, removed, err := tools.GlobalVectorStore.CleanupHashedEntityIDs(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    map[string]any{"rewritten": rewritten, "removed": removed},
	})
}

// handleL2Export returns the full L2 vault as a portable JSON bundle for backup/transfer.
func (s *Server) handleL2Export(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
		return
	}
	if tools.GlobalVectorStore == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"success": false, "error": "vector store not initialized"})
		return
	}

	export, err := tools.GlobalVectorStore.ExportMemoriesJSON(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    export,
	})
}

// handleL2Import accepts a MemoryExport JSON body and commits each record to the L2 vault.
func (s *Server) handleL2Import(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
		return
	}
	if tools.GlobalVectorStore == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"success": false, "error": "vector store not initialized"})
		return
	}

	var export memorystore.MemoryExport
	if err := json.NewDecoder(r.Body).Decode(&export); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid JSON body: " + err.Error()})
		return
	}

	imported, errs, err := tools.GlobalVectorStore.ImportMemoriesJSON(r.Context(), &export)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"imported": imported,
			"count":    export.Count,
			"errors":   errs,
		},
	})
}

// handleMemoryGraph returns nodes and edges for RelationStore visualization.
func (s *Server) handleMemoryGraph(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
		return
	}
	if tools.GlobalVectorStore == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"success": false, "error": "vector store not initialized"})
		return
	}

	limit := 500
	if lp := r.URL.Query().Get("limit"); lp != "" {
		if parsed, err := strconv.Atoi(lp); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	rels, err := tools.GlobalVectorStore.ListAllRelations(r.Context(), limit)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
		return
	}

	type node struct {
		ID    string `json:"id"`
		Label string `json:"label"`
	}
	type edge struct {
		Source string  `json:"source"`
		Target string  `json:"target"`
		Type   string  `json:"type"`
		Weight float64 `json:"weight"`
	}

	// Resolve readable labels: entity slugs + memory content previews
	memLabels := map[string]string{}
	if db := tools.GlobalVectorStore.DB(); db != nil {
		db.ExecContext(r.Context(), `CREATE TABLE IF NOT EXISTS l2_vault (id TEXT PRIMARY KEY, content TEXT, embedding BLOB, metadata TEXT, created_at INTEGER DEFAULT 0)`)
		rows, _ := db.QueryContext(r.Context(), `SELECT id, content FROM l2_vault LIMIT 500`)
		if rows != nil {
			defer rows.Close()
			for rows.Next() {
				var id, content string
				if rows.Scan(&id, &content) == nil {
					memLabels[id] = previewContent(content, 28)
				}
			}
		}
	}

	labelFor := func(id string) string {
		if lbl, ok := memLabels[id]; ok && lbl != "" {
			return lbl
		}
		if strings.HasPrefix(id, "ent-") {
			return entityLabel(id)
		}
		return truncateLabel(id)
	}

	nodes := map[string]node{}
	edges := make([]edge, 0, len(rels))
	for _, rel := range rels {
		if _, ok := nodes[rel.SourceID]; !ok {
			nodes[rel.SourceID] = node{ID: rel.SourceID, Label: labelFor(rel.SourceID)}
		}
		if _, ok := nodes[rel.TargetID]; !ok {
			nodes[rel.TargetID] = node{ID: rel.TargetID, Label: labelFor(rel.TargetID)}
		}
		edges = append(edges, edge{
			Source: rel.SourceID,
			Target: rel.TargetID,
			Type:   rel.RelationType,
			Weight: rel.Weight,
		})
	}

	nodeList := make([]node, 0, len(nodes))
	for _, n := range nodes {
		nodeList = append(nodeList, n)
	}

	stats, _ := tools.GlobalVectorStore.GetMemoryStats(r.Context())

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"nodes": nodeList,
			"edges": edges,
			"stats": stats,
		},
	})
}

func truncateLabel(id string) string {
	if len(id) > 12 {
		return id[:12] + "…"
	}
	return id
}

// entityLabel turns ent-ollama / ent-nomic-embed-text into readable names.
func entityLabel(id string) string {
	name := strings.TrimPrefix(id, "ent-")
	name = strings.ReplaceAll(name, "-", " ")
	if name == "" {
		return id
	}
	return strings.ToUpper(name[:1]) + name[1:]
}

// previewContent extracts a short human label from raw or JSON-wrapped memory content.
func previewContent(content string, max int) string {
	c := strings.TrimSpace(content)
	if strings.HasPrefix(c, "{") {
		var wrapped map[string]any
		if err := json.Unmarshal([]byte(c), &wrapped); err == nil {
			if inner, ok := wrapped["content"].(string); ok {
				c = strings.TrimSpace(inner)
			}
		}
	}
	c = strings.Join(strings.Fields(c), " ")
	if max > 0 && len(c) > max {
		c = c[:max] + "…"
	}
	return c
}
