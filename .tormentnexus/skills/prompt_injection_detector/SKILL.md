---
name: prompt-injection-detector
description: Prompt injection detection and prevention for secure LLM applications
source: ~\.a5c\process-library\babysitter-repo\library\specializations\ai-agents-conversational\skills\prompt-injection-detector\SKILL.md
category: process-library
date: 2026-06-14T07:33:24.966548

---



# Prompt Injection Detector Skill

## Capabilities

- Detect prompt injection attempts
- Implement input sanitization
- Configure detection classifiers
- Design defense layers
- Implement canary token detection
- Create injection logging and alerting

## Target Processes

- prompt-injection-defense
- tool-safety-validation

## Implementation Details

### Detection Methods

1. **Pattern Matching**: Known injection patterns
2. **ML Classifiers**: Trained injection detectors
3. **Canary Tokens**: Detect instruction override
4. **LLM-Based**: Use LLM to detect manipulation
5. **Perplexity Analysis**: Unusual input patterns

### Defense Strategies

- Input preprocessing
- Prompt structure design
- Output validation
- Sandboxed execution
- Multi-layer defense

### Configuration Options

- Detection threshold
- Pattern rules
- Classifier model
- Action policies
- Alerting settings

### Best Practices

- Defense in depth
- Regular pattern updates
- Monitor false positives
- Test with red-team inputs

### Dependencies

- rebuff (optional)
- transformers
- Custom classifiers
