---
name: langfuse-integration
description: LangFuse LLM observability integration for tracing, analytics, and cost tracking
source: ~\.a5c\process-library\babysitter-repo\library\specializations\ai-agents-conversational\skills\langfuse-integration\SKILL.md
category: process-library
date: 2026-06-14T07:33:24.891468

---



# LangFuse Integration Skill

## Capabilities

- Set up LangFuse tracing for LLM calls
- Configure cost tracking and analytics
- Implement prompt management
- Set up evaluation datasets
- Design custom trace metadata
- Create dashboards and alerts

## Target Processes

- llm-observability-monitoring
- cost-optimization-llm

## Implementation Details

### Core Features

1. **Tracing**: Track LLM calls, chains, and agents
2. **Prompts**: Version and manage prompts
3. **Analytics**: Usage, latency, cost metrics
4. **Datasets**: Evaluation and testing data
5. **Scores**: Track output quality

### Integration Methods

- LangChain callback handler
- Direct SDK integration
- OpenAI drop-in replacement
- Decorator-based tracing

### Configuration Options

- Public/secret keys
- Host URL (cloud or self-hosted)
- Sampling rate
- Metadata configuration
- User tracking

### Best Practices

- Consistent trace naming
- Meaningful metadata
- Regular prompt versioning
- Set up alerting

### Dependencies

- langfuse
- langchain (for callback integration)
