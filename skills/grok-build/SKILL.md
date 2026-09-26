# Grok Build Skill

## Overview

Grok Build is SpaceXAI's terminal-based AI coding agent. It runs as a full-screen TUI that understands your codebase, edits files, executes shell commands, searches the web, and manages long-running tasks.

## MCP Server

Connect to HyperNexus at: <http://localhost:8080/mcp>

## Commands

- `grok.open` - Open terminal
- `grok.explain` - Explain selected code
- `grok.fix` - Fix code issues
- `grok.refactor` - Refactor code
- `grok.test` - Generate tests
- `grok.review` - Review code
- `grok.chat` - Open chat panel
- `grok.task` - Run a task
- `grok.search` - Search the web
- `grok.headless` - Run headless mode

## Features

- Full TUI interface
- Headless mode for CI/CD
- Web search capabilities
- MCP tool integration
- Agent Client Protocol (ACP) support

## Usage

1. Install: `curl -fsSL https://x.ai/cli/install.sh | bash`
2. Configure MCP endpoint in settings
3. Use commands from command palette or right-click menu

## Key Settings

- `grok.path` - Path to grok binary
- `grok.defaultModel` - Default model (grok-2)
- `grok.mcpEndpoint` - MCP server endpoint
- `grok.enableWebSearch` - Enable web search
