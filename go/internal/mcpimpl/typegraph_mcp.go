package mcpimpl

import (
	"context"
	"strconv"
)

func HandleGetHover(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	file, _ :=getString(args, "file")
	line, _ :=getInt(args, "line")
	col, _ :=getInt(args, "col")
	if file == "" {
		return err("file is required")
}

	return ok("hover info for " + file + " at " + strconv.Itoa(line) + ":" + strconv.Itoa(col))
}

func HandleGetCompletions(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	file, _ :=getString(args, "file")
	line, _ :=getInt(args, "line")
	col, _ :=getInt(args, "col")
	if file == "" {
		return err("file is required")
}

	return ok("completions for " + file + " at " + strconv.Itoa(line) + ":" + strconv.Itoa(col))
}