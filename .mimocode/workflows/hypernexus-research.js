export const meta = {
  name: "hypernexus-research",
  description: "Deep research with HyperNexus memory recall and multi-source synthesis",
  whenToUse: "when researching a topic that benefits from prior session knowledge and codebase context",
  phases: [
    { title: "Memory Recall" },
    { title: "Parallel Research" },
    { title: "Synthesize" },
    { title: "Persist" },
  ],
}

export default async function () {
  const topic = args?.topic || args?.question || args?.query || "current project"
  const depth = args?.depth || "standard"
  log(`Researching: ${topic} (depth: ${depth})`)

  // Phase 1: Recall prior context from L2 memory
  phase("Memory Recall")
  const priorContext = await agent(
    `Search HyperNexus L2 memory for prior research, decisions, and findings related to: "${topic}".
Use hypernexus_memory_search and hypernexus_session_search.
Summarize key findings, prior decisions, and relevant constraints.`,
    { agentType: "explore", label: "memory-recall", timeoutMs: 30000 }
  )
  log(`Prior context: ${priorContext ? "found" : "none"}`)

  // Phase 2: Parallel research from multiple angles
  phase("Parallel Research")
  const angles = depth === "deep"
    ? ["technical implementation", "best practices and patterns", "known issues and gotchas", "performance considerations"]
    : ["technical implementation", "best practices and patterns"]
  
  const researchResults = await parallel(
    angles.map((angle) => () =>
      agent(
        `Research the ${angle} aspect of: "${topic}".
Consider prior context: ${priorContext || "none available"}.
Provide concrete findings with evidence.`,
        { agentType: "explore", label: `research-${angle.slice(0, 20)}`, timeoutMs: 45000 }
      )
    )
  )
  const found = researchResults.filter(Boolean)
  log(`Research: ${found.length}/${angles.length} angles completed`)

  // Phase 3: Synthesize into a coherent brief
  phase("Synthesize")
  const brief = await agent(
    `Synthesize the following research into a concise, actionable brief on: "${topic}"

## Prior Context
${priorContext || "No prior context."}

## Research Findings
${found.map((r, i) => `### ${angles[i]}\n${r}`).join("\n\n")}

Produce:
1. Executive summary (3-5 bullets)
2. Key findings (with confidence level)
3. Recommendations
4. Open questions / risks`,
    { label: "synthesize", timeoutMs: 30000 }
  )

  // Phase 4: Persist findings to L2 memory
  phase("Persist")
  await agent(
    `Store the research findings in HyperNexus L2 memory using hypernexus_memory_store:
- Title: "research: ${topic.slice(0, 50)}"
- Content: the executive summary and key findings
- Tags: ["research", "knowledge"]
This ensures future sessions can recall this research.`,
    { agentType: "explore", label: "persist", timeoutMs: 20000 }
  )

  return brief || "Research completed."
}
