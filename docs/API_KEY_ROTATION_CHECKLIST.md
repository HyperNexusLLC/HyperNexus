# API Key Rotation Checklist

**Created:** 2026-09-24
**Server:** Hetzner (hypernexus.site) at `/opt/tormentnexus/.env`
**Priority:** Rotate weak/exposed credentials first

---

## Priority 1 — CRITICAL (Weak or Exposed)

| # | Service | Env Var(s) | Risk | Action |
|---|---------|-----------|------|--------|
| 1 | **Reddit (personal)** | `REDDIT_PASSWORD` | Weak password `Temppass0!` | Change password at reddit.com → update `.env` |
| 2 | **Reddit (HyperNexus bot)** | `REDDIT_HYPERNEXUS_PASSWORD` | Likely same weak pattern | Change at reddit.com → update `.env` |
| 3 | **Reddit OAuth** | `REDDIT_CLIENT_SECRET` | Rotate if password changed | Regenerate at reddit.com/prefs/apps |
| 4 | **NPM** | `NPM_ACCESS_TOKEN` | Long-lived token | Regenerate at npmjs.com → Access Tokens → `npm token create` |

## Priority 2 — HIGH (Financial / Auth)

| # | Service | Env Var(s) | Action |
|---|---------|-----------|--------|
| 5 | **Stripe** | `STRIPE_SECRET_KEY`, `STRIPE_RESTRICTED_KEY`, `STRIPE_API_KEY` | Rotate in Stripe Dashboard → Developers → API Keys |
| 6 | **Stripe Webhook** | `STRIPE_WEBHOOK_SECRET` | Regenerate webhook endpoint secret |
| 7 | **GitHub** | `GITHUB_TOKEN`, `GITHUB_CLIENT_SECRET` | Regenerate PAT at github.com/settings/tokens; OAuth secret at Settings → Developer Settings |
| 8 | **Google OAuth** | `GOOGLE_CLIENT_SECRET` | Rotate in Google Cloud Console → Credentials |

## Priority 3 — MEDIUM (Social / Marketing)

| # | Service | Env Var(s) | Action |
|---|---------|-----------|--------|
| 9 | **Twitter/X (HyperNexus)** | `TWITTER_HYPERNEXUS_API_KEY`, `TWITTER_HYPERNEXUS_API_SECRET`, `TWITTER_HYPERNEXUS_ACCESS_TOKEN`, `TWITTER_HYPERNEXUS_ACCESS_SECRET`, `TWITTER_HYPERNEXUS_BEARER_TOKEN`, `TWITTER_HYPERNEXUS_CLIENT_ID`, `TWITTER_HYPERNEXUS_CLIENT_SECRET`, `TWITTER_HYPERNEXUS_REFRESH_TOKEN` | Regenerate all in developer.twitter.com → Apps → Keys & Tokens |
| 10 | **Bluesky** | `BLUESKY_HYPERNEXUS_APP_PASSWORD` | Reset app password at bsky.app → Settings → App Passwords |
| 11 | **LinkedIn** | `LINKEDIN_CLIENT_SECRET` | Rotate in LinkedIn Developer Portal → App → Auth |
| 12 | **ConvertKit** | `CONVERTKIT_API_KEY` | Regenerate in ConvertKit → Settings → Advanced → API Keys |
| 13 | **BFL (Black Forest Labs)** | `BFL_API_KEY` | Regenerate in BFL dashboard |

## Priority 4 — LOW (Internal / Config)

| # | Service | Env Var(s) | Action |
|---|---------|-----------|--------|
| 14 | **HyperNexus API** | `HYPERNEXUS_API_KEY` | Regenerate internally if exposed |
| 15 | **Stripe Prices** | `STRIPE_PRICE_ID_*` | Verify prices still active (no rotation needed) |

---

## Rotation Procedure

For each key:

1. **Log into the service** and generate a new credential
2. **Update on server:**
   ```bash
   ssh hetzner
   nano /opt/tormentnexus/.env   # update the value
   systemctl restart hypernexus-kernel hypernexus-dashboard
   ```
3. **Verify:** Check service health after restart
4. **Revoke old key** on the service side (don't just generate new)

## Post-Rotation Verification

```bash
# After all rotations:
curl -s https://hypernexus.site/api/go/health
curl -s https://hypernexus.site/api/billing/stripe/checkout  # test Stripe
```

## Security Notes

- `.env` is now `chmod 600` (owner-only) — was `644` (world-readable)
- Consider using a secrets manager (HashiCorp Vault, SOPS) for production
- Rotate Reddit passwords IMMEDIATELY — `Temppass0!` is dictionary-crackable
- All Twitter keys should be rotated together (they're linked to one app)

---

*Total: 20+ credentials to rotate across 12 services*
