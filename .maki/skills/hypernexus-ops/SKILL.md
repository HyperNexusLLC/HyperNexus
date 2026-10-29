---
name: hypernexus-ops
description: Operate and verify the HyperNexus kernel from maki.
---

# HyperNexus Ops

## Verify loop (OPS workflow)

1. VERIFY before change: `hypernexus_system_overview`
2. Act (normal tools)
3. VERIFY after change: `hypernexus_system_overview`
4. PERSIST: `hypernexus_memory_store` with tags `["ops", "deploy"]`

## Health endpoints (via tools, or curl)

- `hypernexus_system_status` — health + memory + mesh
- `hypernexus_billing_status` — quotas
- `hypernexus_workflow` — jobs

## RBAC

The plugin's bash guard blocks destructive patterns
(`rm -rf`, `mkfs`, `DROP TABLE`, fork bombs). Deny rules in
permissions.toml always win.
