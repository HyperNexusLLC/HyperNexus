#!/bin/bash
# Securely update Stripe API key on the server
# Reads key from stdin, writes to .env without logging it

ENV_FILE="/opt/tormentnexus/.env"

read -r NEW_KEY

# Validate key format
if [[ ! "$NEW_KEY" =~ ^sk_live_[A-Za-z0-9]+$ ]]; then
  echo "ERROR: Invalid Stripe key format (must start with sk_live_)"
  exit 1
fi

# Remove old Stripe key and add new one
if grep -q "^STRIPE_API_KEY=" "$ENV_FILE" 2>/dev/null; then
  sed -i '/^STRIPE_API_KEY=/d' "$ENV_FILE"
fi
echo "STRIPE_API_KEY=$NEW_KEY" >> "$ENV_FILE"

echo "Stripe API key updated successfully"
echo "Key fingerprint: ${NEW_KEY:0:12}...${NEW_KEY: -4}"
echo "Full key stored in $ENV_FILE (gitignored)"
