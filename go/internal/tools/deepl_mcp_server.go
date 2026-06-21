package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

// DeepLClient handles communication with the DeepL API
type DeepLClient struct {
	apiKey string
	client *http.Client
}

func NewDeepLClient(apiKey string) *DeepLClient {
	return &DeepLClient{
}
		apiKey: apiKey,
		client: &http.Client{Timeout: 30 * time.Second},
	}
}

func (c *DeepLClient) doRequest(method, endpoint string, params url.Values) ([]byte, error) {
	req, e := http.NewRequest(method, fmt.Sprintf("https://api-free.deepl.com/v2/%s", endpoint), strings.NewReader(params.Encode()))
	if e != nil {
		return nil, e
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Authorization", "DeepL-Auth-Key "+c.apiKey)

	resp, e := c.client.Do(req)
	if e != nil {
		return nil, e
	}
	defer resp.Body.Close()

	body, e := io.ReadAll(resp.Body)
	if e != nil {
		return nil, e
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API error: %s", string(body))
}

	return body, nil
}

func (c *DeepLClient) GetLanguages() (map[string]interface{}, error) {
	params := url.Values{}
	resp, e := c.doRequest("GET", "languages", params)
	if e != nil {
		return nil, e
	}

	var result map[string]interface{}
	if e := json.Unmarshal(resp, &result); e != nil {
		return nil, e
	}

	return result, nil
}

func (c *DeepLClient) TranslateText(text, targetLang string, sourceLang, formality, glossaryId string) (string, error) {
	params := url.Values{
		"text":        {text},
		"target_lang": {targetLang},
	}

	if sourceLang != "" {
		params.Set("source_lang", sourceLang)

	if formality != "" {
		params.Set("formality", formality)

	if glossaryId != "" {
		params.Set("glossary_id", glossaryId)

	resp, e := c.doRequest("POST", "translate", params)
	if e != nil {
		return "", e
	}

	var result struct {
		Translations []struct {
			Text string `json:"text"`
		} `json:"translations"`
	}

	if e := json.Unmarshal(resp, &result); e != nil {
		return "", e
	}

	if len(result.Translations) == 0 {
		return "", fmt.Errorf("no translations returned")
}

	return result.Translations[0].Text, nil
}

func (c *DeepLClient) TranslateDocument(inputFile, outputFile, targetLang string, sourceLang, formality, glossaryId string) (string, error) {
	// Read the input file
	content, e := os.ReadFile(inputFile)
	if e != nil {
		return "", e
	}

	// Upload the document
	params := url.Values{
		"target_lang": {targetLang},
	}

	if sourceLang != "" {
		params.Set("source_lang", sourceLang)

	if formality != "" {
		params.Set("formality", formality)

	if glossaryId != "" {
		params.Set("glossary_id", glossaryId)

	resp, e := c.doRequest("POST", "document", params)
	if e != nil {
		return "", e
	}

	var uploadResult struct {
		DocumentID string `json:"document_id"`
	}
	if e := json.Unmarshal(resp, &uploadResult); e != nil {
		return "", e
	}

	// Poll for completion
	for i := 0; i < 60; i++ {
		time.Sleep(5 * time.Second)

		params := url.Values{
			"document_id": {uploadResult.DocumentID},
		}

		resp, e := c.doRequest("GET", "document", params)
		if e != nil {
			return "", e
		}

		var statusResult struct {
			Status string `json:"status"`
		}
		if e := json.Unmarshal(resp, &statusResult); e != nil {
			return "", e
		}

		if statusResult.Status == "COMPLETED" {
			break
		}
	}

	// Download the translated document
	params := url.Values{
		"document_id": {uploadResult.DocumentID},
	}

	resp, e = c.doRequest("GET", "document/download", params)
	if e != nil {
		return "", e
	}

	// Determine output filename if not provided
	if outputFile == "" {
		ext := filepath.Ext(inputFile)
		base := strings.TrimSuffix(inputFile, ext)
		outputFile = fmt.Sprintf("%s_%s%s", base, targetLang, ext)

	// Write the output file
	if e := os.WriteFile(outputFile, resp, 0644); e != nil {
		return "", e
	}

	return outputFile, nil
}

func (c *DeepLClient) ListGlossaries() ([]map[string]interface{}, error) {
	resp, e := c.doRequest("GET", "glossaries", nil)
	if e != nil {
		return nil, e
	}

	var result struct {
		Glossaries []map[string]interface{} `json:"glossaries"`
	}

	if e := json.Unmarshal(resp, &result); e != nil {
		return nil, e
	}

	return result.Glossaries, nil
}

func (c *DeepLClient) GetGlossaryInfo(glossaryId string) (map[string]interface{}, error) {
	params := url.Values{
		"glossary_id": {glossaryId},
	}

	resp, e := c.doRequest("GET", "glossary", params)
	if e != nil {
		return nil, e
	}

	var result map[string]interface{}
	if e := json.Unmarshal(resp, &result); e != nil {
		return nil, e
	}

	return result, nil
}

func (c *DeepLClient) GetGlossaryDictionaryEntries(glossaryId, sourceLang, targetLang string) (map[string]interface{}, error) {
	params := url.Values{
		"glossary_id": {glossaryId},
		"source_lang": {sourceLang},
		"target_lang": {targetLang},
	}

	resp, e := c.doRequest("GET", "glossary/dictionary", params)
	if e != nil {
		return nil, e
	}

	var result map[string]interface{}
	if e := json.Unmarshal(resp, &result); e != nil {
		return nil, e
	}

	return result, nil
}

}
}
}
}
}
}

// Handler functions

func HandleGetSourceLanguages(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	client := NewDeepLClient(os.Getenv("DEEPL_API_KEY"))
	languages, e := client.GetLanguages()
	if e != nil {
		return err(e.Error())
}

	var sourceLanguages []string
	for lang := range languages {
		sourceLanguages = append(sourceLanguages, lang)

	return ok(TextContent(strings.Join(sourceLanguages, ", ")))
}

}

func HandleGetTargetLanguages(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	client := NewDeepLClient(os.Getenv("DEEPL_API_KEY"))
	languages, e := client.GetLanguages()
	if e != nil {
		return err(e.Error())
}

	var targetLanguages []string
	for lang := range languages {
		targetLanguages = append(targetLanguages, lang)

	return ok(TextContent(strings.Join(targetLanguages, ", ")))
}

}

func HandleTranslateText(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	text, _ :=getString(args, "text")
	targetLang, _ :=getString(args, "targetLangCode")
	sourceLang, _ :=getString(args, "sourceLangCode")
	formality, _ :=getString(args, "formality")
	glossaryId, _ :=getString(args, "glossaryId")

	client := NewDeepLClient(os.Getenv("DEEPL_API_KEY"))
	translation, e := client.TranslateText(text, targetLang, sourceLang, formality, glossaryId)
	if e != nil {
		return err(e.Error())
}

	return ok(TextContent(translation))
}

func HandleTranslateDocument(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	inputFile, _ :=getString(args, "inputFile")
	outputFile, _ :=getString(args, "outputFile")
	targetLang, _ :=getString(args, "targetLangCode")
	sourceLang, _ :=getString(args, "sourceLangCode")
	formality, _ :=getString(args, "formality")
	glossaryId, _ :=getString(args, "glossaryId")

	client := NewDeepLClient(os.Getenv("DEEPL_API_KEY"))
	outputPath, e := client.TranslateDocument(inputFile, outputFile, targetLang, sourceLang, formality, glossaryId)
	if e != nil {
		return err(e.Error())
}

	return ok(TextContent(fmt.Sprintf("Document translated successfully. Output file: %s", outputPath)))
}

func HandleListGlossaries(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	client := NewDeepLClient(os.Getenv("DEEPL_API_KEY"))
	glossaries, e := client.ListGlossaries()
	if e != nil {
		return err(e.Error())
}

	var glossaryNames []string
	for _, glossary := range glossaries {
		if name, found := glossary["name"]; found {
			glossaryNames = append(glossaryNames, fmt.Sprintf("%v", name))

	}

	return ok(TextContent(strings.Join(glossaryNames, "\n")))
}

}

func HandleGetGlossaryInfo(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	glossaryId, _ :=getString(args, "glossaryId")

	client := NewDeepLClient(os.Getenv("DEEPL_API_KEY"))
	info, e := client.GetGlossaryInfo(glossaryId)
	if e != nil {
		return err(e.Error())
}

	return ok(TextContent(fmt.Sprintf("Glossary info: %v", info)))
}