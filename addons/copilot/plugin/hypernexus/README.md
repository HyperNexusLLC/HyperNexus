# HyperNexus for GitHub Copilot CLI

This Agent Plugins v1.0 plugin supplies three HyperNexus skills, eleven `/hn-*`
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
.\addons\copilot\use-meta-model.ps1 -p "Reply exactly META-COPILOT-OK" --silent
```

The launcher uses Copilot CLI's documented BYOK environment provider and its
`COPILOT_PROVIDER_API_KEY_COMMAND` callback. The callback reuses
`addons/droid/bin/meta-muse-key.mjs`, which reads the Pi Meta OAuth identity
token and mints a short-lived Meta Model API key for each request. The key is
never written to a file or printed by the launcher. If Pi's identity expires,
sign in again with `/login meta` in Pi.

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
