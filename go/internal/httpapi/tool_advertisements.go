package httpapi

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"gitlab.com/HyperNexusLLC/HyperNexus/internal/ai"
)

type ToolSuggestionSnapshot struct {
	RecommendedTools any            `json:"recommendedTools"`
	RelatedTools     any            `json:"relatedTools"`
	Bridge           map[string]any `json:"bridge"`
}

// localToolSearchWithKeywords tries the full query first, then falls back
// to per-keyword search: the catalog/DB matchers use whole-phrase
// LIKE/Contains, so sentence-length goals would otherwise return nothing.
func (s *Server) localToolSearchWithKeywords(query string, limit int) ([]map[string]any, error) {
	if hits, err := s.localDBToolSearch(query, limit); err == nil && len(hits) > 0 {
		return hits, nil
	}
	seen := map[string]struct{}{}
	results := make([]map[string]any, 0)
	words := strings.Fields(strings.ToLower(query))
	tried := 0
	for _, w := range words {
		w = strings.Trim(w, ".,:;!?()[]{}\" '`")
		if len(w) < 4 || tried >= 6 {
			continue
		}
		tried++
		hits, err := s.localDBToolSearch(w, limit)
		if err != nil {
			continue
		}
		for _, hit := range hits {
			id := stringValue(hit["uuid"])
			if id == "" {
				id = stringValue(hit["name"])
			}
			if _, dup := seen[id]; dup && id != "" {
				continue
			}
			seen[id] = struct{}{}
			results = append(results, hit)
			if limit > 0 && len(results) >= limit {
				return results, nil
			}
		}
	}
	return results, nil
}

func (s *Server) buildToolSuggestionSnapshot(r *http.Request, query string) (ToolSuggestionSnapshot, error) {
	return s.buildToolSuggestionSnapshotWithLimit(r, query, 8)
}

func (s *Server) buildToolSuggestionSnapshotWithLimit(r *http.Request, query string, limit int) (ToolSuggestionSnapshot, error) {
	if strings.Contains(s.cfg.WorkspaceRoot, "\x00") {
		return ToolSuggestionSnapshot{}, fmt.Errorf("invalid workspace root: contains null byte")
	}

	normalizedQuery := strings.TrimSpace(query)

	// Inject Predictive tool recommendations using local FreeLLM
	var predicted []string
	var predictErr error
	if normalizedQuery != "" {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		predicted, predictErr = ai.PredictTools(ctx, normalizedQuery, s.toolsRegistry.List())
		cancel()
	}

	searchPayload := map[string]any{
		"query": normalizedQuery,
	}
	if normalizedQuery != "" {
		searchPayload["profile"] = "repo-coding"
	}

	var recommendedTools any
	recommendedToolsBase, err := s.callUpstreamJSON(r.Context(), "mcp.searchTools", searchPayload, &recommendedTools)
	if err != nil {
		// Upstream is decommissioned in local mode - mirror the related-tools fallback: local catalog/DB hits first, then predictions.
		if hits, dbErr := s.localToolSearchWithKeywords(normalizedQuery, limit); dbErr == nil && len(hits) > 0 {
			recommendedTools = map[string]any{
				"tools":  hits,
				"source": "local-catalog",
			}
		} else if len(predicted) > 0 {
			recommendedTools = map[string]any{
				"tools": predicted,
			}
		} else {
			recommendedTools = map[string]any{
				"tools": []string{},
			}
		}
	} else if len(predicted) > 0 {
		// Merge predicted tools into recommended tools if upstream succeeded
		if recMap, ok := recommendedTools.(map[string]any); ok {
			recMap["predictedTools"] = predicted
			recommendedTools = recMap
		}
	}

	var relatedTools any
	relatedToolsBase, err := s.callUpstreamJSON(r.Context(), "mcp.callTool", map[string]any{
		"name": "list_all_tools",
		"args": map[string]any{
			"query": normalizedQuery,
			"limit": limit,
		},
	}, &relatedTools)
	if err != nil {
		// Upstream is decommissioned in local mode — serve related tools from
		// the catalog library instead of returning an empty stub. This is the
		// primary path the conversation monitor uses to suggest MCP servers.
		if catalogHits, catErr := s.localCatalogSearch(normalizedQuery, limit); catErr == nil && len(catalogHits) > 0 {
			relatedTools = map[string]any{"tools": catalogHits}
		} else if fallback, fbErr := s.localDBToolSearch(normalizedQuery, limit); fbErr == nil && len(fallback) > 0 {
			relatedTools = map[string]any{"tools": fallback}
		} else {
			relatedTools = map[string]any{"tools": []any{}}
		}
	}

	recToolsBridge := map[string]any{
		"upstreamBase": recommendedToolsBase,
		"procedure":    "mcp.searchTools",
	}
	if recommendedToolsBase == "" {
		recToolsBridge["fallback"] = "go-local-mcp"
	}

	relToolsBridge := map[string]any{
		"upstreamBase": relatedToolsBase,
		"procedure":    "mcp.callTool",
		"toolName":     "list_all_tools",
		"limit":        limit,
	}
	if relatedToolsBase == "" {
		relToolsBridge["fallback"] = "go-local-mcp"
	}

	bridgeInfo := map[string]any{
		"recommendedTools": recToolsBridge,
		"relatedTools":     relToolsBridge,
	}
	if predictErr != nil {
		bridgeInfo["predictiveError"] = predictErr.Error()
	}

	return ToolSuggestionSnapshot{
		RecommendedTools: recommendedTools,
		RelatedTools:     relatedTools,
		Bridge:           bridgeInfo,
	}, nil
}
