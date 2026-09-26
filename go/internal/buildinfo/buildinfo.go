package buildinfo

import "gitlab.com/HyperNexusLLC/HyperNexus/internal/config"

// Version is set at build time via -ldflags "-X internal/buildinfo.Version=...".
// If not overridden, it falls back to the value below (keep in sync with /VERSION file).
var Version = "1.0.0-b1"

// ProductName returns the display name based on corporate mode.
func ProductName() string {
	return config.GetProductName()
}
