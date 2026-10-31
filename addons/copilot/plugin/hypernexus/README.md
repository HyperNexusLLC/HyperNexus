# HyperNexus for GitHub Copilot CLI

This Agent Plugins v1.0 package supplies three HyperNexus skills, eleven `/hn-*`
commands, two custom agents, and the `hypernexus` stdio MCP server. The MCP
server exposes the kernel's complete tool inventory; the project-level Copilot
hooks in `.github/hooks/hypernexus.json` add kernel health context, explicit
`@memory:` recall, destructive-command RBAC, and subagent guidance.

Install from the repository root:

```powershell
node addons/copilot/install.mjs
```

Use the Meta subscription model without writing credentials to configuration:

```powershell
.\addons\copilot\use-meta-model.ps1
.\addons\copilot\use-meta-model.ps1 -p "Reply exactly META-COPILOT-OK"
```

The launcher sets Copilot CLI's documented BYOK Responses API variables for the
Copilot process only (`COPILOT_PROVIDER_TYPE=openai`,
`COPILOT_PROVIDER_BASE_URL=<kernel>/v1`,
`COPILOT_PROVIDER_WIRE_API=responses`,
`COPILOT_PROVIDER_API_KEY=hypernexus-local`,
`COPILOT_PROVIDER_MODEL_ID=meta/muse-spark-1.3-contributor`) and restores the
previous environment afterwards. Requests go to the HyperNexus kernel proxy at
`http://127.0.0.1:7778/v1`; the kernel reads the current Meta credential from
Pi's `auth.json` per request, so the real OAuth-derived credential is never
copied into Copilot configuration. The placeholder API key is local to the
Copilot process and is not sent upstream as the Meta credential. The kernel
proxy currently identifies its upstream client as `pi/1.4.0`; its normal
API error is returned to Copilot if the kernel is unavailable.

Copilot CLI does not expose a Pi-style in-process `ExtensionAPI`; its native
extension surface is plugins plus MCP, skills, commands, agents, rules, hooks,
and optional LSP servers. This integration uses the applicable surfaces rather
than claiming unsupported runtime callbacks.

Validate the package and live kernel:

```powershell
node addons/copilot/install.mjs --check
node addons/copilot/bin/test-copilot-ext.mjs
copilot plugin list
copilot mcp list
copilot skill list
```

`HYPERNEXUS_RBAC` supports `audit` (default), `ask`, and `deny` for destructive
shell-command patterns. Hook kernel calls have short deadlines and fail open
except for an explicit RBAC deny.
