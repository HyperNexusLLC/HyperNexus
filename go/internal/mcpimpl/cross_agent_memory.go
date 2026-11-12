package mcpimpl

import (
	"context"
	"fmt"
	"sort"
	"sync"
	"time"
)

// CrossAgentMemory is a shared key-value store accessible by all agents.
// Entries have optional TTL and RBAC-based access control.
type CrossAgentMemory struct {
	mu      sync.RWMutex
	entries map[string]*CrossAgentEntry
}

type CrossAgentEntry struct {
	Key       string    `json:"key"`
	Value     string    `json:"value"`
	Agent     string    `json:"agent"` // who wrote it
	ReadACL   []string  `json:"readACL,omitempty"`
	WriteACL  []string  `json:"writeACL,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
	ExpiresAt time.Time `json:"expiresAt,omitempty"`
}

var sharedMemory = &CrossAgentMemory{entries: map[string]*CrossAgentEntry{}}

// SharedMemory returns the global cross-agent memory instance.
func SharedMemory() *CrossAgentMemory {
	return sharedMemory
}

// Put stores a value with optional TTL (days) and ACLs.
func (m *CrossAgentMemory) Put(key, value, agent string, ttlDays int, readACL, writeACL []string) *CrossAgentEntry {
	m.mu.Lock()
	defer m.mu.Unlock()
	now := time.Now().UTC()
	entry := &CrossAgentEntry{
		Key:       key,
		Value:     value,
		Agent:     agent,
		ReadACL:   readACL,
		WriteACL:  writeACL,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if ttlDays > 0 {
		entry.ExpiresAt = now.Add(time.Duration(ttlDays) * 24 * time.Hour)
	}
	m.entries[key] = entry
	return entry
}

// Get retrieves a value if the agent has read access and the entry hasn't expired.
func (m *CrossAgentMemory) Get(key, agent string) (*CrossAgentEntry, string) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	entry, ok := m.entries[key]
	if !ok {
		return nil, "key not found"
	}
	if !entry.ExpiresAt.IsZero() && time.Now().After(entry.ExpiresAt) {
		return nil, "entry expired"
	}
	if !hasAccess(entry.ReadACL, agent) {
		return nil, "read access denied"
	}
	return entry, ""
}

// Delete removes an entry if the agent has write access.
func (m *CrossAgentMemory) Delete(key, agent string) string {
	m.mu.Lock()
	defer m.mu.Unlock()
	entry, ok := m.entries[key]
	if !ok {
		return "key not found"
	}
	if !hasAccess(entry.WriteACL, agent) {
		return "write access denied"
	}
	delete(m.entries, key)
	return ""
}

// List returns keys visible to the agent (read ACL), sorted.
func (m *CrossAgentMemory) List(agent string) []string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var keys []string
	for k, e := range m.entries {
		if !e.ExpiresAt.IsZero() && time.Now().After(e.ExpiresAt) {
			continue
		}
		if hasAccess(e.ReadACL, agent) {
			keys = append(keys, k)
		}
	}
	sort.Strings(keys)
	return keys
}

// Count returns total (non-expired) entries.
func (m *CrossAgentMemory) Count() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	n := 0
	for _, e := range m.entries {
		if e.ExpiresAt.IsZero() || time.Now().Before(e.ExpiresAt) {
			n++
		}
	}
	return n
}

// hasAccess checks ACL. Empty ACL = public (everyone).
func hasAccess(acl []string, agent string) bool {
	if len(acl) == 0 {
		return true
	}
	for _, a := range acl {
		if a == agent || a == "*" {
			return true
		}
	}
	return false
}

// HandleMemorixRead reads from cross-agent memory.
func HandleMemorixRead(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	key, _ := getString(args, "key")
	agent, _ := getString(args, "agent")
	if key == "" {
		return err("key is required")
	}
	if agent == "" {
		agent = "anonymous"
	}
	entry, errMsg := SharedMemory().Get(key, agent)
	if errMsg != "" {
		return err(fmt.Sprintf("Memorix [%s] key=%q: %s", agent, key, errMsg))
	}
	return ok(fmt.Sprintf("Memorix [agent=%s] key=%q:\nValue: %s\nWritten by: %s at %s",
		agent, key, entry.Value, entry.Agent, entry.UpdatedAt.Format(time.RFC3339)))
}

// HandleMemorixWrite writes to cross-agent memory.
func HandleMemorixWrite(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	key, _ := getString(args, "key")
	value, _ := getString(args, "value")
	agent, _ := getString(args, "agent")
	ttlDays, _ := getInt(args, "ttlDays", 7)
	if key == "" || value == "" {
		return err("key and value are required")
	}
	if agent == "" {
		agent = "anonymous"
	}
	// Check write ACL on existing entry
	if existing, _ := SharedMemory().Get(key, agent); existing != nil {
		if errMsg := SharedMemory().Delete(key, agent); errMsg != "" {
			return err(fmt.Sprintf("Memorix write denied for key=%q: %s", key, errMsg))
		}
	}
	entry := SharedMemory().Put(key, value, agent, ttlDays, nil, nil)
	return ok(fmt.Sprintf("Memorix written: %s = %s\nShared across all connected agents\nTTL: %d days (expires %s)",
		key, truncateStr(value, 80), ttlDays, entry.ExpiresAt.Format(time.RFC3339)))
}

// HandleMemorixList lists cross-agent memory keys.
func HandleMemorixList(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	agent, _ := getString(args, "agent")
	if agent == "" {
		agent = "anonymous"
	}
	keys := SharedMemory().List(agent)
	if len(keys) == 0 {
		return ok(fmt.Sprintf("Memorix: no shared keys visible to agent=%s", agent))
	}
	return ok(fmt.Sprintf("Memorix: %d keys visible to agent=%s:\n  %s", len(keys), agent, joinStrings(keys, ", ")))
}


