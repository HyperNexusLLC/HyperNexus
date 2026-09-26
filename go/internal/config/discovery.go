package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

// ServiceDiscovery holds resolved endpoints for all HyperNexus services.
type ServiceDiscovery struct {
	// KernelPort is the port the Go control plane listens on.
	KernelPort int

	// TRPCUpstreamURLs are the tRPC endpoints for an external TypeScript
	// control plane. Empty by default — the Go kernel is the sole control
	// plane since the legacy hypernexus-core decommission at v1.0.0-alpha.251.
	// Set HYPERNEXUS_TRPC_UPSTREAM to enable upstream calls.
	TRPCUpstreamURLs []string

	// DashboardPort is the Next.js web dashboard port.
	DashboardPort int

	// DashboardHost is the Next.js web dashboard host.
	DashboardHost string
}

// DefaultServiceDiscovery returns the standard HyperNexus service topology.
// Production runs the Go kernel on 7778 and the Next.js dashboard on 7779.
func DefaultServiceDiscovery() ServiceDiscovery {
	sd := ServiceDiscovery{
		KernelPort:       7778,
		TRPCUpstreamURLs: nil,
		DashboardPort:    7779,
		DashboardHost:    "localhost",
	}

	// Override from environment variables
	if v := os.Getenv("HYPERNEXUS_GO_PORT"); v != "" {
		if p, err := strconv.Atoi(v); err == nil && p > 0 {
			sd.KernelPort = p
		}
	}

	// External tRPC upstream — opt-in only. The legacy TypeScript control
	// plane (hypernexus-core) was decommissioned at v1.0.0-alpha.251.
	if v := strings.TrimSpace(os.Getenv("HYPERNEXUS_TRPC_UPSTREAM")); v != "" {
		sd.TRPCUpstreamURLs = append(sd.TRPCUpstreamURLs, v)
	}
	if v := strings.TrimSpace(os.Getenv("HYPERNEXUS_TRPC_PORT")); v != "" {
		if p, err := strconv.Atoi(v); err == nil && p > 0 {
			sd.TRPCUpstreamURLs = append(sd.TRPCUpstreamURLs, fmt.Sprintf("http://127.0.0.1:%d/trpc", p))
		}
	}

	if v := os.Getenv("HYPERNEXUS_DASHBOARD_PORT"); v != "" {
		if p, err := strconv.Atoi(v); err == nil && p > 0 {
			sd.DashboardPort = p
		}
	}

	if v := os.Getenv("HYPERNEXUS_DASHBOARD_HOST"); v != "" {
		sd.DashboardHost = v
	}

	sd.TRPCUpstreamURLs = dedupStrings(sd.TRPCUpstreamURLs)

	return sd
}

// DashboardBaseURL returns the fully qualified dashboard URL.
func (sd ServiceDiscovery) DashboardBaseURL() string {
	return "http://" + sd.DashboardHost + ":" + strconv.Itoa(sd.DashboardPort)
}

// KernelBaseURL returns the fully qualified Go kernel URL.
func (sd ServiceDiscovery) KernelBaseURL() string {
	return "http://127.0.0.1:" + strconv.Itoa(sd.KernelPort)
}

func dedupStrings(items []string) []string {
	seen := make(map[string]struct{}, len(items))
	result := make([]string, 0, len(items))
	for _, item := range items {
		normalized := strings.TrimSpace(strings.TrimRight(item, "/"))
		if normalized == "" {
			continue
		}
		if _, ok := seen[normalized]; ok {
			continue
		}
		seen[normalized] = struct{}{}
		result = append(result, normalized)
	}
	return result
}
