package tools. It should contain handlers for a tool named "codeloop". The description is unknown. The user says "Implement a Go-native MCP tool module for "codeloop". GitHub: | Category: unknown | Description: " So we need to guess what the tool does? Possibly it's a tool that does something like "codeloop" - maybe a code loop? But we need to implement something plausible. The user didn't specify the tool's functionality. We need to infer from the rules. The rules say:

1. Package: package tools
2. Handler: func HandleXxx(ctx context.Context, args map[string]interface{}) (ToolResponse, error)
3. Success: return ok("text") - ok() returns (ToolResponse, error)
4. Error CHECK: if e != nil { return err(e.Error()) }
5. getString/getInt/getBool return SINGLE values: val := getString(args, "key")
6. ONLY stdlib imports: context, encoding/json, fmt, io, net/http, net/url, os, os/exec, path/filepath, strconv, strings, time, regexp, sort
7. http.Client{Timeout: 30*time.Second}
8. 2-6 handlers, keep simple, MUST COMPILE, no TODOs
9. Do NOT redeclare ToolResponse, ok, e, getString, getInt, getBool, TextContent - they exist in parity.go
10. NO external packages (no github.com imports)

We need to output two sections:===GO_FILE=== and ===MANIFEST===.

The manifest JSON should have filename "codeloop.go", server_name "codeloop", and handlers list with tool_name, handler_func, description.

We need to implement 2-6 handlers. The tool name is "codeloop". Possibly we need multiple handlers for different sub-tools? Or maybe we need to implement multiple handlers for the same tool? Usually an MCP tool has a single handler. But the rule says 2-6 handlers, keep simple. So maybe we need to implement multiple handlers for different operations like "list", "run", "status". But the tool name is "codeloop". Possibly we need to implement multiple handlers for different subcommands. However, the manifest expects a list of handlers, each with tool_name, handler_func, description.

We need to guess the tool's functionality. The description is unknown. So we can implement a simple tool that does something like "codeloop" that takes a command argument and runs it. For example, we could implement a tool that runs a code snippet in a loop. But we need to keep it simple. Perhaps we can implement a tool that just returns a greeting. But that seems too trivial. However, the user didn't specify functionality. The description is unknown. So we can implement a placeholder tool that does something simple, like "codeloop" that takes a "command" argument and runs it using exec.Command, capturing output, and returns it. That would be a plausible "codeloop" tool: it loops over a command? Or maybe it just runs a command. But the name "codeloop" suggests looping. Could be a tool that runs a code snippet multiple times. But we can implement a simple tool that takes a "code" string and repeats it N times. But we need to use exec? Not necessarily. We could just generate a string.

But the rule says we can use os/exec. So we could implement a tool that runs a command and loops it. But we need to keep it simple.

Given the constraints, we can implement a tool that takes a "command" argument (string) and runs it using exec.Command, capturing stdout and stderr, and returns the output. That would be a simple tool. But we need to implement a handler for it. The handler function name could be HandleCodeloop. The tool_name could be "codeloop". The description could be "Runs a command and returns its output". That seems plausible.

But the rule says 2-6 handlers. So we need at least 2 handlers. We could implement two handlers: one for running a command (codeloop_run) and one for listing available commands (codeloop_list). Or we could implement two handlers for the same tool name but different functions? Usually each handler corresponds to a tool. But the manifest expects a list of handlers, each with tool_name and handler_func. So we could have two entries: tool_name "codeloop_run" and "codeloop_list". But the server_name is "codeloop". The tool_name can be anything. The user didn't specify tool names. So we can choose.

Alternatively, we could implement multiple handlers for the same tool name but different functions? That seems odd. Usually each tool has a unique name. So we can implement two tools: "codeloop_run" and "codeloop_list". That would satisfy the 2-6 handlers rule.

But the user said "Implement a Go-native MCP tool module for "codeloop"." That suggests the module is for a tool named "codeloop". It might have multiple subcommands. But we can implement a single tool with multiple handlers? Not typical. However, the manifest expects a list of handlers, each with tool_name. So we could have multiple entries with the same tool_name? That would be weird. But maybe the manifest expects each handler to be a tool. So we can have multiple tools under the same server.

Given the ambiguity, we need to make a reasonable guess. The simplest is to implement a single tool named "codeloop" with a handler HandleCodeloop. But that would be only one handler, violating the rule "2-6 handlers". So we need at least 2 handlers. So we need at least two tools. We could implement two tools: "codeloop_echo" and "codeloop_run". But the server_name is "codeloop". The tool_name can be anything. The manifest expects a list of handlers. So we can have two entries.

Alternatively, we could implement two handlers for the same tool name but different functions? That would be weird but possible if the tool supports multiple operations via arguments. But the manifest expects tool_name and handler_func. It doesn't forbid duplicate tool_name. But it's not typical.

Given the rule "2-6 handlers, keep simple", we can implement two handlers: one for "codeloop_run" and one for "codeloop_list". Or we could implement "codeloop_list" and "codeloop_run". Let's choose "codeloop_run" and "codeloop_list". The description for "codeloop_run" could be "Runs a command and returns its output". For "codeloop_list", could be "Lists available commands". But we need to implement something for list. We could list files in the current directory or something. That would be simple.

Thus, we can implement:

- HandleCodeloopRun: takes a "command" argument (string), runs it via exec.Command, captures stdout and stderr, returns output as text. If error, return e.

- HandleCodeloopList: takes a "path" argument (optional, default "."), reads directory, returns list of files.

We need to use only stdlib imports. We'll need to import os, os/exec, strings, etc.

We also need to define the handlers in the same file. The file should be named codeloop.go (as per manifest). The package is tools. The file should contain the handler functions and any necessary imports.

We also need to ensure we don't redeclare ToolResponse, ok, e, getString, getInt, getBool, TextContent. Those are defined in parity.go (which we don't have). So we can assume they exist. So we can use ok("text") to return success, and err(e.Error()) to return error.

We need to use getString(args, "key") to get arguments.

We need to handle errors: if e != nil { return err(e.Error()) }.

We need to use http.Client{Timeout: 30*time.Second} somewhere? The rule says "http.Client{Timeout: 30*time.Second}". But we might not need HTTP. However, we could include it as a global variable for completeness. But it's not required. The rule says "http.Client{Timeout: 30*time.Second}" as a requirement. So we need to include it somewhere. Perhaps we can use it in a handler that makes an HTTP request. But we can also just define it and not use it? The rule says "http.Client{Timeout: 30*time.Second}" as a requirement. It might be that we need to use it. But we can also just define it as a variable and not use it. However, it's better to use it. We could implement a third handler that fetches a URL. That would satisfy the requirement. But we already have two handlers. We could add a third handler for HTTP GET. That would be a third handler, still within 2-6. So we can implement three handlers: run, list, http_get. That would be good.

Thus, we can implement:

- HandleCodeloopRun: runs a command.

- HandleCodeloopList: lists directory.

- HandleCodeloopHttpGet: fetches a URL using http.Client with timeout.

That would be three handlers.

Now, we need to implement these handlers.

First, we need to import the required packages: context, encoding/json, fmt, io, net/http, net/url, os, os/exec, path/filepath, strconv, strings, time, regexp, sort. We may not need all, but we can import them as needed.

We need to define a global http.Client with timeout: var http.DefaultClient = http.DefaultClient

Now, implement HandleCodeloopRun:

func HandleCodeloopRun(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
    cmdStr, _ :=getString(args, "command")
    if cmdStr == "" {
        return err("command argument is required")
}

    // Split command into parts? For simplicity, we can use shell? But exec.Command expects program and args. We can use strings.Fields.
    parts := strings.Fields(cmdStr)
    if len(parts) == 0 {
        return err("empty command")
}

    cmd := exec.Command(parts[0], parts[1:]...)
    // Capture output
    output, e := cmd.CombinedOutput()
    if e != nil {
        return err(e.Error())
}

    return ok(string(output))
}

But we need to handle context cancellation? We could check ctx.Done() but not required.

Now, HandleCodeloopList:

func HandleCodeloopList(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
    path, _ :=getString(args, "path")
    if path == "" {
        path = "."
    }
    entries, e := os.ReadDir(path)
    if e != nil {
        return err(e.Error())
}

    var names []string
    for _, entry := range entries {
        names = append(names, entry.Name())

    // Sort names
    sort.Strings(names)
    // Convert to JSON? Or just text? The ok() expects a string. We can format as a list.
    // We can join with newline.
    result := strings.Join(names, "\n")
    return ok(result)
}

Now, HandleCodeloopHttpGet:

}

func HandleCodeloopHttpGet(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
    urlStr, _ :=getString(args, "url")
    if urlStr == "" {
        return err("url argument is required")
}

    // Validate URL? Use url.Parse
    _, e := url.Parse(urlStr)
    if e != nil {
        return err(e.Error())
}

    req, e := http.NewRequestWithContext(ctx, http.MethodGet, urlStr, nil)
    if e != nil {
        return err(e.Error())
}

    resp, e := http.DefaultClient.Do(req)
    if e != nil {
        return err(e.Error())
}

    defer resp.Body.Close()
    if resp.StatusCode != http.StatusOK {
        return err(fmt.Sprintf("HTTP error: %s", resp.Status))
}

    body, e := io.ReadAll(resp.Body)
    if e != nil {
        return err(e.Error())
}

    return ok(string(body))
}