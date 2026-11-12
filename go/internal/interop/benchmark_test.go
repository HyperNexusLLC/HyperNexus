package interop

import (
	"testing"
)

func BenchmarkResolveTRPCBases(b *testing.B) {
	b.Setenv("HYPERNEXUS_TRPC_UPSTREAM", "http://127.0.0.1:7787/trpc")
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = ResolveTRPCBases("")
	}
}

func BenchmarkResolveTRPCBasesNoEnv(b *testing.B) {
	b.Setenv("HYPERNEXUS_TRPC_UPSTREAM", "")
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = ResolveTRPCBases("")
	}
}

func BenchmarkGetWorkingBase(b *testing.B) {
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = GetWorkingBase()
	}
}

func BenchmarkSetWorkingBase(b *testing.B) {
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		SetWorkingBase("http://127.0.0.1:7787/trpc")
	}
}

func BenchmarkExtractTRPCData(b *testing.B) {
	body := []byte(`{"result":{"data":{"json":{"key":"value","nested":{"a":1,"b":2}}}}}`)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = extractTRPCData(body)
	}
}
