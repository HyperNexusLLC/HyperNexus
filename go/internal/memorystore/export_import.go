package memorystore

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"gitlab.com/HyperNexusLLC/HyperNexus/internal/controlplane"
)

// MemoryExport represents a portable memory bundle
type MemoryExport struct {
	Version    string                       `json:"version"`
	ExportedAt time.Time                    `json:"exported_at"`
	Source     string                       `json:"source"`
	Count      int                          `json:"count"`
	Memories   []controlplane.L2VaultRecord `json:"memories"`
}

// ExportMemories exports all L2 vault memories to a JSON file
func (s *VectorStore) ExportMemories(ctx context.Context, filePath string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	rows, err := s.db.QueryContext(ctx, `
		SELECT id, session_id, memory_type, memory_kind, category, tags, source_url, content, importance, heat_score, last_accessed_at, created_at
		FROM l2_vault
		WHERE memory_kind != 'superseded'
		ORDER BY created_at DESC
	`)
	if err != nil {
		return fmt.Errorf("export query: %w", err)
	}
	defer rows.Close()

	var memories []controlplane.L2VaultRecord
	for rows.Next() {
		var m controlplane.L2VaultRecord
		var memType, memKind, category, tags, sourceURL string
		var lastAccessed, createdAt string

		err := rows.Scan(&m.ID, &m.SessionID, &memType, &memKind, &category, &tags, &sourceURL, &m.Content, &m.Importance, &m.HeatScore, &lastAccessed, &createdAt)
		if err != nil {
			continue
		}

		m.Type = controlplane.MemoryType(memType)
		m.Kind = memKind
		m.Category = category
		m.Tags = tags
		m.SourceURL = sourceURL
		m.LastAccessedAt, _ = time.Parse("2006-01-02 15:04:05", lastAccessed)
		m.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdAt)

		memories = append(memories, m)
	}

	export := MemoryExport{
		Version:    "1.0",
		ExportedAt: time.Now(),
		Source:     "hypernexus",
		Count:      len(memories),
		Memories:   memories,
	}

	data, err := json.MarshalIndent(export, "", "  ")
	if err != nil {
		return fmt.Errorf("export marshal: %w", err)
	}

	return os.WriteFile(filePath, data, 0644)
}

// ExportMemoriesJSON returns all L2 vault memories as a portable JSON bundle (no file I/O).
func (s *VectorStore) ExportMemoriesJSON(ctx context.Context) (*MemoryExport, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	rows, err := s.db.QueryContext(ctx, `
		SELECT id, session_id, memory_type, memory_kind, category, tags, source_url, content, importance, heat_score, last_accessed_at, created_at
		FROM l2_vault
		WHERE memory_kind != 'superseded'
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("export query: %w", err)
	}
	defer rows.Close()

	var memories []controlplane.L2VaultRecord
	for rows.Next() {
		var m controlplane.L2VaultRecord
		var memType, memKind, category, tags, sourceURL string
		var lastAccessed, createdAt string

		err := rows.Scan(&m.ID, &m.SessionID, &memType, &memKind, &category, &tags, &sourceURL, &m.Content, &m.Importance, &m.HeatScore, &lastAccessed, &createdAt)
		if err != nil {
			continue
		}

		m.Type = controlplane.MemoryType(memType)
		m.Kind = memKind
		m.Category = category
		m.Tags = tags
		m.SourceURL = sourceURL
		m.LastAccessedAt, _ = time.Parse("2006-01-02 15:04:05", lastAccessed)
		m.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdAt)

		memories = append(memories, m)
	}

	return &MemoryExport{
		Version:    "1.0",
		ExportedAt: time.Now(),
		Source:     "hypernexus-l2",
		Count:      len(memories),
		Memories:   memories,
	}, nil
}

// ImportMemoriesJSON imports memories from a MemoryExport payload (no file I/O).
// Returns the number imported and any per-record errors (import continues past failures).
func (s *VectorStore) ImportMemoriesJSON(ctx context.Context, export *MemoryExport) (int, []string, error) {
	if export == nil {
		return 0, nil, fmt.Errorf("nil export")
	}
	imported := 0
	var errs []string
	for i, mem := range export.Memories {
		if mem.ID == "" {
			mem.ID = fmt.Sprintf("import-%d-%d", time.Now().UnixNano(), i)
		}
		// Normalize memory_type to schema CHECK values
		switch string(mem.Type) {
		case "working", "long_term", "archive":
		default:
			mem.Type = "working"
		}
		if mem.Kind == "" {
			mem.Kind = "fact"
		}
		if err := s.Commit(ctx, mem); err != nil {
			errs = append(errs, fmt.Sprintf("[%d] %s: %v", i, mem.ID, err))
			continue
		}
		imported++
	}
	return imported, errs, nil
}

// ListAllRelations returns every GraphRAG edge in the relation store.
func (s *VectorStore) ListAllRelations(ctx context.Context, limit int) ([]controlplane.L2Relation, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if limit <= 0 || limit > 5000 {
		limit = 1000
	}
	rows, err := s.db.QueryContext(ctx, `
		SELECT source_id, target_id, relation_type, weight
		FROM l2_relations
		ORDER BY weight DESC
		LIMIT ?
	`, limit)
	if err != nil {
		return nil, fmt.Errorf("list relations: %w", err)
	}
	defer rows.Close()

	var rels []controlplane.L2Relation
	for rows.Next() {
		var r controlplane.L2Relation
		if err := rows.Scan(&r.SourceID, &r.TargetID, &r.RelationType, &r.Weight); err != nil {
			continue
		}
		rels = append(rels, r)
	}
	return rels, nil
}

// ImportMemories imports memories from a JSON file
func (s *VectorStore) ImportMemories(ctx context.Context, filePath string) (int, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return 0, fmt.Errorf("import read: %w", err)
	}

	var export MemoryExport
	if err := json.Unmarshal(data, &export); err != nil {
		return 0, fmt.Errorf("import unmarshal: %w", err)
	}

	imported := 0
	for _, mem := range export.Memories {
		if err := s.Commit(ctx, mem); err != nil {
			continue
		}
		imported++
	}

	return imported, nil
}

// GetMemoryStats returns memory statistics
func (s *VectorStore) GetMemoryStats(ctx context.Context) (map[string]interface{}, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	stats := make(map[string]interface{})

	// Total memories
	var total int
	s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM l2_vault").Scan(&total)
	stats["total"] = total

	// By kind
	rows, _ := s.db.QueryContext(ctx, "SELECT memory_kind, COUNT(*) FROM l2_vault GROUP BY memory_kind")
	if rows != nil {
		defer rows.Close()
		byKind := make(map[string]int)
		for rows.Next() {
			var kind string
			var count int
			rows.Scan(&kind, &count)
			byKind[kind] = count
		}
		stats["by_kind"] = byKind
	}

	// By category
	rows2, _ := s.db.QueryContext(ctx, "SELECT category, COUNT(*) FROM l2_vault GROUP BY category")
	if rows2 != nil {
		defer rows2.Close()
		byCategory := make(map[string]int)
		for rows2.Next() {
			var cat string
			var count int
			rows2.Scan(&cat, &count)
			byCategory[cat] = count
		}
		stats["by_category"] = byCategory
	}

	// L1 cache size
	stats["l1_cache_size"] = len(s.l1Cache)

	// Relation graph stats (both RelationStore table and l2_relations edges)
	if s.relationStore != nil {
		if relStats, rErr := s.relationStore.GetStats(ctx); rErr == nil {
			stats["relations_by_type"] = relStats
		}
	}
	var relTotal int
	_ = s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM l2_relations").Scan(&relTotal)
	var memRelTotal int
	_ = s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM memory_relations").Scan(&memRelTotal)
	stats["relations_total"] = relTotal + memRelTotal
	stats["l2_relations_total"] = relTotal
	stats["memory_relations_total"] = memRelTotal

	return stats, nil
}
