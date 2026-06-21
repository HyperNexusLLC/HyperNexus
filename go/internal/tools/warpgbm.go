package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

func HandleWarpGBMInfo(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	version, _ :=getString(args, "version")
	if version == "" {
		return err("version parameter is required")
}

	client := http.DefaultClient
	resp, e := client.Get(fmt.Sprintf("https://api.github.com/repos/WarpGBM/WarpGBM/releases/tags/v%s", version))
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("API request failed with status: %s", resp.Status))
}

	var result map[string]interface{}
	if e := json.NewDecoder(resp.Body).Decode(&result); e != nil {
		return err(e.Error())
}

	releaseDate, found := result["published_at"].(string)
	if !found {
		return err("failed to parse release date")
}

	return ok(fmt.Sprintf("WarpGBM v%s released on %s", version, releaseDate))
}

func HandleWarpGBMInstall(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	version, _ :=getString(args, "version")
	if version == "" {
		return err("version parameter is required")
}

	platform, _ :=getString(args, "platform")
	if platform == "" {
		return err("platform parameter is required")
}

	arch, _ :=getString(args, "arch")
	if arch == "" {
		return err("arch parameter is required")
}

	downloadURL := fmt.Sprintf("https://github.com/WarpGBM/WarpGBM/releases/download/v%s/warpgbm-%s-%s-%s.tar.gz",
		version, version, platform, arch)

	client := http.DefaultClient
	resp, e := client.Get(downloadURL)
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("download failed with status: %s", resp.Status))
}

	tempDir, e := os.MkdirTemp("", "warpgbm-install")
	if e != nil {
		return err(e.Error())
}

	defer os.RemoveAll(tempDir)

	tarPath := filepath.Join(tempDir, "warpgbm.tar.gz")
	tarFile, e := os.Create(tarPath)
	if e != nil {
		return err(e.Error())
}

	defer tarFile.Close()

	if _, e := io.Copy(tarFile, resp.Body); e != nil {
		return err(e.Error())
}

	cmd := exec.Command("tar", "-xzf", tarPath, "-C", tempDir)
	if e := cmd.Run(); e != nil {
		return err(e.Error())
}

	installPath, _ :=getString(args, "install_path")
	if installPath == "" {
		installPath = "/usr/local/bin"
	}

	binPath := filepath.Join(tempDir, "warpgbm")
	if e := os.Rename(binPath, filepath.Join(installPath, "warpgbm")); e != nil {
		return err(e.Error())
}

	return ok(fmt.Sprintf("WarpGBM v%s installed successfully to %s", version, installPath))
}

func HandleWarpGBMRun(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	command, _ :=getString(args, "command")
	if command == "" {
		return err("command parameter is required")
}

	argsStr, _ :=getString(args, "args")
	argsList := strings.Split(argsStr, " ")

	cmd := exec.Command("warpgbm", command)
	cmd.Args = append(cmd.Args, argsList...)

	output, e := cmd.CombinedOutput()
	if e != nil {
		return err(fmt.Sprintf("command failed: %s\nOutput: %s", e.Error(), string(output)))
}

	return ok(fmt.Sprintf("Command output:\n%s", string(output)))
}

func HandleWarpGBMConfig(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	configPath, _ :=getString(args, "config_path")
	if configPath == "" {
		return err("config_path parameter is required")
}

	configData, _ :=getString(args, "config_data")
	if configData == "" {
		return err("config_data parameter is required")
}

	if e := os.WriteFile(configPath, []byte(configData), 0644); e != nil {
		return err(e.Error())
}

	return ok(fmt.Sprintf("Configuration written to %s", configPath))
}

func HandleWarpGBMValidate(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	configPath, _ :=getString(args, "config_path")
	if configPath == "" {
		return err("config_path parameter is required")
}

	configFile, e := os.Open(configPath)
	if e != nil {
		return err(e.Error())
}

	defer configFile.Close()

	var config map[string]interface{}
	if e := json.NewDecoder(configFile).Decode(&config); e != nil {
		return err(e.Error())
}

	if _, found := config["version"]; !ok {
		return err("invalid configuration: missing version field")
}

	return ok("Configuration is valid")
}