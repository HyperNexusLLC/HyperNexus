package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const (
	baseURL = "https://api.retellai.com/v2"
)

var http.DefaultClient = http.DefaultClient

func HandleCreateAgent(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	apiKey, _ :=getString(args, "api_key")
	if apiKey == "" {
		return err("api_key is required")
}

	responseEngineType, _ :=getString(args, "response_engine_type")
	llmID, _ :=getString(args, "llm_id")
	voiceID, _ :=getString(args, "voice_id")

	if responseEngineType == "" || llmID == "" || voiceID == "" {
		return err("response_engine_type, llm_id, and voice_id are required")
}

	payload := map[string]interface{}{
		"response_engine": map[string]interface{}{
			"type": responseEngineType,
			"llm_id": llmID,
		},
		"voice_id": voiceID,
	}

	jsonPayload, e := json.Marshal(payload)
	if e != nil {
		return err(fmt.Sprintf("failed to marshal payload: %v", e))
}

	req, e := http.NewRequestWithContext(ctx, "POST", baseURL+"/create-agent", strings.NewReader(string(jsonPayload)))
	if e != nil {
		return err(fmt.Sprintf("failed to create request: %v", e))
}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, e := http.DefaultClient.Do(req)
	if e != nil {
		return err(fmt.Sprintf("failed to execute request: %v", e))
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("API request failed with status code: %d", resp.StatusCode))
}

	var result map[string]interface{}
	if e := json.NewDecoder(resp.Body).Decode(&result); e != nil {
		return err(fmt.Sprintf("failed to decode response: %v", e))
}

	agentID, found := result["agent_id"].(string)
	if !found {
		return err("failed to get agent_id from response")
}

	return ok(fmt.Sprintf("Agent created successfully with ID: %s", agentID))
}

func HandleCreatePhoneCall(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	apiKey, _ :=getString(args, "api_key")
	if apiKey == "" {
		return err("api_key is required")
}

	agentID, _ :=getString(args, "agent_id")
	phoneNumber, _ :=getString(args, "phone_number")
	if agentID == "" || phoneNumber == "" {
		return err("agent_id and phone_number are required")
}

	payload := map[string]interface{}{
		"agent_id":      agentID,
		"phone_number":  phoneNumber,
		"from_number":   getString(args, "from_number"),
		"caller_name":   getString(args, "caller_name"),
		"caller_number": getString(args, "caller_number"),
	}

	jsonPayload, e := json.Marshal(payload)
	if e != nil {
		return err(fmt.Sprintf("failed to marshal payload: %v", e))
}

	req, e := http.NewRequestWithContext(ctx, "POST", baseURL+"/create-phone-call", strings.NewReader(string(jsonPayload)))
	if e != nil {
		return err(fmt.Sprintf("failed to create request: %v", e))
}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, e := http.DefaultClient.Do(req)
	if e != nil {
		return err(fmt.Sprintf("failed to execute request: %v", e))
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("API request failed with status code: %d", resp.StatusCode))
}

	var result map[string]interface{}
	if e := json.NewDecoder(resp.Body).Decode(&result); e != nil {
		return err(fmt.Sprintf("failed to decode response: %v", e))
}

	callID, found := result["call_id"].(string)
	if !found {
		return err("failed to get call_id from response")
}

	return ok(fmt.Sprintf("Phone call created successfully with ID: %s", callID))
}

func HandleCreateWebCall(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	apiKey, _ :=getString(args, "api_key")
	if apiKey == "" {
		return err("api_key is required")
}

	agentID, _ :=getString(args, "agent_id")
	if agentID == "" {
		return err("agent_id is required")
}

	payload := map[string]interface{}{
		"agent_id": agentID,
		"url":      getString(args, "url"),
	}

	jsonPayload, e := json.Marshal(payload)
	if e != nil {
		return err(fmt.Sprintf("failed to marshal payload: %v", e))
}

	req, e := http.NewRequestWithContext(ctx, "POST", baseURL+"/create-web-call", strings.NewReader(string(jsonPayload)))
	if e != nil {
		return err(fmt.Sprintf("failed to create request: %v", e))
}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, e := http.DefaultClient.Do(req)
	if e != nil {
		return err(fmt.Sprintf("failed to execute request: %v", e))
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("API request failed with status code: %d", resp.StatusCode))
}

	var result map[string]interface{}
	if e := json.NewDecoder(resp.Body).Decode(&result); e != nil {
		return err(fmt.Sprintf("failed to decode response: %v", e))
}

	callID, found := result["call_id"].(string)
	if !found {
		return err("failed to get call_id from response")
}

	return ok(fmt.Sprintf("Web call created successfully with ID: %s", callID))
}

func HandleCreateChat(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	apiKey, _ :=getString(args, "api_key")
	if apiKey == "" {
		return err("api_key is required")
}

	agentID, _ :=getString(args, "agent_id")
	if agentID == "" {
		return err("agent_id is required")
}

	payload := map[string]interface{}{
		"agent_id": agentID,
	}

	jsonPayload, e := json.Marshal(payload)
	if e != nil {
		return err(fmt.Sprintf("failed to marshal payload: %v", e))
}

	req, e := http.NewRequestWithContext(ctx, "POST", baseURL+"/create-chat", strings.NewReader(string(jsonPayload)))
	if e != nil {
		return err(fmt.Sprintf("failed to create request: %v", e))
}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, e := http.DefaultClient.Do(req)
	if e != nil {
		return err(fmt.Sprintf("failed to execute request: %v", e))
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("API request failed with status code: %d", resp.StatusCode))
}

	var result map[string]interface{}
	if e := json.NewDecoder(resp.Body).Decode(&result); e != nil {
		return err(fmt.Sprintf("failed to decode response: %v", e))
}

	chatID, found := result["chat_id"].(string)
	if !found {
		return err("failed to get chat_id from response")
}

	return ok(fmt.Sprintf("Chat created successfully with ID: %s", chatID))
}

func HandleCreateSMSChat(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	apiKey, _ :=getString(args, "api_key")
	if apiKey == "" {
		return err("api_key is required")
}

	agentID, _ :=getString(args, "agent_id")
	phoneNumber, _ :=getString(args, "phone_number")
	if agentID == "" || phoneNumber == "" {
		return err("agent_id and phone_number are required")
}

	payload := map[string]interface{}{
		"agent_id":     agentID,
		"phone_number": phoneNumber,
	}

	jsonPayload, e := json.Marshal(payload)
	if e != nil {
		return err(fmt.Sprintf("failed to marshal payload: %v", e))
}

	req, e := http.NewRequestWithContext(ctx, "POST", baseURL+"/create-sms-chat", strings.NewReader(string(jsonPayload)))
	if e != nil {
		return err(fmt.Sprintf("failed to create request: %v", e))
}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, e := http.DefaultClient.Do(req)
	if e != nil {
		return err(fmt.Sprintf("failed to execute request: %v", e))
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("API request failed with status code: %d", resp.StatusCode))
}

	var result map[string]interface{}
	if e := json.NewDecoder(resp.Body).Decode(&result); e != nil {
		return err(fmt.Sprintf("failed to decode response: %v", e))
}

	chatID, found := result["chat_id"].(string)
	if !found {
		return err("failed to get chat_id from response")
}

	return ok(fmt.Sprintf("SMS chat created successfully with ID: %s", chatID))
}

func HandleCreatePhoneNumber(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	apiKey, _ :=getString(args, "api_key")
	if apiKey == "" {
		return err("api_key is required")
}

	countryCode, _ :=getString(args, "country_code")
	if countryCode == "" {
		return err("country_code is required")
}

	payload := map[string]interface{}{
		"country_code": countryCode,
	}

	jsonPayload, e := json.Marshal(payload)
	if e != nil {
		return err(fmt.Sprintf("failed to marshal payload: %v", e))
}

	req, e := http.NewRequestWithContext(ctx, "POST", baseURL+"/create-phone-number", strings.NewReader(string(jsonPayload)))
	if e != nil {
		return err(fmt.Sprintf("failed to create request: %v", e))
}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, e := http.DefaultClient.Do(req)
	if e != nil {
		return err(fmt.Sprintf("failed to execute request: %v", e))
}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return err(fmt.Sprintf("API request failed with status code: %d", resp.StatusCode))
}

	var result map[string]interface{}
	if e := json.NewDecoder(resp.Body).Decode(&result); e != nil {
		return err(fmt.Sprintf("failed to decode response: %v", e))
}

	phoneNumber, found := result["phone_number"].(string)
	if !found {
		return err("failed to get phone_number from response")
}

	return ok(fmt.Sprintf("Phone number created successfully: %s", phoneNumber))
}