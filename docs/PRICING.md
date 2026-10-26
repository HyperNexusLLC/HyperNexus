# HyperNexus Pricing & Founding Terms

> **Status: FINALIZED** — confirmed by Robert (principal) after agent-side review by the
> HyperNexus pi session (MiMo 2.6 Pro) and Muse (Bobbi). Supersedes the retired **$750
> founding pilot** (which was full list price in a "founding" label and was dropped).

## The funnel

```
  $1.99 trial  →  $5/mo subscription  →  $200 founding upsell
  (14 days)        (per seat)             (per team, founding window)
```

Trial first, then subscription, with founding offered as an **upsell during the founding
window**. (Not founding-first — once a team has paid $200, a trial makes no sense.)

---

## 1. Trial — $1.99

- **$1.99 for a 14-day, full-product trial.**
- **Card required.** Auto-converts to **$5/month** unless cancelled.
- **Clear cancel path** (self-serve, no email required).
- **No money-back gimmick** — the Stripe fee is lost on refunds, so don't market it as
  "risk-free." It's a paid trial, positioned honestly.

Why $1.99 and not free: free maximizes signups but produces ghosts (no card, no filter,
support load from people who never intended to pay). $1.99 is low friction yet a real
commitment, and it verifies the card. Net ≈ **$1.63** after Stripe (~$0.30 + 2.9%).

## 2. Subscription — $5 / seat / month

- **$5 per seat per month**, billed monthly.
- Team economics: a 25-seat team = **$125/month = $1,500/year**.

Cost coverage note (internal): $5/seat must cover Hetzner hosting, L2 vector-memory disk
growth, backups, bandwidth, Stripe fees (~$0.45 per $5), support time (the dominant cost
for a single maintainer), and churn. LLM inference is **~$0** because the kernel routes
exclusively to local **gemma-4-e4b** (LM Studio) with **no external API failover**.

## 3. Founding membership — $200

- **$200 one-time founding fee, per team (not per seat)** — **in addition to** the
  subscription, not instead of it.
- **Locks the $5/seat rate** for **12 months** (or while continuously subscribed; a lapse
  loses the lock). Bounded — a lifetime price lock is a slow margin killer.
- **Founding perks (bounded):**
  - **Direct input** = feedback sessions + feature voting. **Not** roadmap veto.
  - **Case-study credit** = permission to publish a named case study (with before/after
    numbers) **after proof exists.** Not a guaranteed endorsement upfront — if proof
    fails, a founder won't want their name on it.

Why $200 is a fee on top of the subscription (not a lifetime buy): lifetime access for a
flat $200 creates unbounded support + hosting liability and undercuts all future revenue
if the product works. And "$200 for year one" alone would be *more* than $5×12=$60 — early
adopters paying more than later customers is backwards unless the $200 buys real setup and
onboarding.

---

## Funnel math (illustrative)

| Stage | Price | Notes |
|---|---|---|
| Trial | $1.99 / 14 days | Card on file; auto-converts to $5/mo |
| Subscription | $5 / seat / month | 25 seats = $125/mo = $1,500/yr |
| Founding (upsell) | $200 / team, one-time | Locks $5/seat for 12 months + perks |

## Guardrails

1. **Don't publish or quote final pricing to a prospect until the principal (Robert)
   confirms the units in his own voice** to the buyer — the terms above are the internal
   source of truth, but customer-facing quotes get Robert's sign-off.
2. **Remaining outreach uses these terms, NOT the retired $750 pilot.** Factory and Cline
   were contacted on the old framing — don't re-message unsolicited; if either asks about
   pilot terms, offer this (trial → subscription → founding), not a defense of $750.
3. **Proof before scale.** The plugin has **0 live installs**. Free/low-cost design
   partners and the $1.99 trial exist to produce the **before/after proof** and rollback
   data that make the founding claim credible.

## Open items to make this chargeable

- [ ] **Fix the Stripe checkout** — the last billing check (Oct 9) found Stripe returning
      an **expired key** and buyers getting a checkout error; nobody could pay. Until a
      valid key is configured, the $1.99 trial and $200 founding fee can't be collected.
- [ ] Wire the trial → subscription → founding flow to the checkout endpoints
      (`POST /api/billing/stripe/checkout`, `POST /api/billing/stripe/webhook`).
- [ ] Confirm the 14-day conversion + cancellation path in the billing service.
