export const meta = {
  name: "hypernexus-audit",
  description: "Audit HyperNexus plugin/extension surface: tools, hooks, MCP servers, kernel health, and test coverage",
  whenToUse: "when verifying that all HyperNexus integration surfaces are healthy and complete",
  phases: [
    { title: "Surface Inventory" },
    { title: "Health Checks" },
    { title: "Gap Analysis" },
    { title: "Report" },
  ],
}

export default async function () {
  log("Starting HyperNexus surface audit")

  // Phase 1: Enumerate all registered surfaces
  phase("Surface Inventory")
  const inventory = await agent(
    `Enumerate the full HyperNexus plugin surface. Check:
1. MiMoCode plugin tools: import addons/mimo/plugin/hypernexus/index.js and list all tool keys under s.tool
2. MiMoCode plugin hooks: list all hook keys from the same module
3. TUI commands: check addons/mimo/plugin/hypernexus-tui/tui.js for registered commands
4. Pi extension tools: grep addons/pi/hypernexus.ts for tool registrations
5. MCP servers: curl http://127.0.0.1:7778/api/mcp/servers
6. Workflows: list .mimocode/workflows/
7. Manifest capabilities: count entries in addons/shared/hypernexus.manifest.json

Report each surface count and any missing expected tools.`,
    { agentType: "explore", label: "surface-inventory", timeoutMs: 45000 }
  )
  log(`Inventory: ${inventory ? "completed" : "failed"}`)

  // Phase 2: Health-check each subsystem
  phase("Health Checks")
  const health = await agent(
    `Run health checks on all HyperNexus subsystems:
1. Kernel: curl http://127.0.0.1:7778/health — check ok:true and version
2. Memory FTS: curl http://127.0.0.1:7778/api/memory/fts-search?q=test&limit=1
3. Memory stats: curl http://127.0.0.1:7778/api/memory/stats
4. MCP status: curl http://127.0.0.1:7778/api/mcp/status
5. Tool search: curl http://127.0.0.1:7778/api/mcp/native/search?query=test

Report pass/fail for each with response time.`,
    { agentType: "explore", label: "health-checks", timeoutMs: 45000 }
  )
  log(`Health: ${health ? "completed" : "failed"}`)

  // Phase 3: Gap analysis — compare manifest to actual
  phase("Gap Analysis")
  const gaps = await agent(
    `Compare the manifest capabilities (addons/shared/hypernexus.manifest.json) to the actual registered tools in the MiMoCode plugin (addons/mimo/plugin/hypernexus/index.js).
For each manifest capability, verify a matching tool exists with the mimo binding name.
For each registered tool not in the manifest, flag it as unlisted.
Also check Pi extension (addons/pi/hypernexus.ts) tool count vs MiMoCode — report any asymmetries.`,
    { agentType: "explore", label: "gap-analysis", timeoutMs: 45000 }
  )
  log(`Gaps: ${gaps ? "completed" : "failed"}`)

  // Phase 4: Consolidate report
  phase("Report")
  const report = await agent(
    `Consolidate the following audit results into a structured report:

## Surface Inventory
${inventory || "No inventory data."}

## Health Checks
${health || "No health data."}

## Gap Analysis
${gaps || "No gap data."}

Produce:
1. Summary table (surface / count / status)
2. Any failures or gaps requiring attention
3. Recommendations for improvement
4. Overall health: GREEN / YELLOW / RED`,
    { label: "audit-report", timeoutMs: 30000 }
  )

  return report || "Audit completed with no consolidated report."
}
