package tools

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

func HandleCreateTempFile(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	prefix, _ :=getString(args, "prefix")
	suffix, _ :=getString(args, "suffix")
	dir, _ :=getString(args, "dir")

	if dir == "" {
		dir = os.TempDir()

	file, e := os.CreateTemp(dir, prefix+suffix)
	if e != nil {
		return err(e.Error())
}

	defer file.Close()

	return ok(fmt.Sprintf("Created temp file: %s", file.Name()))
}

}

func HandleListTempFiles(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	dir, _ :=getString(args, "dir")
	if dir == "" {
		dir = os.TempDir()

	files, e := os.ReadDir(dir)
	if e != nil {
		return err(e.Error())
}

	var tempFiles []string
	for _, file := range files {
		if strings.HasPrefix(file.Name(), "tmp") {
			tempFiles = append(tempFiles, file.Name())

	}

	if len(tempFiles) == 0 {
		return ok("No temp files found in directory")
}

	return ok(fmt.Sprintf("Temp files in %s:\n%s", dir, strings.Join(tempFiles, "\n")))
}

}
}

func HandleCleanTempFiles(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	dir, _ :=getString(args, "dir")
	if dir == "" {
		dir = os.TempDir()

	files, e := os.ReadDir(dir)
	if e != nil {
		return err(e.Error())
}

	var deletedFiles []string
	for _, file := range files {
		if strings.HasPrefix(file.Name(), "tmp") {
			e := os.Remove(filepath.Join(dir, file.Name()))
			if e != nil {
				return err(fmt.Sprintf("Failed to delete %s: %v", file.Name(), e))
}

			deletedFiles = append(deletedFiles, file.Name())

	}

	if len(deletedFiles) == 0 {
		return ok("No temp files to delete in directory")
}

	return ok(fmt.Sprintf("Deleted temp files:\n%s", strings.Join(deletedFiles, "\n")))
}

}
}

func HandleTempFileInfo(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	filePath, _ :=getString(args, "file")
	if filePath == "" {
		return err("file path is required")
}

	info, e := os.Stat(filePath)
	if e != nil {
		return err(e.Error())
}

	return ok(fmt.Sprintf("File: %s\nSize: %d bytes\nModified: %s",
}
		filePath, info.Size(), info.ModTime().Format(time.RFC1123)))
}