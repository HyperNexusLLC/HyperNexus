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

	return stats, nil
}
