package config

import (
	"testing"
)

func TestDefaultServiceDiscovery(t *testing.T) {
	sd := DefaultServiceDiscovery()
	if sd.KernelPort != 7778 {
		t.Errorf("expected KernelPort=7778, got %d", sd.KernelPort)
	}
	if sd.DashboardPort != 7779 {
		t.Errorf("expected DashboardPort=7779, got %d", sd.DashboardPort)
	}
	if len(sd.TRPCUpstreamURLs) != 0 {
		t.Errorf("expected 0 default tRPC URLs, got %d", len(sd.TRPCUpstreamURLs))
	}
}

func TestServiceDiscoveryFromEnv(t *testing.T) {
	t.Setenv("HYPERNEXUS_GO_PORT", "5500")
	t.Setenv("HYPERNEXUS_TRPC_UPSTREAM", "http://192.168.1.100:7779/trpc")
	t.Setenv("HYPERNEXUS_DASHBOARD_PORT", "8080")

	sd := DefaultServiceDiscovery()

	if sd.KernelPort != 5500 {
		t.Errorf("expected KernelPort=5500, got %d", sd.KernelPort)
	}
	if sd.DashboardPort != 8080 {
		t.Errorf("expected DashboardPort=8080, got %d", sd.DashboardPort)
	}
	if len(sd.TRPCUpstreamURLs) == 0 || sd.TRPCUpstreamURLs[0] != "http://192.168.1.100:7779/trpc" {
		t.Errorf("expected env tRPC URL first, got %v", sd.TRPCUpstreamURLs)
	}
}

func TestServiceDiscoveryDedupTRPCURLs(t *testing.T) {
	t.Setenv("HYPERNEXUS_TRPC_UPSTREAM", "http://127.0.0.1:7779/trpc")
	t.Setenv("HYPERNEXUS_TRPC_PORT", "7779")
	sd := DefaultServiceDiscovery()

	count := 0
	for _, u := range sd.TRPCUpstreamURLs {
		if u == "http://127.0.0.1:7779/trpc" {
			count++
		}
	}
	if count != 1 {
		t.Errorf("expected exactly 1 occurrence of http://127.0.0.1:7779/trpc, got %d", count)
	}
}

func TestServiceDiscoveryBaseURLs(t *testing.T) {
	sd := ServiceDiscovery{
		DashboardHost: "myhost",
		DashboardPort: 7779,
		KernelPort:    7778,
	}

	if sd.DashboardBaseURL() != "http://myhost:7779" {
		t.Errorf("expected http://myhost:7779, got %s", sd.DashboardBaseURL())
	}
	if sd.KernelBaseURL() != "http://127.0.0.1:7778" {
		t.Errorf("expected http://127.0.0.1:7778, got %s", sd.KernelBaseURL())
	}
}

func TestServiceDiscoveryInvalidEnvPort(t *testing.T) {
	t.Setenv("HYPERNEXUS_GO_PORT", "not-a-number")
	sd := DefaultServiceDiscovery()

	if sd.KernelPort != 7778 {
		t.Errorf("expected default KernelPort=7778, got %d", sd.KernelPort)
	}
}

func TestDedupStrings(t *testing.T) {
	tests := []struct {
		name     string
		input    []string
		expected []string
	}{
		{"empty", []string{}, []string{}},
		{"no dups", []string{"a", "b", "c"}, []string{"a", "b", "c"}},
		{"with dups", []string{"a", "b", "a", "c", "b"}, []string{"a", "b", "c"}},
		{"trailing slash normalization", []string{"http://x:7779/trpc/", "http://x:7779/trpc"}, []string{"http://x:7779/trpc"}},
		{"whitespace trim", []string{"  a  ", "a"}, []string{"a"}},
		{"empty strings skipped", []string{"", "a", ""}, []string{"a"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := dedupStrings(tt.input)
			if len(result) != len(tt.expected) {
				t.Fatalf("expected %v, got %v", tt.expected, result)
			}
			for i, v := range result {
				if v != tt.expected[i] {
					t.Errorf("at index %d: expected %q, got %q", i, tt.expected[i], v)
				}
			}
		})
	}
}
