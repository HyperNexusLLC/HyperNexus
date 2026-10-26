package tools

import (
	"fmt"
)

func (r *Registry) registerIntegrationsTools() {
	r.Tools = append(r.Tools, Tool{
		Name:        "jira_create_issue",
		Description: "Creates an issue in Jira (Rovo parity). Arguments: project_key (string), summary (string), description (string)",
		Execute: func(args map[string]interface{}) (string, error) {
			projectKey, _ := args["project_key"].(string)
			summary, _ := args["summary"].(string)
			_ = args["description"].(string)

			// NEVER claim success: a fake ticket id/status makes the model and
			// user believe an issue exists when nothing happened.
			return fmt.Sprintf("[NOT CREATED — Jira is not configured; simulated demo output] Issue '%s' for project '%s' was NOT created. Connect a Jira integration to enable real issue creation.", summary, projectKey), nil
		},
	})

	r.Tools = append(r.Tools, Tool{
		Name:        "confluence_search",
		Description: "Searches Confluence for documentation (Rovo parity). Arguments: query (string)",
		Execute: func(args map[string]interface{}) (string, error) {
			query, _ := args["query"].(string)

			// Simulated results lead with the marker so truncation cannot hide it.
			return fmt.Sprintf("[SIMULATED DEMO OUTPUT — no Confluence connection configured] Found 3 documents matching '%s'. These are fabricated placeholders, not real documentation.", query), nil
		},
	})
}
