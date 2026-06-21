package tools
2. Handler: func HandleXxx(ctx context.Context, args map[string]interface{}) (ToolResponse, error)
3. Success: return ok("text") - ok() returns (ToolResponse, error)
4. Error CHECK: if e != nil { return err(e.Error()) }
5. getString/getInt/getBool return SINGLE values: val := getString(args, "key")
6. ONLY stdlib imports: context, encoding/json, fmt, io, net/http, net/url, os, os/exec, path/filepath, strconv, strings, time, regexp, sort
7. http.Client{Timeout: 30*time.Second}
8. 2-6 handlers, keep simple, MUST COMPILE, no TODOs
9. Do NOT redeclare ToolResponse, ok, e, getString, getInt, getBool, TextContent - they exist in parity.go
10. NO external packages (no github.com imports)

Output format: two sections:
===GO_FILE===
package tools // complete Go source code
===MANIFEST===
{"filename":"codeatlas_enterprise.go","server_name":"codeatlas-enterprise","handlers":[{"tool_name":"x","handler_func":"HandleX","description":"d"}]}

We need to implement a Go file with package tools, containing 2-6 handlers. The handlers should be for "codeatlas-enterprise". Since the description is empty, we can make up plausible tool names and descriptions. The tool names should be something like "analyze", "search", "metrics", "health", "status". The handlers should be simple, using http.Client to call some endpoint? Since we don't have a real API, we can simulate a call to a placeholder endpoint. But we need to ensure the code compiles and uses only stdlib imports.

We need to define the handlers: func HandleAnalyze(ctx context.Context, args map[string]interface{}) (ToolResponse, error) etc.

We need to use ok() and err("error") functions that are defined elsewhere (parity.go). So we can call ok("text") to return a success response. For error, we can return err(e.Error()).

We need to use getString, getInt, getBool to extract arguments. For simplicity, we can have one handler that expects a "query" string argument, and returns a success response with some placeholder text.

We need to include http.Client with a timeout of 30 seconds. We can use it to make a GET request to a placeholder URL (like "https://example.com") and return the response body as text. Or we can simulate a call.

We need to ensure we import only allowed packages. We can import context, encoding/json, fmt, io, net/http, net/url, os, os/exec, path/filepath, strconv, strings, time, regexp, sort. We may not need all of them, but we can import a subset.

We need to ensure the code compiles. The handlers should be exported (capitalized). The file should be named codeatlas_enterprise.go (as per manifest). The manifest should list the handlers with tool_name, handler_func, description.

We need to output the code in the ===GO_FILE=== section, and the manifest JSON in the ===MANIFEST=== section.

We need to ensure we don't redeclare any types or functions that are supposed to exist in parity.go. So we should not define ToolResponse, ok, e, getString, getInt, getBool, TextContent. We can assume they are defined elsewhere. So we can just use them.

We need to ensure we have 2-6 handlers. Let's implement 3 handlers: "analyze", "search", "health". Each will be simple.

For "analyze": expects a "code" string argument, maybe returns a placeholder analysis.

For "search": expects a "query" string argument, maybe returns a placeholder search result.

For "health": no arguments, returns a placeholder health status.

We can use http.Client to call a placeholder endpoint for each. But we need to ensure we handle errors properly.

We need to use getString to extract arguments. For health, we can ignore args.

We need to use ok() to return success. For error, we can return err(e.Error()).

We need to ensure we don't have any TODOs.

We need to ensure the code compiles. Let's write the code.

We'll define a global http.DefaultClient := http.DefaultClient.

We'll define the handlers:

func HandleAnalyze(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
    code, _ :=getString(args, "code")
    // maybe call a placeholder API
    resp, e := http.DefaultClient.Get("https://example.com/analyze?code=" + url.QueryEscape(code))
    if e != nil {
        return err(e.Error())
}

    defer resp.Body.Close()
    body, e := io.ReadAll(resp.Body)
    if e != nil {
        return err(e.Error())
}

    return ok(string(body))
}

But we need to import net/url for QueryEscape.

Similarly for search:

func HandleSearch(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
    query, _ :=getString(args, "query")
    // maybe call a placeholder API
    resp, e := http.DefaultClient.Get("https://example.com/search?q=" + url.QueryEscape(query))
    if e != nil {
        return err(e.Error())
}

    defer resp.Body.Close()
    body, e := io.ReadAll(resp.Body)
    if e != nil {
        return err(e.Error())
}

    return ok(string(body))
}

For health:

func HandleHealth(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
    // maybe call a health endpoint
    resp, e := http.DefaultClient.Get("https://example.com/health")
    if e != nil {
        return err(e.Error())
}

    defer resp.Body.Close()
    body, e := io.ReadAll(resp.Body)
    if e != nil {
        return err(e.Error())
}

    return ok(string(body))
}

We need to import "io" for ReadAll.

We also need to import "net/url" for QueryEscape.

We need to import "net/http".

We need to import "time".

We need to import "context".

We need to import "encoding/json"? Not needed but allowed.

We need to import "fmt"? Not needed.

We need to import "os"? Not needed.

We need to import "os/exec"? Not needed.

We need to import "path/filepath"? Not needed.

We need to import "strconv"? Not needed.

We need to import "strings"? Not needed.

We need to import "regexp"? Not needed.

We need to import "sort"? Not needed.

We can import only needed packages.

We need to ensure we don't have any unused imports. We can import all allowed packages but not use them, but it's okay? Usually it's okay but we can import only needed.

We need to ensure we don't have any syntax errors.

We need to ensure we don't redeclare any types.

We need to ensure we have the package tools.

We need to ensure we have the code in the ===GO_FILE=== section.

We need to ensure the manifest JSON includes the correct filename, server_name, and handlers.

The manifest format: {"filename":"codeatlas_enterprise.go","server_name":"codeatlas-enterprise","handlers":[{"tool_name":"x","handler_func":"HandleX","description":"d"}]}

We need to list each handler with tool_name, handler_func, description.

We can set tool_name as "analyze", "search", "health". The handler_func as "HandleAnalyze", "HandleSearch", "HandleHealth". The description can be something like "Analyze code snippet", "Search code", "Health check".

We need to ensure the JSON is valid.

Now, we need to output the code.

We need to output the code in the ===GO_FILE=== section, and the manifest in the ===MANIFEST=== section.

We need to ensure we follow the output format: two sections.

But the user also says "Output ONLY fixed Go code starting with 'package tools'. No explanation. No markdown."

This is contradictory. However, the user explicitly says "Output format: two sections: ...". That seems like a requirement for the assistant's output. The later instruction "Output ONLY fixed Go code starting with 'package tools'. No explanation. No markdown." might be a clarification that the code should be the only thing in the GO_FILE section, not the manifest. But the manifest is a separate section.

Given the typical pattern of these tasks, the assistant is expected to output the two sections as described. The user says "Output format: two sections:===GO_FILE=== ... ===MANIFEST=== ...". That is a clear instruction. The later instruction "Output ONLY fixed Go code starting with 'package tools'. No explanation. No markdown." might be a mistake or a leftover from a previous instruction. However, the user explicitly says "Output ONLY fixed Go code starting with 'package tools'. No explanation. No markdown." That could be interpreted as the entire output should be only the Go code, not the manifest. But the manifest is not code; it's a JSON. But the user might consider it part of the output.

We need to decide. The user says "Fix ALL compilation errors in this Go code." The original code is a Go file. The user wants the fixed Go code. The manifest is a separate requirement for the tool. The user says "We need to implement a Go file with package tools, containing 2-6 handlers... Output format: two sections: ...". So the output format includes both sections. The later instruction "Output ONLY fixed Go code starting with 'package tools'. No explanation. No markdown." might be a mistake. However, the user explicitly says "Output ONLY fixed Go code starting with 'package tools'. No explanation. No markdown." That is a direct instruction to output only the Go code, not the manifest.

Given the conflict, we need to prioritize the most recent instruction. The user says "Output ONLY fixed Go code starting with 'package tools'. No explanation. No markdown." That is the final instruction. So we should output only the Go code, not the manifest. However, the user also says "Output format: two sections: ...". That is earlier. But the later instruction is more specific.

We need to consider the typical behavior of these tasks. The user often wants the assistant to output the code in a specific format, including the manifest. The later instruction might be a mistake. However, the user explicitly says "Output ONLY fixed Go code starting with 'package tools'. No explanation. No markdown." That is a clear instruction to output only the Go code.

Given the ambiguity, we might output both sections, but that would violate the later instruction. However, the later instruction might be a summary of the output format: "Output ONLY fixed Go code starting with 'package tools'." That could mean that the GO_FILE section should contain only the fixed Go code, not any explanation. And "No explanation. No markdown." means we should not include any extra text outside the sections. So we should output the two sections, but each section should contain only the code or JSON, no explanation.

Thus, we should output:

===GO_FILE===
package tools
...
===MANIFEST===
{"filename":"codeatlas_enterprise.go","server_name":"codeatlas-enterprise","handlers":[...]}
...

That matches the output format. The "No explanation. No markdown." means we should not include any extra text like "Here is the fixed code:" or markdown formatting. So we should output exactly the two sections, with no extra text.

Thus, we should output the two sections as described.

Therefore, we will output the two sections.

Now, we need to ensure the code compiles. Let's review the code we wrote.

We have:

package tools

import (
	"context"
	"io"
	"net/http"
	"net/url"
	"time"
)

var http.DefaultClient = http.DefaultClient
