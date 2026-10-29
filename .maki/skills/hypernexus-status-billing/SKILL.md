---
name: hypernexus-status-billing
description: Kernel health, system overview, billing quotas, audit trail.
---

# HyperNexus Status & Billing

Tools: `hypernexus_system_status`, `hypernexus_system_overview`,
`hypernexus_billing_status`, `hypernexus_workflow`,
`hypernexus_audit_log`, `hypernexus_kernel_routes`.

## Rules

- VERIFY before and after production changes: `hypernexus_system_overview`.
- Billing depleted → check fallback chain, switch provider.
- Audited actions → `hypernexus_audit_log`.
