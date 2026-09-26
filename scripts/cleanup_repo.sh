#!/bin/bash
# HyperNexus Repository Cleanup Script
# Removes unnecessary files while preserving functionality

set -e

echo "=== HyperNexus Repository Cleanup ==="
echo ""

# 1. Remove backup directory from tracking
echo "1. Removing backup directory from git tracking..."
git rm -r --cached "..go_backup_old" 2>/dev/null || echo "   Already removed"

# 2. Remove large binary files from tracking
echo "2. Removing large binary files from git tracking..."
git rm --cached tormentnexus-mcp-server 2>/dev/null || echo "   Already removed"
git rm --cached go/tn-kernel-linux 2>/dev/null || echo "   Already removed"
git rm --cached hypernexus_ultimate_agent.mp4 2>/dev/null || echo "   Already removed"

# 3. Remove agent config directories from tracking
echo "3. Removing agent config directories from git tracking..."
for dir in .aider .antigravity .cline .codewhale .editor-configs .gemini .goose .grok .hermes .jules .kilo .grok; do
	if [ -d "$dir" ]; then
		git rm -r --cached "$dir" 2>/dev/null || echo "   $dir already removed"
	fi
done

# 4. Remove duplicate video files
echo "4. Removing duplicate video files..."
git rm --cached landing/tormentnexus.site/tormentnexus_ai_control_plane.mp4 2>/dev/null || echo "   Already removed"
git rm --cached landing/hypernexus.site/hypernexus_ultimate_agent.mp4 2>/dev/null || echo "   Already removed"

# 5. Remove large generated files
echo "5. Removing large generated files..."
git rm --cached .memory/branches/main/log.md 2>/dev/null || echo "   Already removed"
git rm --cached apps/web/.pi-lens/cache/review-graph.json 2>/dev/null || echo "   Already removed"
git rm --cached docs/GLOBAL_LIBRARY_INDEX.md 2>/dev/null || echo "   Already removed"
git rm --cached go/agents/software-agent-sdk/uv.lock 2>/dev/null || echo "   Already removed"

# 6. Remove other unnecessary files
echo "6. Removing other unnecessary files..."
git rm --cached go/hypernexus.db 2>/dev/null || echo "   Already removed"
git rm --cached scripts/twitter_poster_state.json 2>/dev/null || echo "   Already removed"

echo ""
echo "=== Cleanup complete ==="
echo "Run 'git status' to see changes"
echo "Run 'git add .gitignore && git commit -m \"chore: clean up repository\"' to commit"
