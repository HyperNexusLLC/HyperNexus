export const meta = {
  name: "hypernexus-handoff",
  description: "Package session context for handoff to another agent or future session",
  whenToUse: "when ending a session or delegating work to another agent",
  phases: [
    { title: "Collect State" },
    { title: "Package Context" },
    { title: "Persist Handoff" },
  ],
}

export default async function () {
  const target = args?.target || "future session"
  const task = args?.task || "continue current work"
  log(`Preparing handoff to: ${target}`)

  // Phase 1: Collect current session state
  phase("Collect State")
  const sessionState = await agent(
    `Collect the current session state for handoff. Summarize:
1. What was accomplished (key decisions, changes made)
2. What files were modified/created
3. Current state (tests passing, known issues)
4. What remains to be done
Be specific and concise.`,
    { label: "collect-state", timeoutMs: 30000 }
  )
  log(`Session state collected`)

  // Phase 2: Package with relevant memory context
  phase("Package Context")
  const memoryContext = await agent(
    `Search HyperNexus L2 memory for context relevant to the work being handed off.
Use hypernexus_memory_search to find related decisions, patterns, and prior work.
Summarize the most relevant findings.`,
    { agentType: "explore", label: "memory-context", timeoutMs: 25000 }
  )

  const handoffPackage = await agent(
    `Create a handoff package for ${target} to: "${task}"

## Session State
${sessionState || "No session state collected."}

## Relevant Memory Context
${memoryContext || "No prior memory context."}

Produce a structured handoff document with:
1. Context & Goal — what and why
2. What's Done — accomplishments with file references
3. What's Next — prioritized remaining work
4. Gotchas — things to watch out for
5. Key Decisions — architectural/design choices made`,
    { label: "package", timeoutMs: 30000 }
  )

  // Phase 3: Persist handoff to memory
  phase("Persist Handoff")
  await agent(
    `Store the handoff package in HyperNexus L2 memory using hypernexus_memory_store:
- Title: "handoff: ${task.slice(0, 50)}"
- Content: the full handoff document
- Tags: ["handoff", "session"]
Also use hypernexus_context_harvest to capture the current context state.`,
    { agentType: "explore", label: "persist-handoff", timeoutMs: 20000 }
  )

  return handoffPackage || "Handoff package created."
}
