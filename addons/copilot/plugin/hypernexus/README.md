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

Launch Copilot with HyperNexus and the Copilot account/model already configured:

```powershell
.\addons\copilot\use-hypernexus.ps1
```

The launcher loads the HyperNexus plugin and excludes Copilot's native `bash`
and `powershell` tools, leaving the HyperNexus MCP parity tools available.
Starting `copilot` directly leaves its normal tool list unchanged.

The Pi OAuth `use-meta-model.ps1` launcher is disabled. Meta's
[Model API Terms](https://dev.meta.ai/legal/terms-of-service) restrict a
Coding Harness Subscription credential to its subscribed harness (Section 3.2)
and proxy/API-gateway access without written authorization (Section 10.1(i)).
This plugin does not relay Pi subscription credentials to Copilot. A separate
direct Meta Model API key would involve separate billing and data terms; it is
not configured here.

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
