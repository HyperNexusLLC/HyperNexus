package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

const (
	apiBaseURL = "https://api.sentinelsignal.com/v1"
)

func HandleScoreClaim(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	claimID, _ :=getString(args, "claim_id")
	if claimID == "" {
		return err("claim_id is required")
}

	patientID, _ :=getString(args, "patient_id")
	if patientID == "" {
		return err("patient_id is required")
}

	score, e := scoreClaim(ctx, claimID, patientID)
	if e != nil {
		return err(e.Error())
}

	return ok(fmt.Sprintf("Claim %s scored with risk level: %d", claimID, score))
}

func HandleGetClaimDetails(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	claimID, _ :=getString(args, "claim_id")
	if claimID == "" {
		return err("claim_id is required")
}

	details, e := getClaimDetails(ctx, claimID)
	if e != nil {
		return err(e.Error())
}

	return ok(fmt.Sprintf("Claim details for %s:\n%s", claimID, details))
}

func HandleGetPatientHistory(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	patientID, _ :=getString(args, "patient_id")
	if patientID == "" {
		return err("patient_id is required")
}

	history, e := getPatientHistory(ctx, patientID)
	if e != nil {
		return err(e.Error())
}

	return ok(fmt.Sprintf("Patient history for %s:\n%s", patientID, history))
}

func HandleCheckProviderCompliance(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	providerID, _ :=getString(args, "provider_id")
	if providerID == "" {
		return err("provider_id is required")
}

	compliant, e := checkProviderCompliance(ctx, providerID)
	if e != nil {
		return err(e.Error())
}

	if compliant {
		return ok(fmt.Sprintf("Provider %s is compliant with regulations", providerID))
}

	return ok(fmt.Sprintf("Provider %s is NOT compliant with regulations", providerID))
}

func scoreClaim(ctx context.Context, claimID, patientID string) (int, error) {
	client := http.DefaultClient
	u, e := url.Parse(apiBaseURL + "/score")
	if e != nil {
		return 0, e
	}

	q := u.Query()
	q.Add("claim_id", claimID)
	q.Add("patient_id", patientID)
	u.RawQuery = q.Encode()

	resp, e := client.Get(u.String())
	if e != nil {
		return 0, e
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("API error: %s", resp.Status)
}

	var result struct {
		Score int `json:"score"`
	}
	if e := json.NewDecoder(resp.Body).Decode(&result); e != nil {
		return 0, e
	}

	return result.Score, nil
}

func getClaimDetails(ctx context.Context, claimID string) (string, error) {
	client := http.DefaultClient
	u, e := url.Parse(apiBaseURL + "/claims/" + claimID)
	if e != nil {
		return "", e
	}

	resp, e := client.Get(u.String())
	if e != nil {
		return "", e
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API error: %s", resp.Status)
}

	var details struct {
		Details string `json:"details"`
	}
	if e := json.NewDecoder(resp.Body).Decode(&details); e != nil {
		return "", e
	}

	return details.Details, nil
}

func getPatientHistory(ctx context.Context, patientID string) (string, error) {
	client := http.DefaultClient
	u, e := url.Parse(apiBaseURL + "/patients/" + patientID + "/history")
	if e != nil {
		return "", e
	}

	resp, e := client.Get(u.String())
	if e != nil {
		return "", e
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API error: %s", resp.Status)
}

	var history struct {
		History string `json:"history"`
	}
	if e := json.NewDecoder(resp.Body).Decode(&history); e != nil {
		return "", e
	}

	return history.History, nil
}

func checkProviderCompliance(ctx context.Context, providerID string) (bool, error) {
	client := http.DefaultClient
	u, e := url.Parse(apiBaseURL + "/providers/" + providerID + "/compliance")
	if e != nil {
		return false, e
	}

	resp, e := client.Get(u.String())
	if e != nil {
		return false, e
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return false, fmt.Errorf("API error: %s", resp.Status)
}

	var compliance struct {
		Compliant bool `json:"compliant"`
	}
	if e := json.NewDecoder(resp.Body).Decode(&compliance); e != nil {
		return false, e
	}

	return compliance.Compliant, nil
}