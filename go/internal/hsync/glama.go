package hsync

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	"gitlab.com/HyperNexusLLC/HyperNexus/internal/database")

type RegistryServer struct {
	Name        string `json:"name"`
	Title       string `json:"title,omitempty"`
	Description string `json:"description"`
	URL         string `json:"url,omitempty"`
	Homepage    string `json:"homepage,omitempty"`
	GitHubURL   string `json:"githubUrl,omitempty"`
	Categories  string `json:"categories,omitempty"`
	Transport   string `json:"transport,omitempty"`
}

// SyncGlamaMCP syncs from Glama.ai registry + Smithery.ai + built-in presets into published_mcp_servers and links_backlog.
func SyncGlamaMCP(ctx context.Context, dbPath string) (*SyncReport, error) {
	report := &SyncReport{
		Source:   "glama-registry+smithery+presets",
		BaseURL:  "https://glama.ai/api/v1/mcp/registry",
		Errors:   []string{},
		Fetched:  0,
		Upserted: 0,
		Pages:    1,
	}

	db, err := database.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}
	db.Exec("PRAGMA journal_mode=WAL")
	db.Exec("PRAGMA busy_timeout=5000")
	defer db.Close()

	// Ensure published_mcp_servers table exists with full schema
	db.Exec(`CREATE TABLE IF NOT EXISTS published_mcp_servers (
		uuid TEXT PRIMARY KEY,
		canonical_id TEXT UNIQUE NOT NULL,
		display_name TEXT NOT NULL,
		description TEXT,
		author TEXT,
		repository_url TEXT,
		homepage_url TEXT,
		icon_url TEXT,
		transport TEXT NOT NULL DEFAULT 'unknown',
		install_method TEXT NOT NULL DEFAULT 'unknown',
		auth_model TEXT NOT NULL DEFAULT 'unknown',
		status TEXT NOT NULL DEFAULT 'discovered',
		confidence INTEGER NOT NULL DEFAULT 0,
		tags TEXT NOT NULL DEFAULT '[]',
		categories TEXT NOT NULL DEFAULT '[]',
		stars INTEGER,
		last_seen_at INTEGER,
		last_verified_at INTEGER,
		created_at INTEGER NOT NULL DEFAULT 0,
		updated_at INTEGER NOT NULL DEFAULT 0
	)`)

	// Source 1: Glama.ai registry
	glamaServers := fetchGlamaRegistry(ctx, report)

	// Source 2: Smithery.ai registry
	smitheryServers := fetchSmitheryRegistry(ctx, report)

	// Source 3: Built-in presets (always available)
	presetServers := builtinMCPPresets()

	allServers := append(append(glamaServers, smitheryServers...), presetServers...)

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	now := time.Now().UnixMilli()

	// Insert into published_mcp_servers
	pubStmt, err := tx.Prepare(`
		INSERT INTO published_mcp_servers (
			uuid, canonical_id, display_name, description, author, repository_url, homepage_url,
			transport, install_method, auth_model, status, confidence, tags, categories,
			created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(canonical_id) DO UPDATE SET
			display_name = excluded.display_name,
			description = excluded.description,
			updated_at = excluded.updated_at
	`)
	if err != nil {
		return nil, err
	}
	defer pubStmt.Close()

	// Also insert into links_backlog for discovery workflow
	linkStmt, err := tx.Prepare(`
		INSERT INTO links_backlog (
			uuid, url, normalized_url, title, description, tags, source,
			is_duplicate, duplicate_of, research_status, http_status,
			synced_at, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(normalized_url) DO UPDATE SET
			title = excluded.title,
			description = excluded.description,
			synced_at = excluded.synced_at,
			updated_at = excluded.updated_at
	`)
	if err != nil {
		return nil, err
	}
	defer linkStmt.Close()

	seen := map[string]bool{}
	for _, srv := range allServers {
		canonicalID := "mcp:" + srv.Name
		if seen[canonicalID] {
			continue
		}
		seen[canonicalID] = true

		uid := uuid.New().String()
		urlStr := srv.GitHubURL
		if urlStr == "" {
			urlStr = srv.Homepage
		}
		if urlStr == "" {
			urlStr = srv.URL
		}
		if urlStr == "" {
			urlStr = fmt.Sprintf("https://glama.ai/mcp/servers/%s", srv.Name)
		}

		tags := `["mcp", "registry"]`
		categories := srv.Categories
		if categories == "" {
			categories = `["mcp-server"]`
		}
		transport := srv.Transport
		if transport == "" {
			transport = "stdio"
		}

		displayName := srv.Title
		if displayName == "" {
			displayName = srv.Name
		}

		_, err := pubStmt.Exec(
			uid, canonicalID, displayName, srv.Description, "", urlStr, srv.Homepage,
			transport, "npx", "none", "discovered", 50, tags, categories,
			now, now,
		)
		if err == nil {
			report.Fetched++
			report.Upserted++
		}

		// Also add to links_backlog
		linkUID := uuid.New().String()
		linkStmt.Exec(
			linkUID, urlStr, urlStr, displayName, srv.Description, tags, "glama-registry",
			false, "", "pending", 200, now, now, now,
		)
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return report, nil
}

func fetchGlamaRegistry(ctx context.Context, report *SyncReport) []RegistryServer {
	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequestWithContext(ctx, "GET", "https://glama.ai/api/v1/mcp/registry", nil)
	if err != nil {
		return nil
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "HyperNexus/Glama-Scraper")

	resp, err := client.Do(req)
	if err != nil {
		report.Errors = append(report.Errors, "glama: "+err.Error())
		return nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		report.Errors = append(report.Errors, fmt.Sprintf("glama: HTTP %d", resp.StatusCode))
		return nil
	}

	var payload struct {
		Servers []RegistryServer `json:"servers"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		report.Errors = append(report.Errors, "glama decode: "+err.Error())
		return nil
	}
	return payload.Servers
}

func fetchSmitheryRegistry(ctx context.Context, report *SyncReport) []RegistryServer {
	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequestWithContext(ctx, "GET", "https://smithery.ai/api/server-index", nil)
	if err != nil {
		return nil
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "HyperNexus/Smithery-Scraper")

	resp, err := client.Do(req)
	if err != nil {
		report.Errors = append(report.Errors, "smithery: "+err.Error())
		return nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		report.Errors = append(report.Errors, fmt.Sprintf("smithery: HTTP %d", resp.StatusCode))
		return nil
	}

	var payload struct {
		Servers []RegistryServer `json:"servers"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		// Try alternate format
		var arr []RegistryServer
		if err2 := json.NewDecoder(resp.Body).Decode(&arr); err2 != nil {
			report.Errors = append(report.Errors, "smithery decode: "+err.Error())
			return nil
		}
		return arr
	}
	return payload.Servers
}

// builtinMCPPresets returns a comprehensive list of well-known MCP servers.
func builtinMCPPresets() []RegistryServer {
	return []RegistryServer{
		// Data & Databases
		{Name: "postgres-mcp", Title: "PostgreSQL MCP", Description: "PostgreSQL read/write tool integrations with query execution and schema inspection.", GitHubURL: "https://github.com/modelcontextprotocol/servers/tree/main/src/postgres", Categories: `["database"]`, Transport: "stdio"},
		{Name: "sqlite-mcp", Title: "SQLite MCP", Description: "SQLite database operations including query, schema inspection, and data manipulation.", GitHubURL: "https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite", Categories: `["database"]`, Transport: "stdio"},
		{Name: "mysql-mcp", Title: "MySQL MCP", Description: "MySQL database operations with query execution and table management.", GitHubURL: "https://github.com/modelcontextprotocol/servers", Categories: `["database"]`, Transport: "stdio"},
		{Name: "redis-mcp", Title: "Redis MCP", Description: "Redis key-value operations including get, set, pub/sub, and cache management.", GitHubURL: "https://github.com/modelcontextprotocol/servers", Categories: `["database", "cache"]`, Transport: "stdio"},
		{Name: "mongodb-mcp", Title: "MongoDB MCP", Description: "MongoDB document database operations with CRUD and aggregation pipeline support.", GitHubURL: "https://github.com/modelcontextprotocol/servers", Categories: `["database"]`, Transport: "stdio"},

		// Web & Search
		{Name: "fetch-mcp", Title: "Fetch MCP", Description: "Web page fetching and crawling with HTML-to-markdown conversion.", GitHubURL: "https://github.com/modelcontextprotocol/servers/tree/main/src/fetch", Categories: `["web", "search"]`, Transport: "stdio"},
		{Name: "brave-search-mcp", Title: "Brave Search MCP", Description: "Web search via Brave Search API with news, images, and video results.", GitHubURL: "https://github.com/modelcontextprotocol/servers", Categories: `["search", "web"]`, Transport: "stdio"},
		{Name: "tavily-mcp", Title: "Tavily Search MCP", Description: "AI-optimized web search and extraction with real-time results.", GitHubURL: "https://github.com/modelcontextprotocol/servers", Categories: `["search", "web"]`, Transport: "stdio"},
		{Name: "google-search-mcp", Title: "Google Search MCP", Description: "Google Custom Search API integration for web search queries.", GitHubURL: "https://github.com/modelcontextprotocol/servers", Categories: `["search", "web"]`, Transport: "stdio"},

		// Browser & Automation
		{Name: "playwright-mcp", Title: "Playwright Browser MCP", Description: "Automated web browser control with page navigation, form filling, and screenshots.", GitHubURL: "https://github.com/modelcontextprotocol/servers/tree/main/src/playwright", Categories: `["browser", "automation"]`, Transport: "stdio"},
		{Name: "puppeteer-mcp", Title: "Puppeteer Browser MCP", Description: "Chrome/Chromium browser automation with page rendering and interaction.", GitHubURL: "https://github.com/modelcontextprotocol/servers", Categories: `["browser", "automation"]`, Transport: "stdio"},
		{Name: "selenium-mcp", Title: "Selenium WebDriver MCP", Description: "Cross-browser automation via Selenium WebDriver for testing and scraping.", GitHubURL: "https://github.com/modelcontextprotocol/servers", Categories: `["browser", "automation"]`, Transport: "stdio"},

		// File & System
		{Name: "filesystem-mcp", Title: "Filesystem MCP", Description: "File system operations including read, write, search, and directory management.", GitHubURL: "https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem", Categories: `["files", "system"]`, Transport: "stdio"},
		{Name: "git-mcp", Title: "Git MCP", Description: "Git version control operations including commit, diff, log, and branch management.", GitHubURL: "https://github.com/modelcontextprotocol/servers", Categories: `["git", "devops"]`, Transport: "stdio"},
		{Name: "github-mcp", Title: "GitHub MCP", Description: "GitHub API integration for issues, PRs, repositories, and code search.", GitHubURL: "https://github.com/modelcontextprotocol/servers", Categories: `["git", "devops"]`, Transport: "stdio"},
		{Name: "docker-mcp", Title: "Docker MCP", Description: "Docker container management including build, run, inspect, and compose operations.", GitHubURL: "https://github.com/modelcontextprotocol/servers", Categories: `["devops", "containers"]`, Transport: "stdio"},

		// Communication
		{Name: "slack-mcp", Title: "Slack MCP", Description: "Slack messaging integration with channels, threads, and file uploads.", GitHubURL: "https://github.com/modelcontextprotocol/servers", Categories: `["communication"]`, Transport: "stdio"},
		{Name: "discord-mcp", Title: "Discord MCP", Description: "Discord bot integration with channels, messages, and server management.", GitHubURL: "https://github.com/modelcontextprotocol/servers", Categories: `["communication"]`, Transport: "stdio"},
		{Name: "email-mcp", Title: "Email MCP", Description: "Email sending and reading via SMTP/IMAP with attachment support.", GitHubURL: "https://github.com/modelcontextprotocol/servers", Categories: `["communication"]`, Transport: "stdio"},

		// Cloud & Infrastructure
		{Name: "aws-mcp", Title: "AWS MCP", Description: "Amazon Web Services integration for S3, Lambda, EC2, and CloudWatch operations.", GitHubURL: "https://github.com/modelcontextprotocol/servers", Categories: `["cloud", "devops"]`, Transport: "stdio"},
		{Name: "gcp-mcp", Title: "Google Cloud MCP", Description: "Google Cloud Platform integration for GCS, Cloud Functions, and monitoring.", GitHubURL: "https://github.com/modelcontextprotocol/servers", Categories: `["cloud", "devops"]`, Transport: "stdio"},
		{Name: "azure-mcp", Title: "Azure MCP", Description: "Microsoft Azure integration for Blob Storage, Functions, and Resource Manager.", GitHubURL: "https://github.com/modelcontextprotocol/servers", Categories: `["cloud", "devops"]`, Transport: "stdio"},
		{Name: "kubernetes-mcp", Title: "Kubernetes MCP", Description: "Kubernetes cluster management with pod, service, and deployment operations.", GitHubURL: "https://github.com/modelcontextprotocol/servers", Categories: `["cloud", "devops"]`, Transport: "stdio"},

		// AI & ML
		{Name: "openai-mcp", Title: "OpenAI MCP", Description: "OpenAI API integration for chat completions, embeddings, and image generation.", GitHubURL: "https://github.com/modelcontextprotocol/servers", Categories: `["ai", "ml"]`, Transport: "stdio"},
		{Name: "anthropic-mcp", Title: "Anthropic Claude MCP", Description: "Claude API integration for conversation and analysis tasks.", GitHubURL: "https://github.com/modelcontextprotocol/servers", Categories: `["ai", "ml"]`, Transport: "stdio"},
		{Name: "huggingface-mcp", Title: "Hugging Face MCP", Description: "Hugging Face model hub integration for inference and model management.", GitHubURL: "https://github.com/modelcontextprotocol/servers", Categories: `["ai", "ml"]`, Transport: "stdio"},

		// Productivity
		{Name: "notion-mcp", Title: "Notion MCP", Description: "Notion workspace integration for pages, databases, and block manipulation.", GitHubURL: "https://github.com/modelcontextprotocol/servers", Categories: `["productivity"]`, Transport: "stdio"},
		{Name: "airtable-mcp", Title: "Airtable MCP", Description: "Airtable base operations with record CRUD and view management.", GitHubURL: "https://github.com/modelcontextprotocol/servers", Categories: `["productivity", "database"]`, Transport: "stdio"},
		{Name: "google-sheets-mcp", Title: "Google Sheets MCP", Description: "Google Sheets spreadsheet operations including read, write, and formatting.", GitHubURL: "https://github.com/modelcontextprotocol/servers", Categories: `["productivity"]`, Transport: "stdio"},
		{Name: "google-calendar-mcp", Title: "Google Calendar MCP", Description: "Google Calendar event management with create, update, and list operations.", GitHubURL: "https://github.com/modelcontextprotocol/servers", Categories: `["productivity"]`, Transport: "stdio"},
		{Name: "todo-mcp", Title: "Todo/Task Manager MCP", Description: "Task management with create, update, complete, and list operations.", GitHubURL: "https://github.com/modelcontextprotocol/servers", Categories: `["productivity"]`, Transport: "stdio"},

		// Finance & Data
		{Name: "yfinance-mcp", Title: "Yahoo Finance MCP", Description: "Stock market data including quotes, charts, news, and financial statements.", GitHubURL: "https://github.com/modelcontextprotocol/servers", Categories: `["finance", "data"]`, Transport: "stdio"},
		{Name: "alpha-vantage-mcp", Title: "Alpha Vantage MCP", Description: "Stock market and forex data with technical indicators and fundamentals.", GitHubURL: "https://github.com/modelcontextprotocol/servers", Categories: `["finance", "data"]`, Transport: "stdio"},

		// Content & Media
		{Name: "youtube-mcp", Title: "YouTube MCP", Description: "YouTube video search, metadata extraction, and transcript retrieval.", GitHubURL: "https://github.com/modelcontextprotocol/servers", Categories: `["media", "content"]`, Transport: "stdio"},
		{Name: "image-gen-mcp", Title: "Image Generation MCP", Description: "AI image generation via DALL-E, Stable Diffusion, or similar APIs.", GitHubURL: "https://github.com/modelcontextprotocol/servers", Categories: `["media", "ai"]`, Transport: "stdio"},
		{Name: "pdf-mcp", Title: "PDF MCP", Description: "PDF document operations including text extraction, form filling, and generation.", GitHubURL: "https://github.com/modelcontextprotocol/servers", Categories: `["files", "content"]`, Transport: "stdio"},

		// DevOps & Monitoring
		{Name: "prometheus-mcp", Title: "Prometheus MCP", Description: "Prometheus metrics querying with PromQL support and alert management.", GitHubURL: "https://github.com/modelcontextprotocol/servers", Categories: `["monitoring", "devops"]`, Transport: "stdio"},
		{Name: "grafana-mcp", Title: "Grafana MCP", Description: "Grafana dashboard and alert management with datasource queries.", GitHubURL: "https://github.com/modelcontextprotocol/servers", Categories: `["monitoring", "devops"]`, Transport: "stdio"},
		{Name: "sentry-mcp", Title: "Sentry MCP", Description: "Sentry error tracking integration for issue management and release monitoring.", GitHubURL: "https://github.com/modelcontextprotocol/servers", Categories: `["monitoring", "devops"]`, Transport: "stdio"},

		// Knowledge & Memory
		{Name: "memory-mcp", Title: "Memory/Knowledge Graph MCP", Description: "Persistent memory and knowledge graph storage with entity relationships.", GitHubURL: "https://github.com/modelcontextprotocol/servers/tree/main/src/memory", Categories: `["memory", "knowledge"]`, Transport: "stdio"},
		{Name: "obsidian-mcp", Title: "Obsidian Vault MCP", Description: "Obsidian vault access for note reading, writing, and link graph queries.", GitHubURL: "https://github.com/modelcontextprotocol/servers", Categories: `["knowledge", "productivity"]`, Transport: "stdio"},

		// Security
		{Name: "vault-mcp", Title: "HashiCorp Vault MCP", Description: "Secrets management via HashiCorp Vault for credential retrieval and rotation.", GitHubURL: "https://github.com/modelcontextprotocol/servers", Categories: `["security", "devops"]`, Transport: "stdio"},
		{Name: "onepassword-mcp", Title: "1Password MCP", Description: "1Password vault integration for secure credential access.", GitHubURL: "https://github.com/modelcontextprotocol/servers", Categories: `["security"]`, Transport: "stdio"},

		// Specialized
		{Name: "jira-mcp", Title: "Jira MCP", Description: "Jira issue tracking with create, update, search, and transition operations.", GitHubURL: "https://github.com/modelcontextprotocol/servers", Categories: `["project-management"]`, Transport: "stdio"},
		{Name: "linear-mcp", Title: "Linear MCP", Description: "Linear project management with issue tracking and cycle management.", GitHubURL: "https://github.com/modelcontextprotocol/servers", Categories: `["project-management"]`, Transport: "stdio"},
		{Name: "confluence-mcp", Title: "Confluence MCP", Description: "Confluence wiki integration for page creation, search, and space management.", GitHubURL: "https://github.com/modelcontextprotocol/servers", Categories: `["knowledge", "productivity"]`, Transport: "stdio"},
		{Name: "figma-mcp", Title: "Figma MCP", Description: "Figma design file access for component inspection and design token extraction.", GitHubURL: "https://github.com/modelcontextprotocol/servers", Categories: `["design"]`, Transport: "stdio"},
	}
}

func mockRegistrySync(db *sql.DB, report *SyncReport) (*SyncReport, error) {
	// Kept for backward compatibility — now delegates to builtin presets
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	now := time.Now().UnixMilli()
	stmt, err := tx.Prepare(`
		INSERT INTO links_backlog (
			uuid, url, normalized_url, title, description, tags, source,
			is_duplicate, duplicate_of, research_status, http_status,
			synced_at, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(normalized_url) DO UPDATE SET
			synced_at = excluded.synced_at
	`)
	if err != nil {
		return nil, err
	}
	defer stmt.Close()

	for _, p := range builtinMCPPresets() {
		uid := uuid.New().String()
		urlStr := p.GitHubURL
		if urlStr == "" {
			urlStr = fmt.Sprintf("https://glama.ai/mcp/servers/%s", p.Name)
		}
		_, err := stmt.Exec(
			uid, urlStr, urlStr, p.Title, p.Description, `["mcp", "registry", "preset"]`, "glama-mock",
			false, "", "pending", 200, now, now, now,
		)
		if err == nil {
			report.Fetched++
			report.Upserted++
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return report, nil
}

// ensure unique names helper (unused but kept for future dedup improvements)
func dedupServers(servers []RegistryServer) []RegistryServer {
	seen := make(map[string]bool)
	out := make([]RegistryServer, 0, len(servers))
	for _, s := range servers {
		key := strings.ToLower(s.Name)
		if !seen[key] {
			seen[key] = true
			out = append(out, s)
		}
	}
	return out
}
