package commercial

import (
	"context"
	"fmt"
	"strings"
)

// SimpleRBACProvider implements a basic role-based access control check.
type SimpleRBACProvider struct {
	UserRoles map[string]string // userID -> role
}

func (p *SimpleRBACProvider) ValidateSSO(ctx context.Context, token string) (bool, error) {
	// Simple validation: tokens starting with "tok-sso-" are valid
	if strings.HasPrefix(token, "tok-sso-") {
		return true, nil
	}
	return false, fmt.Errorf("invalid sso token prefix")
}

func (p *SimpleRBACProvider) Authorize(ctx context.Context, userID string, resource string, action string) (bool, error) {
	role, ok := p.UserRoles[userID]
	if !ok {
		role = "guest"
	}

	// Admin role has full access
	if role == "admin" {
		return true, nil
	}

	// guest has read-only access to specific resources
	if role == "guest" && action == "read" {
		return true, nil
	}

	return false, fmt.Errorf("user %s is not authorized to %s resource %s", userID, action, resource)
}

// MemoryAccessControl checks whether a role can read/write memory.
// Roles: admin (full), writer (read+write), reader (read-only), guest (no memory access).
func MemoryAccessControl(role, action string) bool {
	switch role {
	case "admin":
		return true
	case "writer":
		return action == "read" || action == "write"
	case "reader":
		return action == "read"
	default: // guest
		return false
	}
}

// RoleForResource returns the effective role for a user on a resource category.
func (p *SimpleRBACProvider) RoleForResource(userID, category string) string {
	role, ok := p.UserRoles[userID]
	if !ok {
		role = "guest"
	}
	// Per-category overrides can be added here (e.g. "memory-reader" for specific users)
	return role
}

// SetUserRole assigns a role to a user.
func (p *SimpleRBACProvider) SetUserRole(userID, role string) {
	if p.UserRoles == nil {
		p.UserRoles = map[string]string{}
	}
	p.UserRoles[userID] = role
}

// ListRoles returns the current user→role mapping.
func (p *SimpleRBACProvider) ListRoles() map[string]string {
	out := make(map[string]string, len(p.UserRoles))
	for k, v := range p.UserRoles {
		out[k] = v
	}
	return out
}

func NewSimpleRBACProvider() *SimpleRBACProvider {
	return &SimpleRBACProvider{
		UserRoles: map[string]string{
			"admin": "admin",
			"guest": "guest",
		},
	}
}
