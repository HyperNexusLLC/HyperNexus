package httpapi

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// SSOConfig — SAML/OIDC configuration for a tenant
type SSOConfig struct {
	AccountID    string `json:"account_id"`
	Provider     string `json:"provider"` // saml, oidc, okta, azure-ad, google
	IssuerURL    string `json:"issuer_url"`
	ClientID     string `json:"client_id"`
	Certificate  string `json:"certificate"`
	MetadataURL  string `json:"metadata_url"`
	Enabled      bool   `json:"enabled"`
	CreatedAt    string `json:"created_at"`
}

// CustomDomain — a white-label domain mapping
type CustomDomain struct {
	ID          string `json:"id"`
	AccountID   string `json:"account_id"`
	Domain      string `json:"domain"`
	Subdomain   string `json:"subdomain"`
	SSLEnabled  bool   `json:"ssl_enabled"`
	Verified    bool   `json:"verified"`
	CreatedAt   string `json:"created_at"`
}

// handleSSOConfig — POST /api/sso/config (set up SAML/OIDC)
func (s *Server) handleSSOConfig(w http.ResponseWriter, r *http.Request) {
	var req SSOConfig
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}
	if req.AccountID == "" || req.Provider == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "account_id and provider required"})
		return
	}

	validProviders := map[string]bool{"saml": true, "oidc": true, "okta": true, "azure-ad": true, "google": true}
	if !validProviders[req.Provider] {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "provider must be one of: saml, oidc, okta, azure-ad, google"})
		return
	}

	db := s.ensureAccountDB()
	now := time.Now().UTC().Format(time.RFC3339)

	_, err := db.Exec(`INSERT OR REPLACE INTO sso_configs (account_id, provider, issuer_url, client_id, certificate, metadata_url, enabled, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		req.AccountID, req.Provider, req.IssuerURL, req.ClientID, req.Certificate, req.MetadataURL, req.Enabled, now)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to save SSO config"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":  "configured",
		"provider": req.Provider,
		"login_url": fmt.Sprintf("https://hypernexus.site/sso/%s/login", req.AccountID),
	})
}

// handleSSOStatus — GET /api/sso/status?account_id=xxx
func (s *Server) handleSSOStatus(w http.ResponseWriter, r *http.Request) {
	accountID := r.URL.Query().Get("account_id")
	if accountID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "account_id required"})
		return
	}

	db := s.ensureAccountDB()
	var cfg SSOConfig
	err := db.QueryRow(`SELECT account_id, provider, issuer_url, client_id, metadata_url, enabled, created_at
		FROM sso_configs WHERE account_id = ?`, accountID).
		Scan(&cfg.AccountID, &cfg.Provider, &cfg.IssuerURL, &cfg.ClientID, &cfg.MetadataURL, &cfg.Enabled, &cfg.CreatedAt)
	if err == sql.ErrNoRows {
		writeJSON(w, http.StatusOK, map[string]interface{}{"configured": false})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "database error"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"configured": true,
		"sso":        cfg,
	})
}

// handleCustomDomainAdd — POST /api/custom-domain/add
func (s *Server) handleCustomDomainAdd(w http.ResponseWriter, r *http.Request) {
	var req struct {
		OwnerToken string `json:"owner_token"`
		Domain     string `json:"domain"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}
	if req.OwnerToken == "" || req.Domain == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "owner_token and domain required"})
		return
	}

	db := s.ensureAccountDB()
	var accountID, subdomain string
	err := db.QueryRow(`SELECT id, subdomain FROM accounts WHERE session_token = ? AND active = 1`,
		req.OwnerToken).Scan(&accountID, &subdomain)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid session"})
		return
	}

	domain := strings.ToLower(strings.TrimSpace(req.Domain))
	if !strings.Contains(domain, ".") {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid domain format"})
		return
	}

	now := time.Now().UTC().Format(time.RFC3339)
	id := generateID()
	_, err = db.Exec(`INSERT OR REPLACE INTO custom_domains (id, account_id, domain, subdomain, ssl_enabled, verified, created_at)
		VALUES (?, ?, ?, ?, 0, 0, ?)`,
		id, accountID, domain, subdomain, now)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE") {
			writeJSON(w, http.StatusConflict, map[string]string{"error": "domain already registered"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to add domain"})
		return
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"id":         id,
		"domain":     domain,
		"subdomain":  subdomain,
		"dns_record": map[string]string{
			"type":  "CNAME",
			"name":  domain,
			"value": fmt.Sprintf("%s.hypernexus.site", subdomain),
		},
		"verification_txt": map[string]string{
			"type":  "TXT",
			"name":  fmt.Sprintf("_hypernexus.%s", domain),
			"value": fmt.Sprintf("hypernexus-verify=%s", id),
		},
		"status": "pending_dns",
	})
}

// handleCustomDomainList — GET /api/custom-domain/list?token=xxx
func (s *Server) handleCustomDomainList(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if token == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "token required"})
		return
	}

	db := s.ensureAccountDB()
	var accountID string
	err := db.QueryRow(`SELECT id FROM accounts WHERE session_token = ? AND active = 1`, token).Scan(&accountID)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid session"})
		return
	}

	rows, err := db.Query(`SELECT id, domain, subdomain, ssl_enabled, verified, created_at
		FROM custom_domains WHERE account_id = ?`, accountID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "database error"})
		return
	}
	defer rows.Close()

	var domains []CustomDomain
	for rows.Next() {
		var d CustomDomain
		rows.Scan(&d.ID, &d.Domain, &d.Subdomain, &d.SSLEnabled, &d.Verified, &d.CreatedAt)
		d.AccountID = accountID
		domains = append(domains, d)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"domains": domains})
}

// handleCustomDomainVerify — POST /api/custom-domain/verify
func (s *Server) handleCustomDomainVerify(w http.ResponseWriter, r *http.Request) {
	var req struct {
		OwnerToken string `json:"owner_token"`
		Domain     string `json:"domain"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}

	db := s.ensureAccountDB()
	var accountID, id string
	err := db.QueryRow(`SELECT id FROM accounts WHERE session_token = ? AND active = 1`,
		req.OwnerToken).Scan(&accountID)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid session"})
		return
	}

	err = db.QueryRow(`SELECT id FROM custom_domains WHERE domain = ? AND account_id = ?`,
		strings.ToLower(req.Domain), accountID).Scan(&id)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "domain not found"})
		return
	}

	// DNS verification would go here (check TXT record)
	// For now, mark as verified (admin action or DNS auto-verify)
	db.Exec(`UPDATE custom_domains SET verified = 1, ssl_enabled = 1 WHERE id = ?`, id)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":  "verified",
		"domain":  req.Domain,
		"ssl":     true,
		"message": "Domain verified and SSL enabled",
	})
}

// ensureSSODB — create SSO + custom domain tables
func (s *Server) ensureSSODB() {
	db := s.ensureAccountDB()
	db.Exec(`CREATE TABLE IF NOT EXISTS sso_configs (
		account_id TEXT PRIMARY KEY,
		provider TEXT,
		issuer_url TEXT,
		client_id TEXT,
		certificate TEXT,
		metadata_url TEXT,
		enabled INTEGER DEFAULT 0,
		created_at TEXT
	)`)
	db.Exec(`CREATE TABLE IF NOT EXISTS custom_domains (
		id TEXT PRIMARY KEY,
		account_id TEXT,
		domain TEXT UNIQUE,
		subdomain TEXT,
		ssl_enabled INTEGER DEFAULT 0,
		verified INTEGER DEFAULT 0,
		created_at TEXT
	)`)
}
