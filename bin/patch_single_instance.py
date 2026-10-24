import shutil

# 1. Add PID to lockfile Record
p = r"C:\Users\hyper\workspace\HyperNexus\go\internal\lockfile\lockfile.go"
src = open(p, encoding="utf-8").read()

old = "type Record struct {\n\tHost      string             `json:\"host\"`\n\tPort      int                `json:\"port\"`\n\tVersion   string             `json:\"version\"`\n\tStartedAt string             `json:\"startedAt\"`\n\tStartup   *StartupProvenance `json:\"startup,omitempty\"`\n}"
new = "type Record struct {\n\tHost      string             `json:\"host\"`\n\tPort      int                `json:\"port\"`\n\tPID       int                `json:\"pid,omitempty\"`\n\tVersion   string             `json:\"version\"`\n\tStartedAt string             `json:\"startedAt\"`\n\tStartup   *StartupProvenance `json:\"startup,omitempty\"`\n}"

if old not in src:
    print("WARN: lockfile Record anchor not found")
else:
    src = src.replace(old, new, 1)
    tmp = p + ".tmp"
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        f.write(src)
    shutil.move(tmp, p)
    print("OK: lockfile PID field added")

# 2. Add single-instance guard to runServe
p2 = r"C:\Users\hyper\workspace\HyperNexus\go\cmd\tormentnexus\main.go"
src2 = open(p2, encoding="utf-8").read()

old2 = '''	record := lockfile.Record{
		Host:      cfg.Host,
		Port:      cfg.Port,
		Version:   buildinfo.Version,
		StartedAt: time.Now().UTC().Format(time.RFC3339),
	}
	if err := lockfile.Write(cfg.LockPath(), record); err != nil {
		log.Printf("failed to write lock file: %v", err)
		return 1
	}'''

new2 = '''	// Single-instance guard: refuse to start if the port is already serving.
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
	}'''

if old2 not in src2:
    print("WARN: runServe lockfile anchor not found")
    idx = src2.find("lockfile.Record{")
    if idx >= 0:
        print(repr(src2[max(0,idx-100):idx+200]))
    else:
        print("lockfile.Record not found at all")
else:
    src2 = src2.replace(old2, new2, 1)
    tmp = p2 + ".tmp"
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        f.write(src2)
    shutil.move(tmp, p2)
    print("OK: single-instance guard added")

# 3. Ensure imports are present
if '"net/http"' not in src2:
    src2 = open(p2, encoding="utf-8").read()
    src2 = src2.replace('import (\n', 'import (\n\t"net/http"\n', 1)
    tmp = p2 + ".tmp"
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        f.write(src2)
    shutil.move(tmp, p2)
    print("OK: net/http import added")
else:
    print("OK: net/http already imported")

if '"fmt"' not in src2:
    src2 = open(p2, encoding="utf-8").read()
    src2 = src2.replace('import (\n', 'import (\n\t"fmt"\n', 1)
    tmp = p2 + ".tmp"
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        f.write(src2)
    shutil.move(tmp, p2)
    print("OK: fmt import added")
else:
    print("OK: fmt already imported")

print("DONE")
