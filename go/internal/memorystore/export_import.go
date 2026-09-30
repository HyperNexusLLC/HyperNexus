package memorystore

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"strings"
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

// CleanupHashedEntityIDs rewrites legacy ent-XXXXXXXX hashed node IDs to readable
// slugs when the target is an L2 memory (uses memory content), otherwise drops
// opaque hash-only edges. Returns (rewritten, removed) counts.
func (s *VectorStore) CleanupHashedEntityIDs(ctx context.Context) (int, int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Hash pattern: ent- + 8 hex chars
	rows, err := s.db.QueryContext(ctx, `
		SELECT source_id, target_id, relation_type, weight FROM l2_relations
	`)
	if err != nil {
		return 0, 0, err
	}
	type edge struct{ src, tgt, rel string; w float64 }
	var edges []edge
	for rows.Next() {
		var e edge
		if rows.Scan(&e.src, &e.tgt, &e.rel, &e.w) == nil {
			edges = append(edges, e)
		}
	}
	rows.Close()

	rewritten, removed := 0, 0
	for _, e := range edges {
		srcHashed := isHashedEntID(e.src)
		tgtHashed := isHashedEntID(e.tgt)
		// Drop any edge touching an unrecoverable hashed entity node
		if srcHashed || tgtHashed {
			_, _ = s.db.ExecContext(ctx, `DELETE FROM l2_relations WHERE source_id=? AND target_id=? AND relation_type=?`, e.src, e.tgt, e.rel)
			removed++
			continue
		}
		newSrc, okSrc := rewriteEntityID(ctx, s.db, e.src)
		newTgt, okTgt := rewriteEntityID(ctx, s.db, e.tgt)
		if !okSrc && !okTgt {
			continue
		}
		if newSrc == e.src && newTgt == e.tgt {
			continue
		}
		_, err := s.db.ExecContext(ctx, `
			INSERT INTO l2_relations (source_id, target_id, relation_type, weight)
			VALUES (?, ?, ?, ?)
			ON CONFLICT(source_id, target_id, relation_type) DO UPDATE SET weight = excluded.weight
		`, newSrc, newTgt, e.rel, e.w)
		if err != nil {
			continue
		}
		if newSrc != e.src || newTgt != e.tgt {
			_, _ = s.db.ExecContext(ctx, `DELETE FROM l2_relations WHERE source_id=? AND target_id=? AND relation_type=?`, e.src, e.tgt, e.rel)
			rewritten++
		}
	}
	return rewritten, removed, nil
}

func isHashedEntID(id string) bool {
	if !strings.HasPrefix(id, "ent-") {
		return false
	}
	rest := strings.TrimPrefix(id, "ent-")
	if len(rest) != 8 {
		return false
	}
	for _, c := range rest {
		if !((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')) {
			return false
		}
	}
	return true
}

// rewriteEntityID converts hashed ent- IDs to slug form when possible.
func rewriteEntityID(ctx context.Context, db *sql.DB, id string) (string, bool) {
	if !isHashedEntID(id) {
		return id, false
	}
	// If this ID is also a memory, keep it — memory IDs are already meaningful to the graph UI
	var content string
	err := db.QueryRowContext(ctx, `SELECT content FROM l2_vault WHERE id = ?`, id).Scan(&content)
	if err == nil && content != "" {
		return id, true
	}
	// Cannot recover original name from hash alone
	return id, false
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
