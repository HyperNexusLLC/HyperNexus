package tools

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"

	"gitlab.com/HyperNexusLLC/HyperNexus/internal/repograph"
)

// ensureGraphBuilt ensures that the global repository graph is populated.
// Returns immediately if graph isn't ready â€” callers should use lightweight fallback.
func ensureGraphBuilt(ctx context.Context) error {
	if GlobalRepoGraph == nil {
		return fmt.Errorf("GlobalRepoGraph is not initialized")
	}
	if GlobalRepoGraph.GetGraph() != nil {
		return nil
	}
	// Try a quick build with short timeout
	buildCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	_, err := GlobalRepoGraph.Build(buildCtx)
	if err != nil {
		return fmt.Errorf("graph build timed out or failed: %w", err)
	}
	return nil
}

// HandleCodebaseSearch searches the codebase symbol/import/definition graph.
func HandleCodebaseSearch(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	query, okVal := getString(args, "query")
	if !okVal || query == "" {
		return err("missing required parameter 'query'")
	}

	mode, _ := getString(args, "mode")
	if mode == "" {
		mode = "symbols"
	}

	limit, okLimit := getInt(args, "limit")
	if !okLimit || limit <= 0 {
		limit = 20
	}

	if errBuild := ensureGraphBuilt(ctx); errBuild != nil {
		// Fallback: lightweight grep-based symbol search
		return lightweightSymbolSearchCtx(ctx, query, limit)
	}

	var data interface{}
	switch strings.ToLower(mode) {
	case "definitions":
		data = GlobalRepoGraph.FindDefinitions(query)
	case "references":
		data = GlobalRepoGraph.FindReferences(query)
	case "symbols":
		data = GlobalRepoGraph.SearchSymbols(query, limit)
	default:
		return err(fmt.Sprintf("invalid search mode '%s'. Allowed: symbols, definitions, references", mode))
	}

	responseBytes, e := json.Marshal(data)
	if e != nil {
		return err(fmt.Sprintf("failed to marshal search results: %s", e.Error()))
	}

	return ok(string(responseBytes))
}

// HandleCodebaseOutline outlines symbols defined in a file or details a specific symbol.
// outlineFileDirect extracts top-level symbols from a source file by pattern
// matching, so codebase_outline works reliably without the repo graph. Returns
// a JSON array of {name, kind, line, text}.
func outlineFileDirect(filePath string) (ToolResponse, error) {
	resolved := filePath
	if !filepath.IsAbs(resolved) {
		if root := os.Getenv("HYPERNEXUS_WORKSPACE_ROOT"); root != "" {
			resolved = filepath.Join(root, resolved)
		}
	}
	f, openErr := os.Open(resolved)
	if openErr != nil {
		return err(fmt.Sprintf("cannot open %s: %v", filePath, openErr))
	}
	defer f.Close()

	patterns := []struct {
		kind string
		re   *regexp.Regexp
	}{
		{"func", regexp.MustCompile(`^\s*(?:export\s+)?(?:async\s+)?func\s+(?:\([^)]*\)\s*)?([A-Za-z_][A-Za-z0-9_]*)`)},
		{"function", regexp.MustCompile(`^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_][A-Za-z0-9_]*)`)},
		{"def", regexp.MustCompile(`^\s*(?:export\s+)?def\s+([A-Za-z_][A-Za-z0-9_]*)`)},
		{"class", regexp.MustCompile(`^\s*(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z_][A-Za-z0-9_]*)`)},
		{"type", regexp.MustCompile(`^\s*type\s+([A-Za-z_][A-Za-z0-9_]*)`)},
		{"const", regexp.MustCompile(`^\s*(?:export\s+)?const\s+([A-Za-z_][A-Za-z0-9_]*)\s*[:=]`)},
	}

	type sym struct {
		Name string `json:"name"`
		Kind string `json:"kind"`
		Line int    `json:"line"`
		Text string `json:"text"`
	}
	out := make([]sym, 0, 32)
	scanner := bufio.NewScanner(f)
	scanner.Buffer(make([]byte, 0, 64*1024), 2*1024*1024)
	lineNo := 0
	for scanner.Scan() {
		lineNo++
		line := scanner.Text()
		for _, p := range patterns {
			if m := p.re.FindStringSubmatch(line); m != nil {
				text := strings.TrimSpace(line)
				if len(text) > 120 {
					text = text[:120]
				}
				out = append(out, sym{Name: m[1], Kind: p.kind, Line: lineNo, Text: text})
				break
			}
		}
		if len(out) >= 200 {
			break
		}
	}
	b, e := json.Marshal(out)
	if e != nil {
		return err(fmt.Sprintf("marshal outline: %v", e))
	}
	return ok(string(b))
}

func HandleCodebaseOutline(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	filePath, hasPath := getString(args, "filePath")
	symbolName, hasSymbol := getString(args, "symbolName")

	if !hasPath && !hasSymbol {
		return err("must provide either 'filePath' or 'symbolName'")
	}

	// A failed graph build is not fatal for filePath outlines (those fall back to
	// direct parse), but symbolName lookups require the graph.
	errBuild := ensureGraphBuilt(ctx)
	if errBuild != nil && !hasPath {
		return err(fmt.Sprintf("graph build failed: %v", errBuild))
	}

	if hasPath {
		// Clean filePath path separators for consistency
		cleanPath := filepathToSlash(filePath)
		graph := GlobalRepoGraph.GetGraph()
		if graph != nil {
			var fileNodes []*repograph.Node
			for _, node := range graph.Nodes {
				if filepathToSlash(node.Path) == cleanPath && node.Type != repograph.NodeFile && node.Type != repograph.NodeImport {
					fileNodes = append(fileNodes, node)
				}
			}
			if len(fileNodes) > 0 {
				sort.Slice(fileNodes, func(i, j int) bool {
					return fileNodes[i].LineStart < fileNodes[j].LineStart
				})
				responseBytes, e := json.Marshal(fileNodes)
				if e != nil {
					return err(fmt.Sprintf("failed to marshal file outline: %s", e.Error()))
				}
				return ok(string(responseBytes))
			}
		}
		// Graph unavailable / empty for this file: fall back to a direct parse so
		// outline works reliably without the expensive full-repo graph build.
		return outlineFileDirect(filePath)
	}

	// Lookup specific symbol definition
	defs := GlobalRepoGraph.FindDefinitions(symbolName)
	responseBytes, e := json.Marshal(defs)
	if e != nil {
		return err(fmt.Sprintf("failed to marshal symbol definitions: %s", e.Error()))
	}
	return ok(string(responseBytes))
}

// Helper to convert windows path slashes to forward slashes to match repo graph structure.
func filepathToSlash(path string) string {
	return strings.ReplaceAll(path, "\\", "/")
}

// lightweightSymbolSearch is a fallback when the repo graph build times out.
// It does a simple regex scan of source files for symbol definitions.
func lightweightSymbolSearch(query string, limit int) (ToolResponse, error) {
	return lightweightSymbolSearchCtx(context.Background(), query, limit)
}

func lightweightSymbolSearchCtx(ctx context.Context, query string, limit int) (ToolResponse, error) {
	symbolRe := regexp.MustCompile(`(?i)(?:func|function|class|type|interface|struct|def)\s+(\w*` + regexp.QuoteMeta(query) + `\w*)`)
	cwd, _ := os.Getwd()
	var results []map[string]interface{}
	skipDirs := map[string]bool{
		".git": true, "node_modules": true, ".next": true, ".next-dev": true,
		".next-build": true, ".turbo": true, ".venv": true, "__pycache__": true,
		"vendor": true, ".hypernexus": true, "dist": true, "build": true,
		"target": true, ".cache": true, "lancedb": true, ".pi": true,
		"coverage": true, "archive": true, "_disabled": true, "mcpimpl": true,
		".tormentnexus": true, "bin": true,
	}
	examined := 0
	const maxExamined = 2000 // hard cap: broad queries must not walk the whole tree
	_ = filepath.Walk(cwd, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if ctx.Err() != nil {
			return ctx.Err()
		}
		if info.IsDir() {
			if skipDirs[info.Name()] {
				return filepath.SkipDir
			}
			return nil
		}
		if len(results) >= limit || examined >= maxExamined {
			return filepath.SkipAll
		}
		name := info.Name()
		ext := filepath.Ext(name)
		if ext != ".go" && ext != ".ts" && ext != ".js" && ext != ".py" {
			return nil
		}
		examined++
		f, openErr := os.Open(path)
		if openErr != nil {
			return nil
		}
		defer f.Close()
		scanner := bufio.NewScanner(f)
		lineNum := 0
		for scanner.Scan() && len(results) < limit {
			lineNum++
			line := scanner.Text()
			if matches := symbolRe.FindStringSubmatch(line); len(matches) > 1 {
				rel, _ := filepath.Rel(cwd, path)
				results = append(results, map[string]interface{}{
					"name": matches[1], "path": filepath.ToSlash(rel), "line": lineNum,
				})
			}
		}
		return nil
	})
	data, _ := json.Marshal(results)
	return ok(string(data))
}
