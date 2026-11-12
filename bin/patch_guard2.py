import shutil
p = r"C:\Users\hyper\workspace\HyperNexus\go\cmd\tormentnexus\main.go"
src = open(p, encoding="utf-8").read()

old = '''	// Single-instance guard: refuse to start if the port is already serving.
	if existing, err := lockfile.Read(cfg.LockPath()); err == nil {
		healthURL := fmt.Sprintf("http://%s:%d/health", existing.Host, existing.Port)
		client := http.Client{ Timeout: 1500 * time.Millisecond }
		if resp, err := client.Get(healthURL); err == nil {
			_ = resp.Body.Close()
			log.Printf("Another HyperNexus instance is already running on %s:%d (pid %d, started %s). Refusing to start a second instance. Use /api/shutdown to stop it first.", existing.Host, existing.Port, existing.PID, existing.StartedAt)
			return 0
		}
		// Stale lock (process dead or port free) — clean it up and proceed.
		log.Printf("Stale lock file found (previous instance on %s:%d is gone). Proceeding with startup.", existing.Host, existing.Port)
		_ = os.Remove(cfg.LockPath())
	}'''

new = '''	// Single-instance guard: refuse to start if the port is already serving.
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
	}'''

if old not in src:
    print("ANCHOR NOT FOUND")
    idx = src.find("Single-instance guard")
    if idx >= 0:
        print(repr(src[idx:idx+300]))
    else:
        print("guard marker gone")
else:
    src = src.replace(old, new, 1)
    # Ensure "net" is imported
    if '"net"' not in src and '"net/http"' not in src:
        src = src.replace('import (\n', 'import (\n\t"net"\n', 1)
        print("OK: net import added")
    elif '"net"' not in src:
        src = src.replace('"net/http"', '"net"\n\t"net/http"', 1)
        print("OK: net import added near net/http")
    else:
        print("OK: net already imported")
    tmp = p + ".tmp"
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        f.write(src)
    shutil.move(tmp, p)
    print("PATCHED OK")
