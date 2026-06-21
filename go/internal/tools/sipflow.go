package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os/exec"
	"strings"
	"time"
)

const sipFlowBaseURL = "http://sipflow.example.com/api/v1"

func HandlePing(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	client := http.DefaultClient
	resp, e := client.Get(sipFlowBaseURL + "/ping")
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("Unexpected status code: %d", resp.StatusCode))
}

	var result map[string]interface{}
	if e := json.NewDecoder(resp.Body).Decode(&result); e != nil {
		return err(e.Error())
}

	return ok(fmt.Sprintf("Pong: %v", result["message"]))
}

func HandleCallDetailRecord(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	callID, _ :=getString(args, "call_id")
	if callID == "" {
		return err("call_id is required")
}

	client := http.DefaultClient
	resp, e := client.Get(sipFlowBaseURL + "/cdr?call_id=" + url.QueryEscape(callID))
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("Unexpected status code: %d", resp.StatusCode))
}

	var result map[string]interface{}
	if e := json.NewDecoder(resp.Body).Decode(&result); e != nil {
		return err(e.Error())
}

	return ok(fmt.Sprintf("CDR for %s: %v", callID, result))
}

func HandleCallSummary(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	startTime, _ :=getString(args, "start_time")
	endTime, _ :=getString(args, "end_time")
	if startTime == "" || endTime == "" {
		return err("start_time and end_time are required")
}

	client := http.DefaultClient
	resp, e := client.Get(sipFlowBaseURL + "/summary?start=" + url.QueryEscape(startTime) + "&end=" + url.QueryEscape(endTime))
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("Unexpected status code: %d", resp.StatusCode))
}

	var result map[string]interface{}
	if e := json.NewDecoder(resp.Body).Decode(&result); e != nil {
		return err(e.Error())
}

	return ok(fmt.Sprintf("Call summary from %s to %s: %v", startTime, endTime, result))
}

func HandleCallTrace(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	callID, _ :=getString(args, "call_id")
	if callID == "" {
		return err("call_id is required")
}

	client := http.DefaultClient
	resp, e := client.Get(sipFlowBaseURL + "/trace?call_id=" + url.QueryEscape(callID))
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("Unexpected status code: %d", resp.StatusCode))
}

	var result map[string]interface{}
	if e := json.NewDecoder(resp.Body).Decode(&result); e != nil {
		return err(e.Error())
}

	return ok(fmt.Sprintf("Trace for call %s: %v", callID, result))
}

func HandleSIPStats(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	interval, _ :=getString(args, "interval")
	if interval == "" {
		interval = "1h" // default to 1 hour
	}

	client := http.DefaultClient
	resp, e := client.Get(sipFlowBaseURL + "/stats?interval=" + url.QueryEscape(interval))
	if e != nil {
		return err(e.Error())
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("Unexpected status code: %d", resp.StatusCode))
}

	var result map[string]interface{}
	if e := json.NewDecoder(resp.Body).Decode(&result); e != nil {
		return err(e.Error())
}

	return ok(fmt.Sprintf("SIP statistics for %s: %v", interval, result))
}

func HandleSIPFlowCLI(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	command, _ :=getString(args, "command")
	if command == "" {
		return err("command is required")
}

	cmd := exec.Command("sipflow-cli", strings.Split(command, " ")...)
	output, e := cmd.CombinedOutput()
	if e != nil {
		return err(fmt.Sprintf("Command failed: %v\nOutput: %s", e, string(output)))
}

	return ok(fmt.Sprintf("Command output:\n%s", string(output)))
}