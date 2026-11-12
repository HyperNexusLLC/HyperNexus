export const meta = {
  name: "hypernexus-context",
  description: "Gather cross-session context from HyperNexus L2 memory and codebase for a task",
  whenToUse: "when starting a complex task that benefits from prior session knowledge",
  phases: [
    { title: "Memory Recall" },
    { title: "Codebase Scan" },
    { title: "Consolidate" },
  ],
}

export default async function () {
  const task = args?.task || args?.query || "current project state"
  log(`Gathering HyperNexus context for: ${task}`)

  // Phase 1: Search L2 memory for relevant prior context
  phase("Memory Recall")
  const memoryResult = await agent(
    `Search HyperNexus L2 memory for context relevant to: "${task}".
Use hypernexus_memory_search and hypernexus_session_search to find prior decisions, patterns, and work.
Summarize the top findings in 5-10 bullet points. Include memory IDs when relevant.`,
    { agentType: "explore", label: "memory-recall", timeoutMs: 30000 }
  )
  log(`Memory recall: ${memoryResult ? "found context" : "no prior context"}`)

  // Phase 2: Scan codebase for related files and symbols
  phase("Codebase Scan")
  const codeResult = await agent(
    `Scan the codebase for files and symbols related to: "${task}".
Use glob, grep, and read tools to identify the most relevant source files.
List the top 5-10 files with a one-line description of each.`,
    { agentType: "explore", label: "codebase-scan", timeoutMs: 30000 }
  )
  log(`Codebase scan: ${codeResult ? "found related files" : "no matches"}`)

  // Phase 3: Consolidate into a single context brief
  phase("Consolidate")
  const brief = await agent(
    `Consolidate the following into a concise context brief for the task: "${task}"

## Prior Session Context
${memoryResult || "No prior session context found."}

## Related Codebase Files
${codeResult || "No related files identified."}

Produce a structured brief with:
1. Key prior decisions/constraints (from memory)
2. Relevant files and their roles
3. Recommended starting point
4. Risks or gotchas to watch for`,
    { label: "consolidate", timeoutMs: 30000 }
  )

  return brief || "Context gathering completed with no consolidated output."
}
