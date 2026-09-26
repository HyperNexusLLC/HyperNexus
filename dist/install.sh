#!/bin/bash
# HyperNexus Installer — Universal AI Client Detection
# Works on Linux, macOS, and Windows (via Git Bash/WSL)
# Usage: curl -fsSL https://hypernexus.site/install.sh | bash

set -e

VERSION="v1.0.0"
BASE_URL="https://releases.hypernexus.site/${VERSION}"
MCP_URL="http://localhost:8080/mcp"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}   HyperNexus Installer ${VERSION}${NC}"
echo -e "${CYAN}   Universal AI Client Integration${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Detect platform
detect_platform() {
    local os arch
    case "$(uname -s)" in
        Linux*)  os="linux" ;;
        Darwin*) os="darwin" ;;
        CYGWIN*|MINGW*|MSYS*) os="windows" ;;
        *) echo -e "${RED}Error: Unsupported platform${NC}"; exit 1 ;;
    esac
    case "$(uname -m)" in
        x86_64|amd64) arch="amd64" ;;
        arm64|aarch64) arch="arm64" ;;
        *) echo -e "${RED}Error: Unsupported architecture${NC}"; exit 1 ;;
    esac
    echo "${os}-${arch}"
}

# Get download URL
get_download_url() {
    local platform="$1"
    case "$platform" in
        windows-*)   echo "${BASE_URL}/hypernexus.exe" ;;
        darwin-arm64) echo "${BASE_URL}/hypernexus-darwin-arm64" ;;
        darwin-*)    echo "${BASE_URL}/hypernexus-darwin-amd64" ;;
        linux-arm64) echo "${BASE_URL}/hypernexus-linux-arm64" ;;
        linux-*)     echo "${BASE_URL}/hypernexus-linux-amd64" ;;
    esac
}

# Download file
download() {
    local url="$1" dest="$2"
    if command -v curl &>/dev/null; then
        curl -fsSL -o "$dest" "$url"
    elif command -v wget &>/dev/null; then
        wget -qO "$dest" "$url"
    else
        echo -e "${RED}Error: curl or wget required${NC}"
        exit 1
    fi
}

# Detect AI clients
detect_clients() {
    local clients=()
    
    echo -e "${YELLOW}[2/4] Detecting AI clients...${NC}"
    
    # Claude Desktop
    local claude_config=""
    if [[ "$(uname -s)" == "Darwin" ]]; then
        claude_config="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
    elif [[ "$(uname -s)" == "Linux" ]]; then
        claude_config="$HOME/.config/claude/claude_desktop_config.json"
    fi
    
    if [[ -d "$(dirname "$claude_config")" ]]; then
        clients+=("claude_desktop")
        echo -e "  ${GREEN}FOUND: Claude Desktop${NC}"
    fi
    
    # Claude Code CLI
    if command -v claude &>/dev/null; then
        clients+=("claude_code")
        echo -e "  ${GREEN}FOUND: Claude Code CLI${NC}"
    fi
    
    # Cursor
    local cursor_config="$HOME/.cursor/mcp.json"
    if [[ -d "$HOME/.cursor" ]] || [[ -d "$HOME/Library/Application Support/Cursor" ]]; then
        clients+=("cursor")
        echo -e "  ${GREEN}FOUND: Cursor${NC}"
    fi
    
    # Windsurf
    if [[ -d "$HOME/.windsurf" ]] || [[ -d "$HOME/Library/Application Support/Windsurf" ]]; then
        clients+=("windsurf")
        echo -e "  ${GREEN}FOUND: Windsurf${NC}"
    fi
    
    # VS Code / Cline / Roo
    local vscode_dir="$HOME/.config/Code/User"
    [[ "$(uname -s)" == "Darwin" ]] && vscode_dir="$HOME/Library/Application Support/Code/User"
    
    if [[ -d "$vscode_dir" ]]; then
        clients+=("vscode")
        echo -e "  ${GREEN}FOUND: VS Code${NC}"
    fi
    
    # Codex CLI
    if command -v codex &>/dev/null; then
        clients+=("codex")
        echo -e "  ${GREEN}FOUND: Codex CLI${NC}"
    fi
    
    # Aider
    if command -v aider &>/dev/null; then
        clients+=("aider")
        echo -e "  ${GREEN}FOUND: Aider${NC}"
    fi
    
    # Zed
    if [[ -d "$HOME/.config/zed" ]]; then
        clients+=("zed")
        echo -e "  ${GREEN}FOUND: Zed${NC}"
    fi
    
    # Continue
    if [[ -d "$HOME/.continue" ]]; then
        clients+=("continue")
        echo -e "  ${GREEN}FOUND: Continue${NC}"
    fi
    
    # Ollama
    if command -v ollama &>/dev/null; then
        clients+=("ollama")
        echo -e "  ${GREEN}FOUND: Ollama${NC}"
    fi
    
    # LM Studio
    if [[ -d "$HOME/.lmstudio" ]]; then
        clients+=("lmstudio")
        echo -e "  ${GREEN}FOUND: LM Studio${NC}"
    fi
    
    # Antigravity
    if [[ -d "$HOME/.antigravity" ]]; then
        clients+=("antigravity")
        echo -e "  ${GREEN}FOUND: Antigravity${NC}"
    fi
    
    echo ""
    echo -e "  ${CYAN}Total: ${#clients[@]} AI clients detected${NC}"
    
    DETECTED_CLIENTS=("${clients[@]}")
}

# Configure client
configure_client() {
    local client="$1"
    
    case "$client" in
        claude_desktop)
            local config_dir config_file
            if [[ "$(uname -s)" == "Darwin" ]]; then
                config_dir="$HOME/Library/Application Support/Claude"
            else
                config_dir="$HOME/.config/claude"
            fi
            config_file="$config_dir/claude_desktop_config.json"
            
            mkdir -p "$config_dir"
            
            if [[ -f "$config_file" ]]; then
                # Add to existing config
                local tmp=$(mktemp)
                jq '.mcpServers.hypernexus = {"url": "'"$MCP_URL"'"}' "$config_file" > "$tmp" && mv "$tmp" "$config_file"
            else
                # Create new config
                cat > "$config_file" << EOF
{
  "mcpServers": {
    "hypernexus": {
      "url": "$MCP_URL"
    }
  }
}
EOF
            fi
            echo -e "    ${GREEN}OK: MCP config written${NC}"
            ;;
            
        claude_code)
            claude mcp add hypernexus --transport http "$MCP_URL" 2>/dev/null || true
            echo -e "    ${GREEN}OK: MCP server added${NC}"
            ;;
            
        cursor)
            local cursor_config="$HOME/.cursor/mcp.json"
            mkdir -p "$HOME/.cursor"
            
            if [[ -f "$cursor_config" ]]; then
                local tmp=$(mktemp)
                jq '.mcpServers.hypernexus = {"url": "'"$MCP_URL"'"}' "$cursor_config" > "$tmp" && mv "$tmp" "$cursor_config"
            else
                cat > "$cursor_config" << EOF
{
  "mcpServers": {
    "hypernexus": {
      "url": "$MCP_URL"
    }
  }
}
EOF
            fi
            echo -e "    ${GREEN}OK: MCP config written${NC}"
            ;;
            
        windsurf)
            local windsurf_config="$HOME/.windsurf/mcp.json"
            mkdir -p "$HOME/.windsurf"
            
            if [[ -f "$windsurf_config" ]]; then
                local tmp=$(mktemp)
                jq '.mcpServers.hypernexus = {"url": "'"$MCP_URL"'"}' "$windsurf_config" > "$tmp" && mv "$tmp" "$windsurf_config"
            else
                cat > "$windsurf_config" << EOF
{
  "mcpServers": {
    "hypernexus": {
      "url": "$MCP_URL"
    }
  }
}
EOF
            fi
            echo -e "    ${GREEN}OK: MCP config written${NC}"
            ;;
            
        vscode)
            # Cline MCP config
            local cline_config="$HOME/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/mcp_settings.json"
            [[ "$(uname -s)" == "Darwin" ]] && cline_config="$HOME/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/mcp_settings.json"
            
            if [[ -d "$(dirname "$cline_config")" ]]; then
                mkdir -p "$(dirname "$cline_config")"
                if [[ -f "$cline_config" ]]; then
                    local tmp=$(mktemp)
                    jq '.mcpServers.hypernexus = {"url": "'"$MCP_URL"'", "disabled": false}' "$cline_config" > "$tmp" && mv "$tmp" "$cline_config"
                else
                    cat > "$cline_config" << EOF
{
  "mcpServers": {
    "hypernexus": {
      "url": "$MCP_URL",
      "disabled": false
    }
  }
}
EOF
                fi
                echo -e "    ${GREEN}OK: Cline MCP config written${NC}"
            fi
            ;;
            
        codex)
            codex mcp add hypernexus "$MCP_URL" 2>/dev/null || true
            echo -e "    ${GREEN}OK: MCP server added${NC}"
            ;;
            
        aider)
            echo -e "    ${YELLOW}OK: Use --mcp-url $MCP_URL with aider${NC}"
            ;;
            
        zed)
            echo -e "    ${YELLOW}OK: Add to Zed settings manually${NC}"
            ;;
            
        continue)
            local continue_config="$HOME/.continue/config.json"
            if [[ -f "$continue_config" ]]; then
                local tmp=$(mktemp)
                jq '.mcpServers.hypernexus = {"url": "'"$MCP_URL"'"}' "$continue_config" > "$tmp" && mv "$tmp" "$continue_config"
                echo -e "    ${GREEN}OK: MCP config added${NC}"
            fi
            ;;
            
        ollama|lmstudio)
            echo -e "    ${GREEN}OK: Detected for waterfall fallback${NC}"
            ;;
            
        antigravity)
            echo -e "    ${YELLOW}OK: Add MCP URL to Antigravity settings${NC}"
            ;;
    esac
}

# ============================================================
# MAIN
# ============================================================

PLATFORM=$(detect_platform)
URL=$(get_download_url "$PLATFORM")

echo -e "Platform: ${GREEN}${PLATFORM}${NC}"
echo -e "Download: ${URL}"
echo ""

# Create temp directory
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

# Determine filename
if [[ "$PLATFORM" == windows-* ]]; then
    DEST="${TMPDIR}/hypernexus.exe"
else
    DEST="${TMPDIR}/hypernexus"
fi

# Step 1: Download
echo -e "${YELLOW}[1/4] Downloading HyperNexus...${NC}"
download "$URL" "$DEST"
echo -e "  ${GREEN}OK: Download complete${NC}"

# Make executable on Unix
if [[ "$PLATFORM" != windows-* ]]; then
    chmod +x "$DEST"
fi

# Install binary
INSTALL_DIR="/usr/local/bin"
[[ ! -w "$INSTALL_DIR" ]] && INSTALL_DIR="$HOME/.local/bin"
mkdir -p "$INSTALL_DIR"
cp "$DEST" "$INSTALL_DIR/hypernexus"
echo -e "  ${GREEN}OK: Installed to $INSTALL_DIR/hypernexus${NC}"

# Add to PATH if needed
if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
    SHELL_RC="$HOME/.bashrc"
    [[ -f "$HOME/.zshrc" ]] && SHELL_RC="$HOME/.zshrc"
    echo "export PATH=\"\$PATH:$INSTALL_DIR\"" >> "$SHELL_RC"
    export PATH="$PATH:$INSTALL_DIR"
fi

# Step 2-3: Detect and configure clients
detect_clients

echo ""
echo -e "${YELLOW}[3/4] Configuring AI clients...${NC}"
for client in "${DETECTED_CLIENTS[@]}"; do
    echo ""
    echo -e "  Configuring ${client}..."
    configure_client "$client"
done

# Step 4: Install skills and hooks
echo ""
echo -e "${YELLOW}[4/4] Installing skills & hooks...${NC}"

# Create config directory
CONFIG_DIR="$HOME/.hypernexus"
mkdir -p "$CONFIG_DIR/hooks"

# Auto-start hook
cat > "$CONFIG_DIR/hooks/auto-start.sh" << 'EOF'
#!/bin/bash
# HyperNexus Auto-Start Hook
if ! pgrep -x "hypernexus" > /dev/null; then
    nohup hypernexus serve > /dev/null 2>&1 &
fi
EOF
chmod +x "$CONFIG_DIR/hooks/auto-start.sh"
echo -e "  ${GREEN}OK: Auto-start hook installed${NC}"

# Add to shell profile
SHELL_RC="$HOME/.bashrc"
[[ -f "$HOME/.zshrc" ]] && SHELL_RC="$HOME/.zshrc"
if ! grep -q "hypernexus.*auto-start" "$SHELL_RC" 2>/dev/null; then
    echo "" >> "$SHELL_RC"
    echo "# HyperNexus auto-start" >> "$SHELL_RC"
    echo "[[ -f ~/.hypernexus/hooks/auto-start.sh ]] && source ~/.hypernexus/hooks/auto-start.sh" >> "$SHELL_RC"
fi

# ============================================================
# STEP 5: Start HyperNexus Server
# ============================================================
echo ""
echo -e "${YELLOW}[5/5] Starting HyperNexus server...${NC}"

# Check if already running
if curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo -e "  ${GREEN}OK: Server already running${NC}"
else
    # Start in background
    nohup hypernexus serve > ~/.hypernexus/server.log 2>&1 &
    SERVER_PID=$!
    echo -e "  ${GREEN}OK: Server started (PID: ${SERVER_PID})${NC}"
    
    # Wait for it to be ready
    echo -e "  ${YELLOW}Waiting for server to be ready...${NC}"
    for i in {1..30}; do
        if curl -s http://localhost:8080/health > /dev/null 2>&1; then
            echo -e "  ${GREEN}OK: Server is ready!${NC}"
            break
        fi
        sleep 1
    done
fi

# ============================================================
# Summary
# ============================================================
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   Installation Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "  Binary: ${INSTALL_DIR}/hypernexus"
echo -e "  MCP Endpoint: ${MCP_URL}"
echo ""
echo -e "  ${CYAN}Configured Clients:${NC}"
for client in "${DETECTED_CLIENTS[@]}"; do
    echo -e "    ✓ ${client}"
done
echo ""
echo -e "  ${CYAN}Next Steps:${NC}"
echo -e "    1. Restart your AI clients"
echo -e "    2. Run: hypernexus serve"
echo -e "    3. Start coding with persistent memory!"
echo ""
echo -e "  Docs: https://hypernexus.site"
echo -e "  Discord: https://discord.gg/Hj9P3GbVxR"
echo ""
