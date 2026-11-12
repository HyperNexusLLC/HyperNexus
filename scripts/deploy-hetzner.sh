#!/bin/bash
set -e

# Check Ollama
if ! command -v ollama &>/dev/null; then
    echo "Installing Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
    echo "Ollama installed"
else
    echo "Ollama already installed"
fi

# Make sure Ollama is running
if ! pgrep -x ollama >/dev/null; then
    echo "Starting Ollama..."
    nohup ollama serve >/dev/null 2>&1 &
    sleep 3
fi

# Pull embedding model if not present
if ! ollama list 2>/dev/null | grep -q nomic-embed-text; then
    echo "Pulling nomic-embed-text..."
    ollama pull nomic-embed-text
else
    echo "nomic-embed-text already available"
fi

# Swap binary
cd /opt/tormentnexus
if [ -f hypernexus-new.exe ]; then
    cp hypernexus.exe hypernexus-old.exe 2>/dev/null || true
    mv hypernexus-new.exe hypernexus.exe
    chmod +x hypernexus.exe
    echo "Binary swapped"
fi

# Restart kernel service
systemctl restart hypernexus-kernel 2>/dev/null || echo "Service restart failed"
sleep 3

# Verify
if curl -s http://127.0.0.1:7778/health | grep -q '"ok":true'; then
    echo "Kernel online"
else
    echo "Kernel not responding"
fi

if curl -s http://localhost:11434/api/tags | grep -q nomic-embed-text; then
    echo "Ollama + nomic-embed-text ready"
else
    echo "Ollama model not ready"
fi