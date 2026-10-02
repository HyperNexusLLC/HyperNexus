package memorystore

import (
	"context"
	"fmt"
	"path/filepath"
	"sort"
	"sync"
	"time"

	"gitlab.com/HyperNexusLLC/HyperNexus/internal/controlplane"
)

// MemoryVersion is a single historical snapshot of a memory's content.
type MemoryVersion struct {
	Version   int       `json:"version"`
	Content   string    `json:"content"`
	ChangedAt time.Time `json:"changedAt"`
	Reason    string    `json:"reason,omitempty"` // "manual-update", "conflict-supersede", "import"
}

type Manager struct {
	path     string
	vs       *VectorStore
	versions map[string][]MemoryVersion // memory ID → version history (oldest first)
	verMu    sync.RWMutex
	enc      *MemoryEncryption
}

func NewManager(path string) *Manager {
	// The path here is for the JSON file, but we'll use a SQLite DB next to it
	dbPath := filepath.Join(filepath.Dir(path), "memory.db")
	vs, _ := NewVectorStore(dbPath)
	m := &Manager{path: path, vs: vs, versions: map[string][]MemoryVersion{}, enc: NewMemoryEncryption()}
	m.startSleepCycleEngine()
	return m
}

func (m *Manager) startSleepCycleEngine() {
	if m.vs == nil {
		return
	}
	go func() {
		ctx := context.Background()
		limbo, limboErr := NewLimboVault(m.vs.db)
		if limboErr != nil {
			fmt.Printf("SleepCycle: L4 limbo unavailable: %v\n", limboErr)
			limbo = nil
		}

		// Run initial cycle on boot
		_ = m.vs.ForgettingCurveDecay(ctx)
		_ = m.vs.ConsolidateMemories(ctx)
		_ = m.vs.MentalModelReflection(ctx)
		if limbo != nil {
			_ = BuryOrphanedMemories(ctx, m.vs.db, limbo)
			_ = DreamCycle(ctx, m.vs.db)
		}

		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()

		for range ticker.C {
			_ = m.vs.ForgettingCurveDecay(ctx)
			_ = m.vs.ConsolidateMemories(ctx)
			_ = m.vs.MentalModelReflection(ctx)
			if limbo != nil {
				_ = BuryOrphanedMemories(ctx, m.vs.db, limbo)
				_ = DreamCycle(ctx, m.vs.db)
				// Hard-delete limbo entries older than 90 days
				n, _ := limbo.HardDelete(ctx, 90*24*time.Hour)
				if n > 0 {
					fmt.Printf("SleepCycle: purged %d old limbo entries\n", n)
				}
			}
		}
	}()
}

func (m *Manager) TriggerSleepCycle(ctx context.Context) error {
	if m.vs == nil {
		return fmt.Errorf("vector store uninitialized")
	}
	limbo, limboErr := NewLimboVault(m.vs.db)
	if limboErr != nil {
		limbo = nil
	}

	_ = m.vs.ForgettingCurveDecay(ctx)
	_ = m.vs.ConsolidateMemories(ctx)
	_ = m.vs.MentalModelReflection(ctx)
	if limbo != nil {
		_ = BuryOrphanedMemories(ctx, m.vs.db, limbo)
		_ = DreamCycle(ctx, m.vs.db)
		_, _ = limbo.HardDelete(ctx, 90*24*time.Hour)
	}
	return nil
}

func (m *Manager) GetScratchpad(ctx context.Context) (map[string]string, error) {
	if m.vs == nil {
		return nil, fmt.Errorf("vector store uninitialized")
	}
	return m.vs.GetScratchpadMap(ctx)
}

func (m *Manager) SetScratchpad(ctx context.Context, key, value string) error {
	if m.vs == nil {
		return fmt.Errorf("vector store uninitialized")
	}
	return m.vs.SetScratchpadValue(ctx, key, value)
}

func (m *Manager) Close() error {
	if m.vs != nil {
		return m.vs.Close()
	}
	return nil
}

func (m *Manager) GetAll() ([]map[string]interface{}, error) {
	if m.vs == nil {
		return []map[string]interface{}{}, nil
	}

	// We'll return the L2 vault entries as a generic map for compatibility
	results, err := m.vs.SemanticSearch(context.Background(), "", 1000)
	if err != nil {
		return nil, err
	}

	var genericResults []map[string]interface{}
	for _, r := range results {
		content := r.Content
		if m.enc != nil && IsEncrypted(content) {
			if dec, err := m.enc.Decrypt(content); err == nil {
				content = dec
			}
		}
		genericResults = append(genericResults, map[string]interface{}{
			"id":               r.ID,
			"session_id":       r.SessionID,
			"type":             string(r.Type),
			"content":          content,
			"importance":       r.Importance,
			"heat_score":       r.HeatScore,
			"last_accessed_at": r.LastAccessedAt,
			"created_at":       r.CreatedAt,
		})
	}
	return genericResults, nil
}

func (m *Manager) GetMemories() []string {
	all, _ := m.GetAll()
	var contents []string
	for _, item := range all {
		if content, ok := item["content"].(string); ok {
			contents = append(contents, content)
		}
	}
	return contents
}

func (m *Manager) AddMemory(mem string) {
	if m.vs == nil {
		return
	}

	// Encrypt content at rest if key is configured
	content := mem
	if m.enc != nil {
		if enc, err := m.enc.Encrypt(mem); err == nil {
			content = enc
		}
	}

	entry := controlplane.L2VaultRecord{
		ID:         fmt.Sprintf("mem-%d", SystemNowUnixNano()),
		SessionID:  "manual",
		Type:       controlplane.MemoryLongTerm,
		Content:    content,
		Importance: 0.5,
		CreatedAt:  controlplane.Now(),
	}
	_ = m.vs.Commit(context.Background(), entry)
}

// SystemNowUnixNano is a helper to get unique IDs
func SystemNowUnixNano() int64 {
	return controlplane.Now().UnixNano()
}

// RecordVersion stores a version snapshot for a memory before it is updated.
func (m *Manager) RecordVersion(id, content, reason string) {
	m.verMu.Lock()
	defer m.verMu.Unlock()
	ver := len(m.versions[id]) + 1
	m.versions[id] = append(m.versions[id], MemoryVersion{
		Version:   ver,
		Content:   content,
		ChangedAt: time.Now().UTC(),
		Reason:    reason,
	})
}

// VersionHistory returns the version snapshots for a memory (oldest first).
func (m *Manager) VersionHistory(id string) []MemoryVersion {
	m.verMu.RLock()
	defer m.verMu.RUnlock()
	h := m.versions[id]
	out := make([]MemoryVersion, len(h))
	copy(out, h)
	sort.Slice(out, func(i, j int) bool { return out[i].Version < out[j].Version })
	return out
}

// GetVersion returns a specific historical version of a memory.
func (m *Manager) GetVersion(id string, version int) (*MemoryVersion, bool) {
	m.verMu.RLock()
	defer m.verMu.RUnlock()
	for i := range m.versions[id] {
		if m.versions[id][i].Version == version {
			return &m.versions[id][i], true
		}
	}
	return nil, false
}

// VersionedMemoryIDs returns IDs that have version history.
func (m *Manager) VersionedMemoryIDs() []string {
	m.verMu.RLock()
	defer m.verMu.RUnlock()
	ids := make([]string, 0, len(m.versions))
	for id := range m.versions {
		ids = append(ids, id)
	}
	sort.Strings(ids)
	return ids
}
