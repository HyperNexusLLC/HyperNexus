//go:build windows

// Windows-only console/window title support. Split from main.go so Linux/Darwin
// builds don't fail on undefined syscall.NewLazyDLL / UTF16PtrFromString.
package main

import (
	"syscall"
	"unsafe"
)

// setConsoleTitle sets the Windows console window title via kernel32, and the
// window text via user32. On modern Windows conhost/Windows Terminal manage the
// visible title separately from the console title buffer, so we set both —
// otherwise Get-Process.MainWindowTitle may still show the old label.
func setConsoleTitle(title string) {
	k32 := syscall.NewLazyDLL("kernel32.dll")
	u32 := syscall.NewLazyDLL("user32.dll")

	// Set the console's internal title buffer
	if proc := k32.NewProc("SetConsoleTitleW"); proc != nil {
		ptr, _ := syscall.UTF16PtrFromString(title)
		proc.Call(uintptr(unsafe.Pointer(ptr)))
	}

	// Also set the window text directly (see note above).
	if getHwnd := k32.NewProc("GetConsoleWindow"); getHwnd != nil {
		hwnd, _, _ := getHwnd.Call()
		if hwnd != 0 {
			if setText := u32.NewProc("SetWindowTextW"); setText != nil {
				ptr, _ := syscall.UTF16PtrFromString(title)
				setText.Call(hwnd, uintptr(unsafe.Pointer(ptr)))
			}
		}
	}
}
