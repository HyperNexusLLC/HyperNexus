#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

VER=$(cat VERSION 2>/dev/null || echo "dev")

echo "╔════════════════════════════════════════════════╗"
echo "║         HyperNexus v${VER}                                  ║"
echo "║         The Neural Operating System            ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# ── 1. Build Go Kernel ───────────────────────────
if command -v go &>/dev/null; then
	echo "[1/4] Building Go kernel..."
	(cd go && go build -ldflags "-s -w -X gitlab.com/HyperNexusLLC/HyperNexus/internal/buildinfo.Version=${VER}" -buildvcs=false -o ../bin/hypernexus ./cmd/hypernexus 2>/dev/null) && echo "      ✓ bin/hypernexus built" || echo "      [WARN] Go build failed"
else
	echo "[1/4] Go not found — skipping kernel build."
fi

# ── 2. Install Dependencies ──────────────────────
echo "[2/4] Installing dependencies..."
HYPERNEXUS_SKIP_INSTALL="${HYPERNEXUS_SKIP_INSTALL:-0}"
if [ "$HYPERNEXUS_SKIP_INSTALL" = "1" ]; then
	echo "      Skipping (HYPERNEXUS_SKIP_INSTALL=1)"
else
	pnpm install --frozen-lockfile 2>/dev/null || pnpm install
fi

# ── 3. Rebuild native modules ────────────────────
echo "[3/4] Rebuilding native modules..."
HYPERNEXUS_SKIP_NATIVE="${HYPERNEXUS_SKIP_NATIVE:-0}"
if [ "$HYPERNEXUS_SKIP_NATIVE" != "1" ]; then
	pnpm rebuild better-sqlite3 2>/dev/null || true
fi

# ── 4. Launch Go Kernel ──────────────────────────
echo "[4/4] Starting Go kernel..."

GO_PORT="${HYPERNEXUS_GO_PORT:-7778}"
DASHBOARD_PORT="${HYPERNEXUS_DASHBOARD_PORT:-7779}"

if [ -x bin/hypernexus ]; then
	echo "      Starting Go kernel on port ${GO_PORT}..."
	bin/hypernexus serve --port "$GO_PORT" &>/dev/null &
	GO_PID=$!
fi

echo ""
echo "  ✓ Go kernel:  http://127.0.0.1:${GO_PORT}/api/index"
echo "  ✓ Health:     http://127.0.0.1:${GO_PORT}/health"
echo "  ✓ Dashboard:  http://localhost:${DASHBOARD_PORT}/dashboard"
echo ""
echo "  The Go kernel is the sole control plane."
echo "  Set HYPERNEXUS_TRPC_UPSTREAM to enable an external tRPC upstream."
echo ""
echo "  Press Ctrl+C to stop all services."
echo ""

cleanup() {
	echo ""
	echo "Shutting down..."
	[ -n "${GO_PID:-}" ] && kill "$GO_PID" 2>/dev/null
	exit 0
}
trap cleanup SIGINT SIGTERM

# Wait for the Go kernel to exit
[ -n "${GO_PID:-}" ] && wait "$GO_PID"
