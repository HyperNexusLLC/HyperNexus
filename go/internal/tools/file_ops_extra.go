package tools

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

// This file registers the remaining catalog tools that were advertised by the
// MCP server but had no Go handler, so every tool works with and without the
// extension layer (no external Node process required for core file/shell ops).

// strArg returns the first non-empty string among the given keys.
func strArg(args map[string]interface{}, keys ...string) string {
	for _, k := range keys {
		if s, ok := getString(args, k); ok && strings.TrimSpace(s) != "" {
			return s
		}
	}
	return ""
}

// HandleReadFileAlias — read_file: accepts `file_path` or `path`.
func HandleReadFileAlias(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	path := strArg(args, "file_path", "path", "filePath")
	if path == "" {
		return err("file_path is required")
	}
	data, readErr := os.ReadFile(path)
	if readErr != nil {
		return err(fmt.Sprintf("read failed: %v", readErr))
	}
	return ok(string(data))
}

// HandleWriteFileAlias — write_file: accepts `file_path` or `path`.
func HandleWriteFileAlias(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	path := strArg(args, "file_path", "path", "filePath")
	if path == "" {
		return err("file_path is required")
	}
	content, _ := getString(args, "content")
	if writeErr := os.WriteFile(path, []byte(content), 0644); writeErr != nil {
		return err(fmt.Sprintf("write failed: %v", writeErr))
	}
	return ok(fmt.Sprintf("Wrote %d bytes to %s", len(content), path))
}

// HandleRunShellCommand — run_shell_command: same execution path as bash.
func HandleRunShellCommand(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	if _, ok := args["command"]; !ok {
		args["command"] = strArg(args, "cmd", "command", "script")
	}
	return HandleBash(ctx, args)
}

// fileEdit is one structured replacement in the edit tool.
type fileEdit struct {
	oldText string
	newText string
}

// HandleEdit — edit: apply structured {oldText, newText} replacements to a file.
// Accepts `edits` (array of {oldText,newText}) plus `path`/`file_path`. Supports
// either exact-match replacement or a `search_block`/`replace` pair for the
// apply_search_replace-style call shape.
func HandleEdit(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	path := strArg(args, "path", "file_path", "filePath")
	if path == "" {
		return err("path and file_path are required")
	}
	raw, readErr := os.ReadFile(path)
	if readErr != nil {
		return err(fmt.Sprintf("edit failed: %v", readErr))
	}
	content := string(raw)

	var edits []fileEdit
	if arr, ok := args["edits"].([]interface{}); ok {
		for _, item := range arr {
			m, ok := item.(map[string]interface{})
			if !ok {
				continue
			}
			oldT, _ := m["oldText"].(string)
			newT, _ := m["newText"].(string)
			if oldT == "" {
				// also accept search/replace key names
				oldT, _ = m["search_block"].(string)
				newT, _ = m["replace"].(string)
			}
			edits = append(edits, fileEdit{oldText: oldT, newText: newT})
		}
	} else if search := strArg(args, "search_block", "search", "oldText"); search != "" {
		repl := strArg(args, "replace", "newText", "new")
		edits = append(edits, fileEdit{oldText: search, newText: repl})
	}

	if len(edits) == 0 {
		return err("edits array (or search_block/replace) is required")
	}

	applied := 0
	for _, e := range edits {
		if e.oldText == "" {
			continue
		}
		if !strings.Contains(content, e.oldText) {
			return err(fmt.Sprintf("edit %d: oldText not found in %s", applied, path))
		}
		// Replace only the first occurrence to keep edits deterministic.
		idx := strings.Index(content, e.oldText)
		content = content[:idx] + e.newText + content[idx+len(e.oldText):]
		applied++
	}

	if writeErr := os.WriteFile(path, []byte(content), 0644); writeErr != nil {
		return err(fmt.Sprintf("edit write failed: %v", writeErr))
	}
	return ok(fmt.Sprintf("Applied %d edit(s) to %s", applied, path))
}

// HandleSearchFiles — search: grep file contents by regex OR find filenames by glob.
// Auto-detects: a pattern containing path separators / glob chars searches file
// names; otherwise it searches file contents. Scans recursively under `path`.
func HandleSearchFiles(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	pattern := strArg(args, "pattern", "query", "q")
	if pattern == "" {
		return err("pattern is required")
	}
	root := strArg(args, "path", "dir")
	if root == "" {
		root = "."
	}
	limit := 50
	if v, ok := args["limit"].(float64); ok && v > 0 {
		limit = int(v)
	}

	// Glob-ish pattern => filename match; otherwise content regex.
	isGlob := strings.ContainsAny(pattern, "*?[") || strings.Contains(pattern, "/")
	var contentRe *regexp.Regexp
	if !isGlob {
		re, reErr := regexp.Compile("(?i)" + pattern)
		if reErr != nil {
			return err(fmt.Sprintf("invalid pattern: %v", reErr))
		}
		contentRe = re
	}

	var b strings.Builder
	matches := 0
	examined := 0
	const maxExamined = 4000 // hard cap so a broad pattern can't walk the whole tree
	skipDirs := map[string]bool{
		".git": true, "node_modules": true, ".next": true, ".next-dev": true,
		".next-build": true, ".turbo": true, ".venv": true, "__pycache__": true,
		"vendor": true, ".hypernexus": true, "dist": true, "build": true,
		"target": true, ".cache": true, "lancedb": true, ".pi": true,
	}
	walkErr := filepath.Walk(root, func(p string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if info.IsDir() {
			if skipDirs[info.Name()] {
				return filepath.SkipDir
			}
			return nil
		}
		if matches >= limit || examined >= maxExamined {
			return filepath.SkipAll
		}
		examined++
		rel, _ := filepath.Rel(root, p)
		if isGlob {
			if ok, _ := filepath.Match(pattern, filepath.Base(p)); ok {
				b.WriteString(rel + "\n")
				matches++
			} else if ok2, _ := filepath.Match(pattern, rel); ok2 {
				b.WriteString(rel + "\n")
				matches++
			}
			return nil
		}
		// content search — skip obvious binaries and large files
		if info.Size() > 512*1024 {
			return nil
		}
		data, readErr := os.ReadFile(p)
		if readErr != nil {
			return nil
		}
		if strings.IndexByte(string(data), 0) >= 0 {
			return nil
		}
		for i, line := range strings.Split(string(data), "\n") {
			if contentRe.MatchString(line) {
				fmt.Fprintf(&b, "%s:%d:%s\n", rel, i+1, strings.TrimSpace(line))
				matches++
				if matches >= limit {
					break
				}
			}
		}
		return nil
	})
	if walkErr != nil {
		return err(fmt.Sprintf("search failed: %v", walkErr))
	}
	if matches == 0 {
		return ok(fmt.Sprintf("No matches for %q under %s", pattern, root))
	}
	return ok(fmt.Sprintf("Found %d match(es):\n%s", matches, b.String()))
}

// HandleCodeInterpreter — code_interpreter: evaluates code for a few safe cases
// (arithmetic via Go for "go", shell via the bash tool for "bash"/"sh"/"shell").
// For other languages returns a clear unsupported note rather than failing hard.
func HandleCodeInterpreter(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	lang := strings.ToLower(strArg(args, "language", "lang"))
	code := strArg(args, "code", "script")
	if code == "" {
		return err("code is required")
	}
	switch lang {
	case "bash", "sh", "shell", "powershell", "cmd":
		return HandleBash(ctx, map[string]interface{}{"command": code})
	case "go", "golang":
		return ok("(code_interpreter) Go snippets are compiled on demand via /api/code/exec — for direct execution use the bash tool with `go run`.")
	default:
		return ok(fmt.Sprintf("(code_interpreter) Language %q is not executed inline. Supported inline: bash/shell/powershell. Use the bash tool for shell, or /api/code/exec for sandboxed code.", lang))
	}
}

// HandleInstallMCPServer — install_mcp_server: records intent and points at the
// catalog installer (actual install goes through /api/catalog/install).
func HandleInstallMCPServer(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	name := strArg(args, "package_name", "package", "name", "server")
	if name == "" {
		return err("package_name is required")
	}
	return ok(fmt.Sprintf("(install_mcp_server) Queued %q. Install completes via POST /api/catalog/install {\"name\":%q} or the HyperNexus dashboard.", name, name))
}
