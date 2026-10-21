package main

import (
	"syscall"
	"unsafe"
	"bytes"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"runtime/debug"
	"strings"
	"time"

	"gitlab.com/HyperNexusLLC/HyperNexus/foundation/adapters"
	"gitlab.com/HyperNexusLLC/HyperNexus/internal/buildinfo"
	"gitlab.com/HyperNexusLLC/HyperNexus/internal/config"
	"gitlab.com/HyperNexusLLC/HyperNexus/internal/controlplane"
	"gitlab.com/HyperNexusLLC/HyperNexus/internal/httpapi"
	"gitlab.com/HyperNexusLLC/HyperNexus/internal/license"
	"gitlab.com/HyperNexusLLC/HyperNexus/internal/lockfile"
	"gitlab.com/HyperNexusLLC/HyperNexus/internal/protocol"
	"gitlab.com/HyperNexusLLC/HyperNexus/internal/sessionimport"
	"path/filepath"
)

func main() {
	os.Exit(run(os.Args[1:]))
}

// installCrashCapture redirects the runtime's crash output (unrecoverable
// fatals like "concurrent map iteration and map write", unrecovered panics,
// out-of-memory) to .hypernexus/kernel-crash.log. Without this the fatal text
// is lost to whichever parent spawned us, and every crash is undiagnosable.
func installCrashCapture() {
	root := strings.TrimSpace(os.Getenv("HYPERNEXUS_WORKSPACE_ROOT"))
	if root == "" {
		if cwd, err := os.Getwd(); err == nil {
			root = cwd
		}
	}
	if root == "" {
		return
	}
	dir := filepath.Join(root, ".hypernexus")
	_ = os.MkdirAll(dir, 0o755)
	f, err := os.OpenFile(filepath.Join(dir, "kernel-crash.log"), os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
	if err != nil {
		return
	}
	debug.SetCrashOutput(f, debug.CrashOptions{})
}

func run(args []string) int {
	installCrashCapture()
	// Check if this is first run - auto-install if needed
	if isFirstRun() {
		log.Printf("First run detected - running installation...")
		cmdInstall(nil)
	}
	
	command := "serve"
	if len(args) > 0 {
		if strings.HasPrefix(args[0], "hypernexus://") {
			return runDeepLink(args[0])
		}
		switch args[0] {
		case "serve", "version", "start", "stop", "status", "mcp", "register-protocol", "install":
			command = args[0]
			args = args[1:]
		}
	}

	switch command {
	case "version":
		fmt.Println(buildinfo.Version)
		return 0
	case "serve":
		return runServe(args)
	case "start":
		return cmdStart(args)
	case "stop":
		return cmdStop(args)
	case "status":
		return cmdStatus(args)
	case "mcp":
		return cmdMCP(args)
	case "register-protocol":
		return cmdRegisterProtocol(args)
	case "install":
		return cmdInstall(args)
	default:
		log.Printf("unknown command %q", command)
		return 1
	}
}

func cmdRegisterProtocol(args []string) int {
	log.Printf("Registering hypernexus:// protocol handler...")
	if err := protocol.RegisterProtocol(); err != nil {
		log.Printf("[ERROR] failed to register protocol handler: %v", err)
		return 1
	}
	log.Printf("Successfully registered hypernexus:// protocol handler in Windows registry.")
	return 0
}

func cmdInstall(args []string) int {
	log.Printf("Installing HyperNexus...")
	
	// Get the path to the current executable
	exePath, err := os.Executable()
	if err != nil {
		log.Printf("[ERROR] failed to get executable path: %v", err)
		return 1
	}
	
	// Resolve any symlinks
	exePath, err = filepath.EvalSymlinks(exePath)
	if err != nil {
		log.Printf("[ERROR] failed to resolve symlinks: %v", err)
		return 1
	}
	
	// Inject MCP config into Claude Desktop
	log.Printf("Configuring Claude Desktop...")
	if err := adapters.InjectMCPIntoClaudeDesktop(exePath); err != nil {
		log.Printf("[WARN] Could not configure Claude Desktop: %v", err)
	} else {
		log.Printf("✓ Claude Desktop configured with HyperNexus MCP server")
	}
	
	// Install Claude Desktop extension
	log.Printf("Installing Claude Desktop extension...")
	if err := adapters.InstallClaudeDesktopExtension(); err != nil {
		log.Printf("[WARN] Could not install Claude Desktop extension: %v", err)
	} else {
		log.Printf("✓ Claude Desktop extension installed")
	}
	
	// Create config directory
	configDir := filepath.Join(os.Getenv("USERPROFILE"), ".hypernexus")
	if _, err := os.Stat(configDir); os.IsNotExist(err) {
		os.MkdirAll(configDir, 0755)
	}
	
	// Mark as installed
	markInstalled()
	
	log.Printf("\nInstallation complete!")
	log.Printf("Please restart Claude Desktop to load the HyperNexus MCP server.")
	return 0
}

// isFirstRun checks if this is the first time running HyperNexus
func isFirstRun() bool {
	// Check for .hypernexus directory
	configDir := filepath.Join(os.Getenv("USERPROFILE"), ".hypernexus")
	if _, err := os.Stat(configDir); os.IsNotExist(err) {
		return true
	}
	
	// Check for installed marker file
	markerFile := filepath.Join(configDir, ".installed")
	if _, err := os.Stat(markerFile); os.IsNotExist(err) {
		return true
	}
	
	return false
}

// markInstalled creates a marker file to indicate installation is complete
func markInstalled() {
	configDir := filepath.Join(os.Getenv("USERPROFILE"), ".hypernexus")
	os.MkdirAll(configDir, 0755)
	markerFile := filepath.Join(configDir, ".installed")
	os.WriteFile(markerFile, []byte(time.Now().Format(time.RFC3339)), 0644)
}

func runDeepLink(deepLink string) int {
	cfg := config.Default()
	record, err := lockfile.Read(cfg.LockPath())
	if err != nil {
		log.Printf("HyperNexus TN Kernel is not currently running. Please start it using 'hypernexus serve' first.")
		return 1
	}

	targetURL := fmt.Sprintf("http://%s:%d/api/native/protocol/hypernexus", record.Host, record.Port)

	payload, err := json.Marshal(map[string]string{"url": deepLink})
	if err != nil {
		log.Printf("Failed to marshal deep link payload: %v", err)
		return 1
	}

	resp, err := http.Post(targetURL, "application/json", bytes.NewBuffer(payload))
	if err != nil {
		log.Printf("Failed to dispatch deep link to running HyperNexus server: %v", err)
		return 1
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		log.Printf("Server returned error (%d): %s", resp.StatusCode, string(body))
		return 1
	}

	log.Printf("Deep link dispatched successfully: %s", string(body))
	return 0
}

// setConsoleTitle sets the Windows console window title via kernel32.
// Falls back silently on non-Windows or when no console is attached.
func setConsoleTitle(title string) {
	k32 := syscall.NewLazyDLL("kernel32.dll")
	u32 := syscall.NewLazyDLL("user32.dll")

	// Set the console's internal title buffer
	if proc := k32.NewProc("SetConsoleTitleW"); proc != nil {
		ptr, _ := syscall.UTF16PtrFromString(title)
		proc.Call(uintptr(unsafe.Pointer(ptr)))
	}

	// Also set the window text directly — on modern Windows, conhost and
	// Windows Terminal manage the visible title separately from the console
	// title buffer, so Get-Process.MainWindowTitle may still show the old label.
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

func runServe(args []string) int {
	cfg := config.Default()

	fs := flag.NewFlagSet("serve", flag.ContinueOnError)
	fs.StringVar(&cfg.Host, "host", cfg.Host, "Host to bind the experimental Go cli-orchestrator port to.")
	fs.IntVar(&cfg.Port, "port", cfg.Port, "Port to bind the experimental Go cli-orchestrator port to.")
	fs.StringVar(&cfg.ConfigDir, "config-dir", cfg.ConfigDir, "Config directory for the experimental Go cli-orchestrator port.")
	if err := fs.Parse(args); err != nil {
		log.Printf("failed to parse flags: %v", err)
		return 2
	}

	// Verify offline license if present in workspace root
	licPath := filepath.Join(cfg.WorkspaceRoot, "hypernexus.lic")
	if _, err := os.Stat(licPath); err == nil {
		lic, err := license.VerifyLicense(cfg.WorkspaceRoot)
		if err != nil {
			log.Printf("License validation failed: %v", err)
			return 1
		}
		log.Printf("Licensed to: %s (Seats: %d, Expires: %s)", lic.Holder, lic.Seats, lic.ExpiresAt.Format(time.RFC822))
	} else {
		log.Printf("No hypernexus.lic license file found. Running under free limitations.")
	}

	// Single-instance guard: refuse to start if the port is already serving.
	// Use a direct TCP dial (no proxy) — Go's http.Client routes localhost through
	// system proxies on Windows, which would false-negative the health probe.
	checkAlive := func(host string, port int) bool {
		addr := fmt.Sprintf("%s:%d", host, port)
		conn, err := net.DialTimeout("tcp", addr, 1500*time.Millisecond)
		if err != nil {
			return false
		}
		_ = conn.Close()
		return true
	}
	if existing, err := lockfile.Read(cfg.LockPath()); err == nil {
		if checkAlive(existing.Host, existing.Port) {
			log.Printf("Another HyperNexus instance is already running on %s:%d (pid %d, started %s). Refusing to start a second instance. Use /api/shutdown to stop it first.", existing.Host, existing.Port, existing.PID, existing.StartedAt)
			return 0
		}
		log.Printf("Stale lock file found (previous instance on %s:%d is gone). Proceeding with startup.", existing.Host, existing.Port)
		_ = os.Remove(cfg.LockPath())
	} else if checkAlive(cfg.Host, cfg.Port) {
		// No lock file but the port is live — still refuse.
		log.Printf("Port %s:%d is already in use by a running HyperNexus instance (no lock file). Refusing to start.", cfg.Host, cfg.Port)
		return 0
	}

	record := lockfile.Record{
		Host:      cfg.Host,
		Port:      cfg.Port,
		PID:       os.Getpid(),
		Version:   buildinfo.Version,
		StartedAt: time.Now().UTC().Format(time.RFC3339),
	}
	if err := lockfile.Write(cfg.LockPath(), record); err != nil {
		log.Printf("failed to write lock file: %v", err)
		return 1
	}
	defer func() {
		_ = os.Remove(cfg.LockPath())
	}()

	// Set console window title so it doesn't inherit a stale label
	// (e.g. "pi" from a prior Pi CLI session in the same terminal).
	setConsoleTitle("HyperNexus — " + buildinfo.Version)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	detector := controlplane.NewDetector(1500*time.Millisecond, 30*time.Minute)
	server := httpapi.New(cfg, detector)

	// Pre-warm caches in the background
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		_, _ = detector.DetectAll(ctx)
	}()
	go func() {
		// Pre-warm import scan cache
		homeDir, _ := os.UserHomeDir()
		if homeDir == "" {
			homeDir = cfg.MainConfigDir
		}
		scanner := sessionimport.NewScanner(cfg.WorkspaceRoot, homeDir, 50)
		results, _ := scanner.ScanValidated()
		server.PreWarmImportCache(results)
	}()

	log.Printf(
		"Experimental Go cli-orchestrator port listening on %s (index: %s/api/index, runtime: %s/api/runtime/status, cli: %s/api/cli/summary, import: %s/api/import/summary, providers: %s/api/providers/routing-summary)",
		cfg.BaseURL(),
		cfg.BaseURL(),
		cfg.BaseURL(),
		cfg.BaseURL(),
		cfg.BaseURL(),
		cfg.BaseURL(),
	)
	server.PreWarmCaches()
	if err := server.ListenAndServe(ctx); err != nil {
		log.Printf("server failed: %v", err)
		return 1
	}

	return 0
}
