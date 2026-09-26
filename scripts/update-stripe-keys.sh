#!/bin/bash
# Securely update Stripe API keys on the server
# Reads keys from environment variables set by the caller

ENV_FILE="/opt/tormentnexus/.env"

# Validate key formats
if [[ ! "$STRIPE_SECRET_KEY" =~ ^sk_live_[A-Za-z0-9]+$ ]]; then
  echo "ERROR: Invalid secret key format"
  exit 1
fi
if [[ ! "$STRIPE_RESTRICTED_KEY" =~ ^rk_live_[A-Za-z0-9]+$ ]]; then
  echo "ERROR: Invalid restricted key format"
  exit 1
fi
if [[ ! "$STRIPE_PUBLISHABLE_KEY" =~ ^pk_live_[A-Za-z0-9]+$ ]]; then
  echo "ERROR: Invalid publishable key format"
  exit 1
fi

# Remove old Stripe keys
sed -i '/^STRIPE_API_KEY=/d' "$ENV_FILE" 2>/dev/null
sed -i '/^STRIPE_SECRET_KEY=/d' "$ENV_FILE" 2>/dev/null
sed -i '/^STRIPE_RESTRICTED_KEY=/d' "$ENV_FILE" 2>/dev/null
sed -i '/^STRIPE_PUBLISHABLE_KEY=/d' "$ENV_FILE" 2>/dev/null

# Add new keys
echo "STRIPE_API_KEY=$STRIPE_SECRET_KEY" >> "$ENV_FILE"
echo "STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY" >> "$ENV_FILE"
echo "STRIPE_RESTRICTED_KEY=$STRIPE_RESTRICTED_KEY" >> "$ENV_FILE"
echo "STRIPE_PUBLISHABLE_KEY=$STRIPE_PUBLISHABLE_KEY" >> "$ENV_FILE"

echo "Stripe keys updated successfully"
echo "Secret key: ${STRIPE_SECRET_KEY:0:12}...${STRIPE_SECRET_KEY: -4}"
echo "Restricted key: ${STRIPE_RESTRICTED_KEY:0:12}...${STRIPE_RESTRICTED_KEY: -4}"
echo "Publishable key: ${STRIPE_PUBLISHABLE_KEY:0:12}...${STRIPE_PUBLISHABLE_KEY: -4}"
echo "All keys stored in $ENV_FILE (gitignored)"
