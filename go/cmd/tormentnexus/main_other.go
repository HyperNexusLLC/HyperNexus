//go:build !windows

// Non-Windows no-op for the console title. The real implementation (kernel32 /
// user32 syscall) is Windows-only and lives in main_windows.go. Splitting the
// platform files keeps Linux/Darwin builds compiling (syscall.NewLazyDLL does not
// exist outside Windows).
package main

// setConsoleTitle is a no-op on non-Windows (there is no Windows console to
// title). Kept so the call site is identical across platforms.
func setConsoleTitle(title string) {}
