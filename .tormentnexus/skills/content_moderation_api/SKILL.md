---
name: content-moderation-api
description: Content moderation API integration using OpenAI Moderation, Perspective API, and others
source: ~\.a5c\process-library\babysitter-repo\library\specializations\ai-agents-conversational\skills\content-moderation-api\SKILL.md
category: process-library
date: 2026-06-14T07:33:24.834451

---



# Content Moderation API Skill

## Capabilities

- Integrate OpenAI Moderation API
- Set up Perspective API for toxicity detection
- Configure moderation thresholds
- Implement content filtering pipelines
- Design moderation response handling
- Create moderation logging and reporting

## Target Processes

- content-moderation-safety
- system-prompt-guardrails

## Implementation Details

### Moderation APIs

1. **OpenAI Moderation**: Hate, violence, self-harm, sexual content
2. **Perspective API**: Toxicity, insult, profanity, threat
3. **Azure Content Safety**: Text and image moderation
4. **LlamaGuard**: Open-source safety classifier

### Configuration Options

- API credentials and endpoints
- Category thresholds
- Action policies (block, warn, flag)
- Logging configuration
- Fallback behavior

### Best Practices

- Set appropriate thresholds
- Handle edge cases gracefully
- Log moderation decisions
- Regular threshold review
- Multi-layer moderation

### Dependencies

- openai
- google-cloud-language (Perspective)
- azure-ai-contentsafety
