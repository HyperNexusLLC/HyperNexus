package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
)

var (
	// Multi-word or single capitalized entity: HyperNexus, Ollama, nomic-embed-text, /api/memory/search
	entityRe = regexp.MustCompile(`\b([A-Z][A-Za-z0-9]+(?:[-_/][A-Za-z0-9.]+)*|[a-z]+(?:[-_/][a-z0-9.]+)+)\b`)
	// Pattern: X uses/depends on/implements/is part of Y
	relRe = regexp.MustCompile(`(?i)\b([A-Za-z0-9_./-]{2,})\s+(uses|depends on|implements|contains|manages|stores|searches|replaces|part of|related to|configures|deploys|exposes|wraps)\s+([A-Za-z0-9_./-]{2,})`)
)

// HandleExtractRelations extracts entities/relationships from text and stores GraphRAG edges.
func HandleExtractRelations(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	text, _ := getString(args, "text")
	if strings.TrimSpace(text) == "" {
		return err("text is required")
	}
	if GlobalVectorStore == nil {
		return err("vector store not initialized")
	}

	entities := extractEntities(text)
	edges := extractPatternRelations(text, entities)

	// Co-occurrence edges between top entities (capped)
	if len(entities) > 1 && len(edges) < 8 {
		limit := len(entities)
		if limit > 6 {
			limit = 6
		}
		for i := 0; i < limit; i++ {
			for j := i + 1; j < limit; j++ {
				a, b := entities[i], entities[j]
				if len(edges) >= 12 {
					break
				}
				edges = append(edges, relationEdge{Source: a, Target: b, Type: "co_occurs", Weight: 0.4})
			}
		}
	}

	stored := 0
	var failures []string
	for _, e := range edges {
		src := memIDFor(e.Source)
		tgt := memIDFor(e.Target)
		if src == tgt {
			continue
		}
		if err := GlobalVectorStore.AddRelation(ctx, src, tgt, e.Type, e.Weight); err != nil {
			failures = append(failures, err.Error())
			continue
		}
		stored++
	}

	payload := map[string]any{
		"entities":    entities,
		"edges":       edges,
		"stored":      stored,
		"unique_nodes": uniqueNodeCount(edges),
	}
	if len(failures) > 0 {
		payload["errors"] = failures
	}
	data, _ := json.MarshalIndent(payload, "", "  ")
	return ok(string(data))
}

// HandleExtractRelationsBatch walks L2 vault memories and extracts relations across the corpus.
func HandleExtractRelationsBatch(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	if GlobalVectorStore == nil {
		return err("vector store not initialized")
	}
	limit, _ := getInt(args, "limit")
	if limit <= 0 || limit > 500 {
		limit = 100
	}

	db := GlobalVectorStore.DB()
	rows, qErr := db.QueryContext(ctx, `
		SELECT id, content FROM l2_vault
		ORDER BY heat_score DESC, created_at DESC
		LIMIT ?
	`, limit)
	if qErr != nil {
		return err(fmt.Sprintf("query memories: %v", qErr))
	}
	defer rows.Close()

	type mem struct{ id, content string }
	var mems []mem
	for rows.Next() {
		var m mem
		if rows.Scan(&m.id, &m.content) == nil {
			mems = append(mems, m)
		}
	}

	totalEdges := 0
	totalEntities := 0
	for _, m := range mems {
		entities := extractEntities(m.content)
		totalEntities += len(entities)
		edges := extractPatternRelations(m.content, entities)
		if len(edges) == 0 && len(entities) > 1 {
			// link memory id to its top entities so the graph connects the corpus
			for i := 0; i < len(entities) && i < 3; i++ {
				edges = append(edges, relationEdge{Source: m.id, Target: entities[i], Type: "mentions", Weight: 0.5})
			}
		}
		for _, e := range edges {
			src := e.Source
			tgt := e.Target
			if !isMemID(src) {
				src = memIDFor(src)
			}
			if !isMemID(tgt) {
				tgt = memIDFor(tgt)
			}
			if src == tgt {
				continue
			}
			if addErr := GlobalVectorStore.AddRelation(ctx, src, tgt, e.Type, e.Weight); addErr != nil {
				continue
			}
			totalEdges++
		}
	}

	// Cross-memory: memories sharing a category tag link as related
	rows2, qErr := db.QueryContext(ctx, `
		SELECT id, category FROM l2_vault LIMIT ?
	`, limit)
	if qErr == nil {
		defer rows2.Close()
		byCat := map[string][]string{}
		for rows2.Next() {
			var id, cat string
			if rows2.Scan(&id, &cat) == nil && cat != "" {
				byCat[cat] = append(byCat[cat], id)
			}
		}
		for cat, ids := range byCat {
			for i := 0; i < len(ids) && i < 4; i++ {
				for j := i + 1; j < len(ids) && j < 4; j++ {
					_ = GlobalVectorStore.AddRelation(ctx, ids[i], ids[j], "shares_category:"+cat, 0.3)
					totalEdges++
				}
			}
		}
	}

	data, _ := json.MarshalIndent(map[string]any{
		"memories_scanned": len(mems),
		"entities_seen":    totalEntities,
		"edges_stored":     totalEdges,
	}, "", "  ")
	return ok(string(data))
}

type relationEdge struct {
	Source string  `json:"source"`
	Target string  `json:"target"`
	Type   string  `json:"type"`
	Weight float64 `json:"weight"`
}

func extractEntities(text string) []string {
	seen := map[string]bool{}
	var out []string
	for _, m := range entityRe.FindAllString(text, -1) {
		e := strings.Trim(m, ".,:;()[]{}\"'")
		if len(e) < 3 || len(e) > 64 {
			continue
		}
		lower := strings.ToLower(e)
		if stopWords[lower] {
			continue
		}
		key := lower
		if !seen[key] {
			seen[key] = true
			out = append(out, e)
		}
		if len(out) >= 20 {
			break
		}
	}
	return out
}

func extractPatternRelations(text string, entities []string) []relationEdge {
	var edges []relationEdge
	seen := map[string]bool{}
	for _, m := range relRe.FindAllStringSubmatch(text, -1) {
		src := strings.Trim(m[1], ".,:;")
		rel := normalizeRel(m[2])
		tgt := strings.Trim(m[3], ".,:;")
		if src == "" || tgt == "" {
			continue
		}
		key := strings.ToLower(src + "|" + rel + "|" + tgt)
		if seen[key] {
			continue
		}
		seen[key] = true
		edges = append(edges, relationEdge{Source: src, Target: tgt, Type: rel, Weight: 0.8})
	}
	return edges
}

func normalizeRel(verb string) string {
	v := strings.ToLower(strings.TrimSpace(verb))
	switch {
	case strings.Contains(v, "depend"):
		return "depends_on"
	case strings.Contains(v, "implement"):
		return "implements"
	case strings.Contains(v, "replace"):
		return "replaces"
	case strings.Contains(v, "part of"):
		return "part_of"
	case strings.Contains(v, "relat"):
		return "related_to"
	case strings.Contains(v, "store"), strings.Contains(v, "search"):
		return "uses"
	case strings.Contains(v, "deploy"), strings.Contains(v, "expose"), strings.Contains(v, "configur"):
		return "manages"
	default:
		return "uses"
	}
}

func memIDFor(name string) string {
	h := uint32(2166136261)
	for _, c := range strings.ToLower(name) {
		h ^= uint32(c)
		h *= 16777619
	}
	return fmt.Sprintf("ent-%08x", h)
}

func isMemID(s string) bool {
	return strings.HasPrefix(s, "mem-") || strings.HasPrefix(s, "ent-") ||
		strings.HasPrefix(s, "fact-") || strings.HasPrefix(s, "import-") ||
		len(s) == 16
}

func uniqueNodeCount(edges []relationEdge) int {
	seen := map[string]bool{}
	for _, e := range edges {
		seen[e.Source] = true
		seen[e.Target] = true
	}
	return len(seen)
}

var stopWords = map[string]bool{
	"the": true, "and": true, "for": true, "with": true, "that": true,
	"this": true, "from": true, "into": true, "when": true, "then": true,
	"are": true, "was": true, "were": true, "been": true,
	"have": true, "has": true, "had": true, "will": true, "would": true,
	"could": true, "should": true, "can": true, "may": true, "might": true,
	"not": true, "but": true, "you": true, "your": true, "our": true,
	"their": true, "they": true, "them": true, "these": true, "those": true,
	"all": true, "any": true, "each": true, "other": true, "more": true,
	"some": true, "such": true, "only": true, "own": true, "same": true,
	"than": true, "too": true, "very": true, "just": true, "also": true,
}
