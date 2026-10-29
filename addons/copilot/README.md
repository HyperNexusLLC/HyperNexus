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

Launch Copilot against Meta's model with a compatible API credential:

```powershell
.\addons\copilot\use-meta-model.ps1
```

The launcher sets Copilot CLI's documented BYOK Responses API variables only
for that process. Meta OAuth keys minted from Pi's `auth.json` are restricted
to Muse Code requests and are rejected for Copilot's built-in tool declarations
(HTTP 403). Meta directs other clients to use a pay-as-you-go API key. To use
Copilot BYOK, set `COPILOT_PROVIDER_API_KEY` to that key before launching; the
launcher does not reuse Pi's OAuth subscription or persist credentials. A
supported `COPILOT_PROVIDER_BEARER_TOKEN` can also be used.

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

The Meta OAuth subscription cannot currently power Copilot CLI's native agent
tool loop. Do not impersonate Muse Code or forge its built-in tool declarations;
use Muse Code itself for that subscription, or use a Meta pay-as-you-go key
with Copilot.
