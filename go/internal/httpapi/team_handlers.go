package httpapi

import (
	"crypto/rand"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// Team — a shared workspace with its own memory pool
type Team struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	OwnerID   string `json:"owner_id"`
	Plan      string `json:"plan"`
	Seats     int    `json:"seats"`
	MemberCnt int    `json:"member_count"`
	CreatedAt string `json:"created_at"`
}

// TeamMember — a member of a team
type TeamMember struct {
	ID       string `json:"id"`
	TeamID   string `json:"team_id"`
	AccountID string `json:"account_id"`
	Email    string `json:"email"`
	Role     string `json:"role"` // admin, writer, reader
	JoinedAt string `json:"joined_at"`
}

// handleTeamCreate — POST /api/team/create
func (s *Server) handleTeamCreate(w http.ResponseWriter, r *http.Request) {
	var req struct {
		OwnerToken string `json:"owner_token"`
		Name       string `json:"name"`
		Plan       string `json:"plan"`
		Seats      int    `json:"seats"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}
	if req.OwnerToken == "" || req.Name == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "owner_token and name required"})
		return
	}

	db := s.ensureAccountDB()

	// Verify owner
	var ownerID string
	err := db.QueryRow(`SELECT id FROM accounts WHERE session_token = ? AND active = 1`,
		req.OwnerToken).Scan(&ownerID)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid session"})
		return
	}

	if req.Plan == "" {
		req.Plan = "basic"
	}
	if req.Seats == 0 {
		req.Seats = 5
	}

	teamID := generateID()
	now := time.Now().UTC().Format(time.RFC3339)

	_, err = db.Exec(`INSERT INTO teams (id, name, owner_id, plan, seats, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
		teamID, req.Name, ownerID, req.Plan, req.Seats, now)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to create team"})
		return
	}

	// Add owner as admin
	db.Exec(`INSERT INTO team_members (id, team_id, account_id, role, joined_at) VALUES (?, ?, ?, 'admin', ?)`,
		generateID(), teamID, ownerID, now)

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"team": Team{ID: teamID, Name: req.Name, OwnerID: ownerID, Plan: req.Plan, Seats: req.Seats, MemberCnt: 1, CreatedAt: now},
	})
}

// handleTeamInvite — POST /api/team/invite
func (s *Server) handleTeamInvite(w http.ResponseWriter, r *http.Request) {
	var req struct {
		OwnerToken string `json:"owner_token"`
		TeamID     string `json:"team_id"`
		Email      string `json:"email"`
		Role       string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}

	db := s.ensureAccountDB()

	// Verify owner is admin of team
	var ownerID string
	err := db.QueryRow(`SELECT id FROM accounts WHERE session_token = ? AND active = 1`,
		req.OwnerToken).Scan(&ownerID)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid session"})
		return
	}

	var role string
	err = db.QueryRow(`SELECT role FROM team_members WHERE team_id = ? AND account_id = ?`,
		req.TeamID, ownerID).Scan(&role)
	if err != nil || role != "admin" {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "only team admins can invite"})
		return
	}

	// Check seat limit
	var seats, memberCnt int
	db.QueryRow(`SELECT seats FROM teams WHERE id = ?`, req.TeamID).Scan(&seats)
	db.QueryRow(`SELECT COUNT(*) FROM team_members WHERE team_id = ?`, req.TeamID).Scan(&memberCnt)
	if memberCnt >= seats {
		writeJSON(w, http.StatusConflict, map[string]string{"error": "team seat limit reached"})
		return
	}

	// Find target account
	var targetID string
	err = db.QueryRow(`SELECT id FROM accounts WHERE email = ? AND active = 1`, req.Email).Scan(&targetID)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "account not found — user must register first"})
		return
	}

	if req.Role == "" {
		req.Role = "writer"
	}

	now := time.Now().UTC().Format(time.RFC3339)
	memberID := generateID()
	_, err = db.Exec(`INSERT INTO team_members (id, team_id, account_id, role, joined_at) VALUES (?, ?, ?, ?, ?)`,
		memberID, req.TeamID, targetID, req.Role, now)
	if err != nil {
		writeJSON(w, http.StatusConflict, map[string]string{"error": "already a member"})
		return
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"member": TeamMember{ID: memberID, TeamID: req.TeamID, AccountID: targetID, Email: req.Email, Role: req.Role, JoinedAt: now},
	})
}

// handleTeamList — GET /api/team/list?token=xxx
func (s *Server) handleTeamList(w http.ResponseWriter, r *http.Request) {
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

	rows, err := db.Query(`SELECT t.id, t.name, t.owner_id, t.plan, t.seats, t.created_at,
		(SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) as member_count
		FROM teams t
		JOIN team_members tm ON tm.team_id = t.id
		WHERE tm.account_id = ?`, accountID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "database error"})
		return
	}
	defer rows.Close()

	var teams []Team
	for rows.Next() {
		var t Team
		rows.Scan(&t.ID, &t.Name, &t.OwnerID, &t.Plan, &t.Seats, &t.CreatedAt, &t.MemberCnt)
		teams = append(teams, t)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"teams": teams})
}

// handleTeamMembers — GET /api/team/members?team_id=xxx&token=xxx
func (s *Server) handleTeamMembers(w http.ResponseWriter, r *http.Request) {
	teamID := r.URL.Query().Get("team_id")
	token := r.URL.Query().Get("token")
	if teamID == "" || token == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "team_id and token required"})
		return
	}

	db := s.ensureAccountDB()
	var accountID string
	err := db.QueryRow(`SELECT id FROM accounts WHERE session_token = ? AND active = 1`, token).Scan(&accountID)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid session"})
		return
	}

	// Must be a member
	var role string
	err = db.QueryRow(`SELECT role FROM team_members WHERE team_id = ? AND account_id = ?`,
		teamID, accountID).Scan(&role)
	if err != nil {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "not a team member"})
		return
	}

	rows, err := db.Query(`SELECT tm.id, tm.team_id, tm.account_id, a.email, tm.role, tm.joined_at
		FROM team_members tm
		JOIN accounts a ON a.id = tm.account_id
		WHERE tm.team_id = ?`, teamID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "database error"})
		return
	}
	defer rows.Close()

	var members []TeamMember
	for rows.Next() {
		var m TeamMember
		rows.Scan(&m.ID, &m.TeamID, &m.AccountID, &m.Email, &m.Role, &m.JoinedAt)
		members = append(members, m)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"members": members, "your_role": role})
}

// handleTeamMemoryShare — POST /api/team/memory/share
// Shares a memory from one account's pool into the team pool
func (s *Server) handleTeamMemoryShare(w http.ResponseWriter, r *http.Request) {
	var req struct {
		OwnerToken string `json:"owner_token"`
		TeamID     string `json:"team_id"`
		MemoryID   string `json:"memory_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}

	db := s.ensureAccountDB()
	var accountID string
	err := db.QueryRow(`SELECT id FROM accounts WHERE session_token = ? AND active = 1`,
		req.OwnerToken).Scan(&accountID)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid session"})
		return
	}

	var role string
	err = db.QueryRow(`SELECT role FROM team_members WHERE team_id = ? AND account_id = ?`,
		req.TeamID, accountID).Scan(&role)
	if err != nil || (role != "admin" && role != "writer") {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "writer or admin role required"})
		return
	}

	// Copy the memory into team pool via cross-agent memory
	now := time.Now().UTC().Format(time.RFC3339)
	_, err = db.Exec(`INSERT OR IGNORE INTO team_memories (id, team_id, memory_id, shared_by, shared_at) VALUES (?, ?, ?, ?, ?)`,
		generateID(), req.TeamID, req.MemoryID, accountID, now)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to share memory"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":     "shared",
		"memory_id":  req.MemoryID,
		"team_id":    req.TeamID,
		"shared_by":  accountID,
		"shared_at":  now,
	})
}

// handleTeamMemoryList — GET /api/team/memory/list?team_id=xxx&token=xxx
func (s *Server) handleTeamMemoryList(w http.ResponseWriter, r *http.Request) {
	teamID := r.URL.Query().Get("team_id")
	token := r.URL.Query().Get("token")
	if teamID == "" || token == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "team_id and token required"})
		return
	}

	db := s.ensureAccountDB()
	var accountID string
	err := db.QueryRow(`SELECT id FROM accounts WHERE session_token = ? AND active = 1`, token).Scan(&accountID)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid session"})
		return
	}

	var role string
	err = db.QueryRow(`SELECT role FROM team_members WHERE team_id = ? AND account_id = ?`,
		teamID, accountID).Scan(&role)
	if err != nil {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "not a team member"})
		return
	}

	rows, err := db.Query(`SELECT id, memory_id, shared_by, shared_at FROM team_memories WHERE team_id = ? ORDER BY shared_at DESC`,
		teamID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "database error"})
		return
	}
	defer rows.Close()

	var memories []map[string]interface{}
	for rows.Next() {
		var id, memoryID, sharedBy, sharedAt string
		rows.Scan(&id, &memoryID, &sharedBy, &sharedAt)
		memories = append(memories, map[string]interface{}{
			"id":        id,
			"memory_id": memoryID,
			"shared_by": sharedBy,
			"shared_at": sharedAt,
		})
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"memories": memories, "count": len(memories)})
}

// Referral — a referral code and its tracking
type Referral struct {
	Code      string `json:"code"`
	AccountID string `json:"account_id"`
	Uses      int    `json:"uses"`
	Credits   int    `json:"credits"`
	CreatedAt string `json:"created_at"`
}

// handleReferralGenerate — POST /api/referral/generate
func (s *Server) handleReferralGenerate(w http.ResponseWriter, r *http.Request) {
	var req struct {
		OwnerToken string `json:"owner_token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}

	db := s.ensureAccountDB()
	var accountID string
	err := db.QueryRow(`SELECT id FROM accounts WHERE session_token = ? AND active = 1`,
		req.OwnerToken).Scan(&accountID)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid session"})
		return
	}

	// Check if already has a code
	var existingCode string
	err = db.QueryRow(`SELECT code FROM referrals WHERE account_id = ?`, accountID).Scan(&existingCode)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"code":  existingCode,
			"uses":  getReferralUses(db, existingCode),
			"note":  "existing code returned",
		})
		return
	}

	// Generate short code (8 hex chars)
	b := make([]byte, 4)
	rand.Read(b)
	code := strings.ToUpper(fmt.Sprintf("HN-%x", b))
	now := time.Now().UTC().Format(time.RFC3339)

	_, err = db.Exec(`INSERT INTO referrals (code, account_id, uses, credits, created_at) VALUES (?, ?, 0, 0, ?)`,
		code, accountID, now)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to generate code"})
		return
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"code":  code,
		"uses":  0,
		"credits": 0,
		"link":  fmt.Sprintf("https://hypernexus.site/register?ref=%s", code),
	})
}

// handleReferralApply — POST /api/referral/apply
func (s *Server) handleReferralApply(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Code        string `json:"code"`
		OwnerToken  string `json:"owner_token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}
	if req.Code == "" || req.OwnerToken == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "code and owner_token required"})
		return
	}

	db := s.ensureAccountDB()

	// Find referrer
	var referrerID string
	err := db.QueryRow(`SELECT account_id FROM referrals WHERE code = ?`, req.Code).Scan(&referrerID)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "invalid referral code"})
		return
	}

	// Verify the applying user
	var accountID string
	err = db.QueryRow(`SELECT id FROM accounts WHERE session_token = ? AND active = 1`,
		req.OwnerToken).Scan(&accountID)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid session"})
		return
	}

	// Can't refer yourself
	if accountID == referrerID {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "cannot apply your own referral code"})
		return
	}

	now := time.Now().UTC().Format(time.RFC3339)

	// Award credits: 10 to referrer, 5 to referee
	db.Exec(`UPDATE referrals SET uses = uses + 1, credits = credits + 10 WHERE code = ?`, req.Code)
	db.Exec(`INSERT OR IGNORE INTO referral_credits (account_id, credits, source, created_at) VALUES (?, 5, ?, ?)`,
		accountID, req.Code, now)
	db.Exec(`INSERT OR IGNORE INTO referral_credits (account_id, credits, source, created_at) VALUES (?, 10, ?, ?)`,
		referrerID, req.Code, now)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":     "applied",
		"credit":     5,
		"message":    "5 credits added to your account",
		"referrer_id": referrerID,
	})
}

// handleReferralStatus — GET /api/referral/status?token=xxx
func (s *Server) handleReferralStatus(w http.ResponseWriter, r *http.Request) {
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

	var code string
	var uses, credits int
	err = db.QueryRow(`SELECT code, uses, credits FROM referrals WHERE account_id = ?`, accountID).Scan(&code, &uses, &credits)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"has_code":  false,
			"credits":   getCreditBalance(db, accountID),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"has_code":  true,
		"code":      code,
		"uses":      uses,
		"credits":   credits + getCreditBalance(db, accountID),
		"link":      fmt.Sprintf("https://hypernexus.site/register?ref=%s", code),
	})
}

// ensureTeamDB — create team/referral tables
func (s *Server) ensureTeamDB() {
	db := s.ensureAccountDB()
	db.Exec(`CREATE TABLE IF NOT EXISTS teams (
		id TEXT PRIMARY KEY,
		name TEXT,
		owner_id TEXT,
		plan TEXT DEFAULT 'basic',
		seats INTEGER DEFAULT 5,
		created_at TEXT
	)`)
	db.Exec(`CREATE TABLE IF NOT EXISTS team_members (
		id TEXT PRIMARY KEY,
		team_id TEXT,
		account_id TEXT,
		role TEXT DEFAULT 'writer',
		joined_at TEXT,
		UNIQUE(team_id, account_id)
	)`)
	db.Exec(`CREATE TABLE IF NOT EXISTS team_memories (
		id TEXT PRIMARY KEY,
		team_id TEXT,
		memory_id TEXT,
		shared_by TEXT,
		shared_at TEXT,
		UNIQUE(team_id, memory_id)
	)`)
	db.Exec(`CREATE TABLE IF NOT EXISTS referrals (
		code TEXT PRIMARY KEY,
		account_id TEXT UNIQUE,
		uses INTEGER DEFAULT 0,
		credits INTEGER DEFAULT 0,
		created_at TEXT
	)`)
	db.Exec(`CREATE TABLE IF NOT EXISTS referral_credits (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		account_id TEXT,
		credits INTEGER,
		source TEXT,
		created_at TEXT
	)`)
}

func getReferralUses(db *sql.DB, code string) int {
	var uses int
	db.QueryRow(`SELECT uses FROM referrals WHERE code = ?`, code).Scan(&uses)
	return uses
}

func getCreditBalance(db *sql.DB, accountID string) int {
	var total int
	db.QueryRow(`SELECT COALESCE(SUM(credits), 0) FROM referral_credits WHERE account_id = ?`, accountID).Scan(&total)
	return total
}
