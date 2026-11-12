# GitHub Copilot CLI integration

The `plugin/hypernexus/` directory is an Agent Plugins v1.0 package for Copilot
CLI. It bundles HyperNexus skills, slash commands, custom agents, and a complete
stdio MCP server. The project hooks under `.github/hooks/` use Copilot's native
hook event API for startup health context, explicit `@memory:` recall, RBAC,
tool-failure guidance, and subagent context.

Install or refresh the local plugin:

```powershell
node addons/copilot/install.mjs
```

Launch Copilot with the HyperNexus plugin and MCP parity tools:

```powershell
.\addons\copilot\use-hypernexus.ps1
```

This launcher uses Copilot's own configured account/model, loads the local
HyperNexus plugin, and excludes native `bash` and `powershell` tools from the
model-visible tool list. Use HyperNexus MCP parity tools (for example
`hypernexus-bash`, `hypernexus-read`, `hypernexus-write`, `hypernexus-edit`,
`hypernexus-grep`, and `hypernexus-find`) for shell and file operations instead.
This filter applies only through `use-hypernexus.ps1`; starting `copilot`
directly does not change its normal native tool list.

`use-meta-model.ps1` is intentionally disabled. Meta's official
[Model API Terms](https://dev.meta.ai/legal/terms-of-service) limit a Coding
Harness Subscription credential to its subscribed harness (Section 3.2) and
restrict proxy/API-gateway access without written authorization (Section
10.1(i)). The Pi subscription credential must not be relayed into Copilot.
A separate direct Meta Model API key would use separate pay-as-you-go billing
and data terms; this integration does not configure it.

```powershell
node addons/copilot/install.mjs --check
node addons/copilot/bin/test-copilot-ext.mjs
copilot plugin list
copilot mcp list
copilot skill list
```

Copilot CLI has no Pi-style in-process `ExtensionAPI`; plugins, MCP, skills,
commands, agents, rules, hooks, and LSP servers are its supported extension
surfaces. The integration uses the surfaces applicable to HyperNexus.

An earlier Pi-subscription proxy attempt received a generic Copilot HTTP 403.
That response did not include enough upstream detail to establish its cause.
The plugin/MCP integration remains independent of Meta model access.
