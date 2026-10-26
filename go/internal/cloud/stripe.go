package cloud

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
)

// StripeConfig holds Stripe configuration
type StripeConfig struct {
	SecretKey      string
	PublishableKey string
	PriceID        string
	SuccessURL     string
	CancelURL      string
}

// StripeCheckoutSession represents a Stripe checkout session request
type StripeCheckoutSession struct {
	Plan     string `json:"plan"`     // "trial" ($1.99), "subscription" ($5/mo), "founding" ($200)
	Email    string `json:"email"`
	Quantity int    `json:"quantity"` // seats (subscription) or teams (founding)
}

// StripeCheckoutResponse represents the response from creating a checkout session
type StripeCheckoutResponse struct {
	SessionID string `json:"session_id"`
	URL       string `json:"url"`
}

// handleStripeCheckout creates a Stripe checkout session
func (s *CloudServer) handleStripeCheckout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error": "method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	var req StripeCheckoutSession
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "invalid request"}`, http.StatusBadRequest)
		return
	}

	if req.Quantity < 1 {
		req.Quantity = 1
	}

	// Get Stripe config from environment
	stripeKey := os.Getenv("STRIPE_SECRET_KEY")
	priceID := resolvePriceID(req.Plan, req.Quantity)

	if stripeKey == "" || priceID == "" {
		// No Stripe key or price configured -> return a demo session (cannot charge).
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(StripeCheckoutResponse{
			SessionID: "demo_session",
			URL:       "https://buy.stripe.com/demo",
		})
		return
	}

	// Real Stripe Checkout session creation.
	session, err := createStripeCheckoutSession(stripeKey, priceID, req)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": %q}`, err.Error()), http.StatusBadGateway)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(session)
}

// resolvePriceID maps a pricing plan to its Stripe Price ID via env vars.
// Confirmed pricing: trial $1.99 (14-day), subscription $5/seat/mo, founding $200/team.
func resolvePriceID(plan string, qty int) string {
	switch strings.ToLower(plan) {
	case "trial", "":
		return os.Getenv("STRIPE_PRICE_ID_TRIAL") // $1.99 one-time, 14-day trial
	case "founding", "founder", "founders":
		return os.Getenv("STRIPE_PRICE_ID_FOUNDING") // $200 one-time, per team
	case "subscription", "sub", "monthly":
		return os.Getenv("STRIPE_PRICE_ID_SUB") // $5/seat/month
	default:
		return os.Getenv("STRIPE_PRICE_ID")
	}
}

// createStripeCheckoutSession calls the Stripe API to create a real Checkout session.
// Docs: https://stripe.com/docs/api/checkout/sessions/create
func createStripeCheckoutSession(key, priceID string, req StripeCheckoutSession) (*StripeCheckoutResponse, error) {
	form := url.Values{}
	mode := "subscription"
	if strings.EqualFold(req.Plan, "trial") || strings.EqualFold(req.Plan, "founding") ||
		strings.EqualFold(req.Plan, "founder") || strings.EqualFold(req.Plan, "founders") || req.Plan == "" {
		mode = "payment" // $1.99 trial and $200 founding are one-time payments
	}
	form.Set("mode", mode)
	form.Set("line_items[0][price]", priceID)
	form.Set("line_items[0][quantity]", fmt.Sprintf("%d", req.Quantity))
	form.Set("success_url", "https://hypernexus.site/dashboard?checkout=success")
	form.Set("cancel_url", "https://hypernexus.site/pricing?checkout=cancelled")
	if mode == "subscription" {
		form.Set("subscription_data[trial_period_days]", "0")
	}

	httpReq, err := http.NewRequest("POST", "https://api.stripe.com/v1/checkout/sessions", strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Authorization", "Bearer "+key)
	httpReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := (&http.Client{}).Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	var out struct {
		ID  string `json:"id"`
		URL string `json:"url"`
		Error struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(body, &out); err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("stripe error (key may be expired/invalid): %s", out.Error.Message)
	}
	return &StripeCheckoutResponse{SessionID: out.ID, URL: out.URL}, nil
}

// handleStripeWebhook handles Stripe webhook events
func (s *CloudServer) handleStripeWebhook(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error": "method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	// In production, you would verify the webhook signature
	// and handle events like checkout.session.completed

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

// RegisterStripeRoutes registers Stripe-related routes
func (s *CloudServer) RegisterStripeRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/cloud/checkout", s.handleStripeCheckout)
	mux.HandleFunc("/api/cloud/webhook", s.handleStripeWebhook)
}
