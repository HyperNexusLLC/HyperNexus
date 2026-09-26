#!/usr/bin/env python3
"""Securely update Stripe API keys on the server."""
import re
import sys

ENV_FILE = "/opt/tormentnexus/.env"

# Read keys from stdin as JSON
import json
data = json.loads(sys.stdin.read())

secret_key = data.get("STRIPE_SECRET_KEY", "")
restricted_key = data.get("STRIPE_RESTRICTED_KEY", "")
publishable_key = data.get("STRIPE_PUBLISHABLE_KEY", "")

# Validate formats
if not secret_key.startswith("sk_live_"):
    print("ERROR: Invalid secret key format"); sys.exit(1)
if not restricted_key.startswith("rk_live_"):
    print("ERROR: Invalid restricted key format"); sys.exit(1)
if not publishable_key.startswith("pk_live_"):
    print("ERROR: Invalid publishable key format"); sys.exit(1)

# Read existing .env
with open(ENV_FILE, "r") as f:
    lines = f.readlines()

# Remove old Stripe key lines
new_lines = []
skip_prefixes = ("STRIPE_API_KEY=", "STRIPE_SECRET_KEY=", "STRIPE_RESTRICTED_KEY=", "STRIPE_PUBLISHABLE_KEY=")
for line in lines:
    if any(line.startswith(p) for p in skip_prefixes):
        continue
    new_lines.append(line)

# Add new keys
new_lines.append(f"STRIPE_API_KEY={secret_key}\n")
new_lines.append(f"STRIPE_SECRET_KEY={secret_key}\n")
new_lines.append(f"STRIPE_RESTRICTED_KEY={restricted_key}\n")
new_lines.append(f"STRIPE_PUBLISHABLE_KEY={publishable_key}\n")

# Write back
with open(ENV_FILE, "w") as f:
    f.writelines(new_lines)

print("Stripe keys updated successfully")
print(f"Secret: {secret_key[:12]}...{secret_key[-4:]}")
print(f"Restricted: {restricted_key[:12]}...{restricted_key[-4:]}")
print(f"Publishable: {publishable_key[:12]}...{publishable_key[-4:]}")
