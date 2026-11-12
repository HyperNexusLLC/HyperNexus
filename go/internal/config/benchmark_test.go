package config

import "testing"

func BenchmarkDefaultServiceDiscovery(b *testing.B) {
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = DefaultServiceDiscovery()
	}
}

func BenchmarkDedupStrings(b *testing.B) {
	items := []string{"a", "b", "a", "c", "b", "d", "a", "e"}
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = dedupStrings(items)
	}
}

func BenchmarkKernelBaseURL(b *testing.B) {
	sd := ServiceDiscovery{KernelPort: 7778}
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = sd.KernelBaseURL()
	}
}

func BenchmarkDashboardBaseURL(b *testing.B) {
	sd := ServiceDiscovery{DashboardHost: "localhost", DashboardPort: 7779}
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = sd.DashboardBaseURL()
	}
}
