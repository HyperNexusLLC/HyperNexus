---
name: langchain-chains
description: LangChain chain composition including SequentialChain, RouterChain, and LCEL patterns
source: ~\.a5c\process-library\babysitter-repo\library\specializations\ai-agents-conversational\skills\langchain-chains\SKILL.md
category: process-library
date: 2026-06-14T07:33:24.870945

---



# LangChain Chains Skill

## Capabilities

- Compose LangChain chains using LCEL (LangChain Expression Language)
- Implement sequential chain patterns
- Design router chains for conditional logic
- Create parallel execution chains
- Handle chain fallbacks and retries
- Implement streaming chains

## Target Processes

- dialogue-flow-design
- chatbot-design-implementation

## Implementation Details

### Chain Patterns

1. **LCEL Pipelines**: Modern composition with | operator
2. **SequentialChain**: Linear chain execution (legacy)
3. **RouterChain**: Conditional routing based on input
4. **RunnableParallel**: Parallel execution branches
5. **RunnableBranch**: Conditional branching

### Configuration Options

- Input/output key mapping
- Error handling strategies
- Retry configuration
- Streaming settings
- Batch processing options

### Best Practices

- Use LCEL for new implementations
- Implement proper input/output schemas
- Add fallback chains for resilience
- Use streaming for long operations

### Dependencies

- langchain-core
- langchain
