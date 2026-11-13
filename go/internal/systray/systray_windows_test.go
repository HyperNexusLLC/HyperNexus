//go:build windows

package systray

import (
	"fmt"
	"strings"
	"testing"
)

func TestSnapshotRecentLogsRingAndDefensiveCopy(t *testing.T) {
	logMutex.Lock()
	orig := logLines
	logLines = nil
	logMutex.Unlock()
	t.Cleanup(func() {
		logMutex.Lock()
		logLines = orig
		logMutex.Unlock()
	})

	if got := snapshotRecentLogs(10); len(got) != 0 {
		t.Fatalf("expected empty snapshot, got %d items", len(got))
	}

	for i := 1; i <= 15; i++ {
		addLogLine(fmt.Sprintf("event-%02d", i))
	}

	last10 := snapshotRecentLogs(10)
	if len(last10) != 10 {
		t.Fatalf("expected 10 items, got %d", len(last10))
	}
	if last10[0] != "event-06" || last10[9] != "event-15" {
		t.Fatalf("unexpected window bounds: first=%q last=%q", last10[0], last10[9])
	}

	// Mutating returned slice must not mutate internal logLines buffer.
	last10[0] = "mutated"
	again := snapshotRecentLogs(10)
	if again[0] != "event-06" {
		t.Fatalf("snapshot aliased internal slice: got %q", again[0])
	}
}

func TestTruncateMenuLineRuneSafe(t *testing.T) {
	short := "⚡ HyperNexus — Ready"
	if got := truncateMenuLine(short, 60); got != short {
		t.Fatalf("expected unchanged %q, got %q", short, got)
	}

	long := strings.Repeat("⚡", 65)
	got := truncateMenuLine(long, 60)
	if len([]rune(got)) != 60 {
		t.Fatalf("expected 60 runes, got %d (%q)", len([]rune(got)), got)
	}
	if !strings.HasSuffix(got, "...") {
		t.Fatalf("expected ellipsis suffix, got %q", got)
	}
}

func TestBuildBackgroundCleanupScriptSafetyScope(t *testing.T) {
	script := buildBackgroundCleanupScript()
	if strings.Contains(strings.ToLower(script), "wmic") {
		t.Fatalf("cleanup script must not rely on deprecated wmic: %s", script)
	}
	for _, needle := range []string{"Get-CimInstance Win32_Process", "watchdog\\.py", "swarm_v7\\.py", "7779"} {
		if !strings.Contains(script, needle) {
			t.Fatalf("expected %q in cleanup script: %s", needle, script)
		}
	}
	if strings.Contains(script, "hypernexus.exe") {
		t.Fatalf("cleanup script must never blanket-kill sibling hypernexus.exe mcp processes: %s", script)
	}
}
