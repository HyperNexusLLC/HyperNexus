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

Launch Copilot against Meta's model using the HyperNexus kernel proxy:

```powershell
.\addons\copilot\use-meta-model.ps1
```

The launcher sets Copilot CLI's documented BYOK Responses API variables while
it runs and restores the previous environment afterward. Requests go to
`http://127.0.0.1:7778/v1`; the kernel reads the current Meta credential from
Pi's `auth.json` per request, so the real OAuth-derived credential is never
copied into Copilot configuration. The placeholder API key is local to the
Copilot process and is not sent upstream as the Meta credential. The kernel
proxy currently identifies its upstream client as `pi/1.4.0`; its normal
API error is returned to Copilot if the kernel is unavailable.

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

Direct requests from Copilot to Meta's endpoint were rejected when they carried
Copilot's function-tool declarations. The project's kernel proxy successfully
completed the same Copilot Responses request using the Pi OAuth identity. This
is a proxy-backed provider, not a built-in Copilot Meta OAuth provider; the
kernel remains responsible for OAuth credential retrieval and upstream
request headers.
