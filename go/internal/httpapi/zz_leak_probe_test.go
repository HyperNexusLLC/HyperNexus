package httpapi

import (
	"fmt"
	"os"
	"runtime"
	"testing"
	"time"

	"gitlab.com/HyperNexusLLC/HyperNexus/internal/config"
)

// TestZZGoroutineLeakProbe is a diagnostic: build one server with background
// services disabled, wait briefly, then print every goroutine that is still
// alive. Anything unexpected is a leak the gate missed. Skipped unless
// HN_LEAK_PROBE=1 so the normal suite stays clean.
func TestZZGoroutineLeakProbe(t *testing.T) {
	if os.Getenv("HN_LEAK_PROBE") == "" {
		t.Skip("set HN_LEAK_PROBE=1 to run the goroutine leak probe")
	}
	before := runtime.NumGoroutine()
	server := New(config.Default(), stubDetector{})
	time.Sleep(6 * time.Second)
	after := runtime.NumGoroutine()
	fmt.Printf("LEAK-PROBE goroutines before=%d after=%d\n", before, after)

	buf := make([]byte, 1<<20)
	n := runtime.Stack(buf, true)
	stacks := string(buf[:n])
	// Print only the "created by" lines - they identify every live goroutine's origin.
	for _, line := range splitLines(stacks) {
		if len(line) > 12 && (line[0] == 'g' && line[1] >= '0' && line[1] <= '9') {
			fmt.Printf("LEAK-PROBE GOROUTINE %s\n", line)
		}
		if len(line) > 13 && line[:13] == "created by " {
			fmt.Printf("LEAK-PROBE   %s\n", line)
		}
	}
	_ = server
}

func splitLines(s string) []string {
	var out []string
	start := 0
	for i := 0; i < len(s); i++ {
		if s[i] == '\n' {
			out = append(out, s[start:i])
			start = i + 1
		}
	}
	if start < len(s) {
		out = append(out, s[start:])
	}
	return out
}
